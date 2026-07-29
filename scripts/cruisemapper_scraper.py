#!/usr/bin/env python3
"""
Extracteur d'itineraires CruiseMapper - v2, calibree sur la structure reelle.

Le site est rendu cote serveur: aucun navigateur headless requis.

Deux tableaux distincts par fiche navire, a ne pas confondre:
  A. "Current itinerary"  -> escales avec heures, croisiere EN COURS uniquement
  B. "<navire> Itineraries" -> ~85 departs futurs, SANS detail par port

Usage:
    python cruisemapper_scraper.py discover --out ships.txt [--pages N]
    python cruisemapper_scraper.py scrape --ships ships.txt --out data/
    python cruisemapper_scraper.py --no-robots scrape --ships ships.txt --out data/ --sync-db
    python cruisemapper_scraper.py finder --url <CRUISE_SEARCH_URL> --out data/finder_results.csv [--ships-out ships.txt]
    python cruisemapper_scraper.py inspect --url <URL>
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import random
import re
import subprocess
import sys
import time
import unicodedata
from dataclasses import dataclass, field, asdict
from datetime import date, datetime, timedelta
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

BASE = "https://www.cruisemapper.com"
SHIPS_INDEX = f"{BASE}/ships"

DEFAULT_DELAY = 2.5
DEFAULT_JITTER = 1.0
MAX_RETRIES = 4
TIMEOUT = 30
USER_AGENT = (
    "Mozilla/5.0 (compatible; ItineraryIndexer/2.0; "
    "contact: change-me@example.com)"
)

# Les tableaux sont identifies par la signature de leur ligne d'en-tete,
# pas par une classe CSS. C'est nettement plus robuste: les classes changent
# au moindre reskin, les en-tetes sont du contenu editorial stable.
HDR_CURRENT = {"date / time", "port"}
HDR_SCHEDULE = {"date", "itinerary", "departure port"}

MONTHS = {m.lower(): i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], start=1)}

log = logging.getLogger("cmscraper")


# --------------------------------------------------------------------------
# MODELE
# --------------------------------------------------------------------------

@dataclass
class PortCall:
    day: int
    date: str | None
    port_name: str
    port_id: str | None          # ID CruiseMapper, cle pivot preferee
    port_key: str                # repli normalise si pas d'ID
    arrival: str | None = None
    departure: str | None = None
    is_sea_day: bool = False
    is_embark: bool = False
    is_debark: bool = False
    is_overnight: bool = False


@dataclass
class DetailedItinerary:
    """Croisiere en cours: le seul endroit avec des heures par port."""
    ship_name: str
    ship_id: str
    cruise_line: str | None
    title: str | None
    start_date: str | None
    end_date: str | None
    source_url: str
    port_calls: list[PortCall] = field(default_factory=list)
    scraped_at: str = ""


@dataclass
class ScheduledSailing:
    """Depart futur: date, titre, port. Pas d'escales, pas d'heures."""
    ship_name: str
    ship_id: str
    cruise_line: str | None
    departure_date: str | None
    title: str
    nights: int | None
    departure_port: str | None
    price_from: str | None
    source_url: str
    row_id: str | None = None


@dataclass
class FinderCruiseResult:
    """Resultat du Cruise Finder (liste des departs correspondant aux filtres)."""
    departure_date: str | None
    ship_name: str
    ship_id: str | None
    ship_url: str | None
    itinerary: str
    departure_port: str | None
    price_from: str | None
    source_url: str


# --------------------------------------------------------------------------
# CLIENT HTTP
# --------------------------------------------------------------------------

class Client:
    def __init__(self, cache_dir: Path, delay: float = DEFAULT_DELAY,
                 jitter: float = DEFAULT_JITTER, respect_robots: bool = True):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.delay, self.jitter = delay, jitter
        self._last = 0.0
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": USER_AGENT,
            "Accept-Language": "fr-CA,fr;q=0.9,en;q=0.8",
        })
        self.robots = self._robots() if respect_robots else None
        self.stats = {"cache": 0, "net": 0, "err": 0}

    def _robots(self):
        rp = RobotFileParser()
        rp.set_url(urljoin(BASE, "/robots.txt"))
        try:
            rp.read()
            return rp
        except Exception as exc:
            log.warning("robots.txt illisible (%s)", exc)
            return None

    def _path(self, url: str) -> Path:
        h = hashlib.sha256(url.encode()).hexdigest()[:24]
        slug = re.sub(r"[^a-z0-9]+", "-", urlparse(url).path.lower()).strip("-")
        return self.cache_dir / f"{slug[:60]}-{h}.html"

    def get(self, url: str, force: bool = False) -> str | None:
        path = self._path(url)
        if path.exists() and not force:
            self.stats["cache"] += 1
            return path.read_text(encoding="utf-8", errors="replace")
        if self.robots and not self.robots.can_fetch(USER_AGENT, url):
            log.warning("robots.txt interdit: %s", url)
            return None

        for attempt in range(1, MAX_RETRIES + 1):
            wait = self.delay + random.uniform(0, self.jitter)
            slept = time.monotonic() - self._last
            if slept < wait:
                time.sleep(wait - slept)
            self._last = time.monotonic()
            try:
                r = self.session.get(url, timeout=TIMEOUT)
            except requests.RequestException as exc:
                log.warning("reseau %s (essai %d): %s", url, attempt, exc)
                time.sleep(min(60, 3 ** attempt))
                continue
            if r.status_code == 200:
                self.stats["net"] += 1
                path.write_text(r.text, encoding="utf-8")
                return r.text
            if r.status_code in (429, 503):
                ra = r.headers.get("Retry-After", "")
                pause = int(ra) if ra.isdigit() else min(120, 5 ** attempt)
                log.warning("HTTP %d - pause %ds", r.status_code, pause)
                time.sleep(pause)
                continue
            if r.status_code in (403, 404, 410):
                self.stats["err"] += 1
                return None
            time.sleep(min(60, 3 ** attempt))
        self.stats["err"] += 1
        return None

    def get_json(self, url: str, params: dict | None = None,
                 headers: dict | None = None):
        for attempt in range(1, MAX_RETRIES + 1):
            wait = self.delay + random.uniform(0, self.jitter)
            slept = time.monotonic() - self._last
            if slept < wait:
                time.sleep(wait - slept)
            self._last = time.monotonic()
            try:
                r = self.session.get(url, params=params, headers=headers,
                                     timeout=TIMEOUT)
            except requests.RequestException as exc:
                log.warning("reseau json %s (essai %d): %s", url, attempt, exc)
                time.sleep(min(60, 3 ** attempt))
                continue
            if r.status_code == 200:
                self.stats["net"] += 1
                try:
                    return r.json()
                except ValueError:
                    self.stats["err"] += 1
                    return None
            if r.status_code in (429, 503):
                ra = r.headers.get("Retry-After", "")
                pause = int(ra) if ra.isdigit() else min(120, 5 ** attempt)
                log.warning("HTTP %d (json) - pause %ds", r.status_code, pause)
                time.sleep(pause)
                continue
            if r.status_code in (403, 404, 410):
                self.stats["err"] += 1
                return None
            time.sleep(min(60, 3 ** attempt))
        self.stats["err"] += 1
        return None


# --------------------------------------------------------------------------
# NORMALISATION
# --------------------------------------------------------------------------

def port_key(name: str) -> str:
    txt = unicodedata.normalize("NFKD", name)
    txt = "".join(c for c in txt if not unicodedata.combining(c)).lower()
    txt = re.sub(r"[^a-z0-9]+", " ", txt)
    stop = {"port", "of", "de", "la", "le", "island", "the"}
    return "-".join(sorted({t for t in txt.split() if t not in stop}))


def norm_text(txt: str | None) -> str:
    return re.sub(r"\s+", " ", (txt or "").strip()).lower()


def clean(el) -> str:
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)) if el else ""


def parse_datetime_cell(raw: str) -> tuple[int, int, int | None, str | None, str | None]:
    """Decompose une cellule 'Date / Time' de CruiseMapper.

    Formats rencontres:
        '18 Jul 15:30'          -> depart d'un port
        '20 Jul 09:00 - 17:00'  -> arrivee et depart
        '25 Jul 08:00'          -> arrivee finale
        '06-13 Nov'             -> plage de jours en mer
        '29 Dec'                -> journee sans horaire

    Retourne (jour_debut, mois, jour_fin, heure1, heure2).
    L'annee est absente des cellules: elle est deduite ailleurs.
    """
    txt = raw.strip().replace("\xa0", " ")
    times = re.findall(r"\b(\d{1,2}):(\d{2})\b", txt)
    t1 = f"{int(times[0][0]):02d}:{times[0][1]}" if len(times) >= 1 else None
    t2 = f"{int(times[1][0]):02d}:{times[1][1]}" if len(times) >= 2 else None

    head = txt.split(":")[0] if ":" in txt else txt
    rng = re.search(r"\b(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([A-Za-z]{3})", head)
    if rng:
        mon = MONTHS.get(rng.group(3).lower()[:3])
        return int(rng.group(1)), mon or 0, int(rng.group(2)), t1, t2

    one = re.search(r"\b(\d{1,2})\s+([A-Za-z]{3})", head)
    if one:
        mon = MONTHS.get(one.group(2).lower()[:3])
        return int(one.group(1)), mon or 0, None, t1, t2
    return 0, 0, None, t1, t2


def assign_years(rows: list[tuple[int, int, int | None]],
                 start_year: int) -> list[int]:
    """Les cellules ne portent pas l'annee. On la deduit du premier depart
    puis on incremente au passage decembre -> janvier."""
    years, year, prev_month = [], start_year, None
    for day, month, _ in rows:
        if prev_month is not None and month and month < prev_month:
            year += 1
        years.append(year)
        if month:
            prev_month = month
    return years


def extract_port_id(cell) -> str | None:
    a = cell.find("a", href=re.compile(r"/ports/"))
    if not a:
        return None
    m = re.search(r"-port-(\d+)", a.get("href", ""))
    return m.group(1) if m else None


# --------------------------------------------------------------------------
# PARSING
# --------------------------------------------------------------------------

def soup_of(html: str) -> BeautifulSoup:
    try:
        return BeautifulSoup(html, "lxml")
    except Exception:
        return BeautifulSoup(html, "html.parser")


def header_signature(table) -> set[str]:
    first = table.find("tr")
    if not first:
        return set()
    return {clean(c).lower() for c in first.find_all(["th", "td"]) if clean(c)}


def find_table(doc, wanted: set[str]):
    """Retrouve un tableau par sa signature d'en-tete plutot que par sa classe."""
    for t in doc.find_all("table"):
        sig = header_signature(t)
        if wanted <= sig:
            return t
    return None


def extract_ship_links(html: str) -> list[str]:
    doc = soup_of(html)
    out = set()
    for a in doc.find_all("a", href=True):
        path = urlparse(urljoin(BASE, a["href"])).path.rstrip("/")
        if re.fullmatch(r"/ships/[A-Za-z0-9\-]+-\d+", path):
            out.add(BASE + path)
    return sorted(out)


def ship_id_of(url: str) -> str:
    m = re.search(r"-(\d+)$", urlparse(url).path.rstrip("/"))
    return m.group(1) if m else urlparse(url).path.rsplit("/", 1)[-1]


def extract_ship_meta(html: str) -> tuple[str | None, str | None]:
    doc = soup_of(html)
    h1 = doc.find("h1")
    name = clean(h1) if h1 else None
    a = doc.find("a", href=re.compile(r"/cruise-lines/"))
    return name, (clean(a) if a else None)


def extract_start_year(html: str) -> tuple[int | None, str | None, str | None]:
    """La phrase d'intro donne les bornes: 'begins on July 18, 2026 and ends on
    July 25, 2026'. C'est de la que vient l'annee absente du tableau."""
    text = re.sub(r"<[^>]+>", " ", html)
    dates = re.findall(r"([A-Z][a-z]+)\s+(\d{1,2}),\s*(\d{4})", text)
    parsed = []
    for mon, day, year in dates[:4]:
        m = MONTHS.get(mon.lower()[:3])
        if m:
            try:
                parsed.append(date(int(year), m, int(day)))
            except ValueError:
                pass
    if not parsed:
        return None, None, None
    start = parsed[0]
    end = parsed[1] if len(parsed) > 1 and parsed[1] >= start else None
    return start.year, start.isoformat(), end.isoformat() if end else None


def parse_current_itinerary(html: str, url: str, name: str,
                            line: str | None) -> DetailedItinerary | None:
    doc = soup_of(html)
    table = find_table(doc, HDR_CURRENT)
    if table is None:
        return None

    year, start_iso, end_iso = extract_start_year(html)
    year = year or date.today().year

    raw_rows = []
    for tr in table.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        if len(cells) < 2:
            continue
        label = clean(cells[0]).lower()
        if label in ("date / time", "date/time", "date"):
            continue
        raw_rows.append((cells[0], cells[1]))
    if not raw_rows:
        return None

    parsed = [parse_datetime_cell(clean(c0)) for c0, _ in raw_rows]
    years = assign_years([(d, m, e) for d, m, e, _, _ in parsed], year)

    calls: list[PortCall] = []
    day_no = 0
    for (c0, c1), (d, mon, dend, t1, t2), yr in zip(raw_rows, parsed, years):
        label = clean(c1)
        low = label.lower()
        sea = low.startswith("at sea") or low == "at sea"
        embark = "departing" in low
        debark = "arriving" in low

        try:
            first = date(yr, mon, d).isoformat() if mon else None
        except ValueError:
            first = None

        # Une plage '06-13 Nov' represente plusieurs journees en mer:
        # on la deplie en une ligne par jour pour garder une numerotation juste.
        span = 1
        if dend and mon and d:
            try:
                span = max(1, (date(yr, mon, dend) - date(yr, mon, d)).days + 1)
            except ValueError:
                span = 1

        clean_name = re.sub(r"^(departing\s+from|arriving\s+in)\s+", "",
                            label, flags=re.I).strip()
        clean_name = re.sub(r"\s*hotels\s*$", "", clean_name, flags=re.I).strip()
        pid = extract_port_id(c1)

        for offset in range(span):
            day_no += 1
            iso = None
            if first:
                iso = (date.fromisoformat(first) + timedelta(days=offset)).isoformat()
            calls.append(PortCall(
                day=day_no, date=iso,
                port_name=clean_name if not sea else "At Sea",
                port_id=None if sea else pid,
                port_key="at-sea" if sea else port_key(clean_name),
                arrival=None if sea else (t1 if (t2 or debark) else None),
                departure=None if sea else (t2 or (t1 if embark else None)),
                is_sea_day=sea, is_embark=embark, is_debark=debark,
            ))

    for i, c in enumerate(calls[:-1]):
        nxt = calls[i + 1]
        if not c.is_sea_day and c.port_key == nxt.port_key:
            c.is_overnight = nxt.is_overnight = True

    title_el = doc.find(string=re.compile(r"current cruise is", re.I))
    title = None
    if title_el:
        m = re.search(r"is\s+а?\s*(.+?)\.", str(title_el), re.I)
        title = m.group(1).strip("* ") if m else None

    return DetailedItinerary(
        ship_name=name, ship_id=ship_id_of(url), cruise_line=line,
        title=title, start_date=start_iso, end_date=end_iso, source_url=url,
        port_calls=calls,
        scraped_at=datetime.now().astimezone().isoformat(timespec="seconds"),
    )


def parse_schedule(html: str, url: str, name: str,
                   line: str | None) -> list[ScheduledSailing]:
    doc = soup_of(html)
    table = find_table(doc, HDR_SCHEDULE)
    if table is None:
        return []
    out = []
    for tr in table.find_all("tr"):
        cells = [clean(c) for c in tr.find_all(["td", "th"])]
        if len(cells) < 3 or cells[0].lower() == "date":
            continue
        row_id = tr.get("data-row")
        m = re.match(r"(\d{4})\s+([A-Za-z]{3})\s+(\d{1,2})", cells[0])
        iso = None
        if m and MONTHS.get(m.group(2).lower()):
            try:
                iso = date(int(m.group(1)), MONTHS[m.group(2).lower()],
                           int(m.group(3))).isoformat()
            except ValueError:
                pass
        nm = re.match(r"(\d+)\s*(?:days?|nights?)", cells[1], re.I)
        out.append(ScheduledSailing(
            ship_name=name, ship_id=ship_id_of(url), cruise_line=line,
            departure_date=iso, title=cells[1],
            nights=int(nm.group(1)) if nm else None,
            departure_port=cells[2] if len(cells) > 2 else None,
            price_from=cells[3] if len(cells) > 3 else None,
            source_url=url,
            row_id=row_id,
        ))
    return out


def parse_finder_results(html: str, url: str) -> list[FinderCruiseResult]:
    """Parse la table de la page /cruise-search.

    Entetes attendus: Date | Ship | Itinerary | From.
    """
    doc = soup_of(html)
    table = find_table(doc, {"date", "ship", "itinerary", "from"})
    if table is None:
        return []

    out: list[FinderCruiseResult] = []
    for tr in table.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        if len(cells) < 4:
            continue

        first = clean(cells[0]).lower()
        if first == "date":
            continue

        raw_date = clean(cells[0])
        iso_date = None
        m = re.match(r"(\d{4})\s+([A-Za-z]{3})\s+(\d{1,2})", raw_date)
        if m and MONTHS.get(m.group(2).lower()):
            try:
                iso_date = date(int(m.group(1)), MONTHS[m.group(2).lower()], int(m.group(3))).isoformat()
            except ValueError:
                pass

        ship_link = cells[1].find("a", href=True)
        ship_url = urljoin(BASE, ship_link["href"]) if ship_link else None
        ship_name = clean(ship_link) if ship_link else clean(cells[1])
        ship_id = ship_id_of(ship_url) if ship_url else None

        out.append(FinderCruiseResult(
            departure_date=iso_date,
            ship_name=ship_name,
            ship_id=ship_id,
            ship_url=ship_url,
            itinerary=clean(cells[2]),
            departure_port=clean(cells[3]) or None,
            price_from=clean(cells[4]) if len(cells) > 4 else None,
            source_url=url,
        ))

    return out


def parse_schedule_row_id(ship_html: str, target: FinderCruiseResult) -> str | None:
    doc = soup_of(ship_html)
    table = find_table(doc, HDR_SCHEDULE)
    if table is None:
        return None

    candidates: list[tuple[int, str]] = []
    for tr in table.find_all("tr"):
        rid = tr.get("data-row")
        if not rid:
            continue
        cells = [clean(c) for c in tr.find_all(["td", "th"])]
        if len(cells) < 3 or cells[0].lower() == "date":
            continue

        row_date = None
        m = re.match(r"(\d{4})\s+([A-Za-z]{3})\s+(\d{1,2})", cells[0])
        if m and MONTHS.get(m.group(2).lower()):
            try:
                row_date = date(int(m.group(1)), MONTHS[m.group(2).lower()], int(m.group(3))).isoformat()
            except ValueError:
                row_date = None

        score = 0
        if row_date and target.departure_date and row_date == target.departure_date:
            score += 3
        if norm_text(cells[1]) == norm_text(target.itinerary):
            score += 3
        if len(cells) > 2 and norm_text(cells[2]) == norm_text(target.departure_port):
            score += 2
        if len(cells) > 3 and norm_text(cells[3]) == norm_text(target.price_from):
            score += 1

        if score > 0:
            candidates.append((score, rid))

    if not candidates:
        return None
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def parse_expanded_cruise_result(result_html: str, target: FinderCruiseResult,
                                 cruise_line: str | None) -> DetailedItinerary | None:
    doc = soup_of(result_html)
    table = find_table(doc, HDR_CURRENT)
    if table is None:
        return None

    start_year = date.fromisoformat(target.departure_date).year if target.departure_date else date.today().year

    raw_rows = []
    for tr in table.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        if len(cells) < 2:
            continue
        label = clean(cells[0]).lower()
        if label in ("date / time", "date/time", "date"):
            continue
        raw_rows.append((cells[0], cells[1]))
    if not raw_rows:
        return None

    parsed = [parse_datetime_cell(clean(c0)) for c0, _ in raw_rows]
    years = assign_years([(d, m, e) for d, m, e, _, _ in parsed], start_year)

    calls: list[PortCall] = []
    day_no = 0
    for (c0, c1), (d, mon, dend, t1, t2), yr in zip(raw_rows, parsed, years):
        label = clean(c1)
        low = label.lower()
        sea = low.startswith("at sea") or low == "at sea"
        embark = "departing" in low
        debark = "arriving" in low

        try:
            first = date(yr, mon, d).isoformat() if mon else None
        except ValueError:
            first = None

        span = 1
        if dend and mon and d:
            try:
                span = max(1, (date(yr, mon, dend) - date(yr, mon, d)).days + 1)
            except ValueError:
                span = 1

        clean_name = re.sub(r"^(departing\s+from|arriving\s+in)\s+", "",
                            label, flags=re.I).strip()
        clean_name = re.sub(r"\s*hotels\s*$", "", clean_name, flags=re.I).strip()
        pid = extract_port_id(c1)

        for offset in range(span):
            day_no += 1
            iso = None
            if first:
                iso = (date.fromisoformat(first) + timedelta(days=offset)).isoformat()
            calls.append(PortCall(
                day=day_no,
                date=iso,
                port_name=clean_name if not sea else "At Sea",
                port_id=None if sea else pid,
                port_key="at-sea" if sea else port_key(clean_name),
                arrival=None if sea else (t1 if (t2 or debark) else None),
                departure=None if sea else (t2 or (t1 if embark else None)),
                is_sea_day=sea,
                is_embark=embark,
                is_debark=debark,
            ))

    for i, c in enumerate(calls[:-1]):
        nxt = calls[i + 1]
        if not c.is_sea_day and c.port_key == nxt.port_key:
            c.is_overnight = nxt.is_overnight = True

    end_date = None
    for c in reversed(calls):
        if c.date:
            end_date = c.date
            break

    return DetailedItinerary(
        ship_name=target.ship_name,
        ship_id=target.ship_id or "",
        cruise_line=cruise_line,
        title=target.itinerary,
        start_date=target.departure_date,
        end_date=end_date,
        source_url=target.ship_url or target.source_url,
        port_calls=calls,
        scraped_at=datetime.now().astimezone().isoformat(timespec="seconds"),
    )


def enrich_finder_details(client: Client, rows: list[FinderCruiseResult]) -> list[DetailedItinerary]:
    out: list[DetailedItinerary] = []
    for idx, row in enumerate(rows, 1):
        if not row.ship_url or not row.departure_date:
            continue
        ship_html = client.get(row.ship_url)
        if not ship_html:
            continue
        _, line = extract_ship_meta(ship_html)
        rid = parse_schedule_row_id(ship_html, row)
        if not rid:
            log.warning("[%d/%d] row id introuvable: %s | %s", idx, len(rows), row.ship_name, row.itinerary)
            continue
        payload = client.get_json(
            urljoin(BASE, "/ships/cruise.json"),
            params={"id": rid},
            headers={
                "X-Requested-With": "XMLHttpRequest",
                "Referer": row.ship_url,
            },
        )
        if not payload or not isinstance(payload, dict) or "result" not in payload:
            continue
        detailed = parse_expanded_cruise_result(payload.get("result", ""), row, line)
        if detailed:
            out.append(detailed)
        log.info("[%d/%d] details %s %s -> %s", idx, len(rows), row.ship_name,
                 row.departure_date, "OK" if detailed else "N/A")
    return out


def expand_scheduled_sailings(client: Client, ship_url: str,
                              ship_name: str,
                              cruise_line: str | None,
                              sailings: list[ScheduledSailing],
                              per_ship_limit: int = 0) -> list[DetailedItinerary]:
    out: list[DetailedItinerary] = []
    subset = sailings[:per_ship_limit] if per_ship_limit > 0 else sailings

    for sailing in subset:
        if not sailing.row_id:
            continue
        payload = client.get_json(
            urljoin(BASE, "/ships/cruise.json"),
            params={"id": sailing.row_id},
            headers={
                "X-Requested-With": "XMLHttpRequest",
                "Referer": ship_url,
            },
        )
        if not payload or not isinstance(payload, dict) or "result" not in payload:
            continue

        target = FinderCruiseResult(
            departure_date=sailing.departure_date,
            ship_name=ship_name,
            ship_id=sailing.ship_id,
            ship_url=ship_url,
            itinerary=sailing.title,
            departure_port=sailing.departure_port,
            price_from=sailing.price_from,
            source_url=ship_url,
        )
        detailed = parse_expanded_cruise_result(payload.get("result", ""), target, cruise_line)
        if detailed:
            out.append(detailed)
    return out


# --------------------------------------------------------------------------
# SORTIES
# --------------------------------------------------------------------------

def write_detailed(items: list[DetailedItinerary], out: Path) -> None:
    (out / "itineraires_detailles.json").write_text(
        json.dumps([asdict(i) for i in items], ensure_ascii=False, indent=2),
        encoding="utf-8")
    cols = ["ship_name", "ship_id", "cruise_line", "title", "start_date", "day",
            "date", "port_name", "port_id", "port_key", "arrival", "departure",
            "is_sea_day", "is_embark", "is_debark", "is_overnight", "source_url"]
    with (out / "escales.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        for it in items:
            for c in it.port_calls:
                w.writerow({"ship_name": it.ship_name, "ship_id": it.ship_id,
                            "cruise_line": it.cruise_line, "title": it.title,
                            "start_date": it.start_date, "source_url": it.source_url,
                            **{k: getattr(c, k) for k in
                               ["day", "date", "port_name", "port_id", "port_key",
                                "arrival", "departure", "is_sea_day", "is_embark",
                                "is_debark", "is_overnight"]}})
    log.info("%d itineraires detailles ecrits", len(items))


def write_schedule(rows: list[ScheduledSailing], out: Path) -> None:
    if not rows:
        return
    with (out / "departs_sans_detail.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(asdict(rows[0]).keys()))
        w.writeheader()
        for r in rows:
            w.writerow(asdict(r))
    log.info("%d departs (sans detail par port) ecrits", len(rows))


def write_ports(items: list[DetailedItinerary], out: Path) -> None:
    seen: dict[str, dict] = {}
    for it in items:
        for c in it.port_calls:
            if c.is_sea_day:
                continue
            k = c.port_id or c.port_key
            e = seen.setdefault(k, {"cle": k, "port_id": c.port_id or "",
                                    "libelles": set(), "unlocode": "", "n": 0})
            e["libelles"].add(c.port_name)
            e["n"] += 1
    with (out / "ports_a_mapper.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["cle", "port_id", "libelles",
                                           "unlocode", "n"])
        w.writeheader()
        for e in sorted(seen.values(), key=lambda x: -x["n"]):
            e["libelles"] = " | ".join(sorted(e["libelles"]))
            w.writerow(e)
    log.info("%d ports distincts", len(seen))


def write_scrape_summary(out: Path, summary: dict) -> None:
    (out / "scrape_resume.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log.info("resume ecrit: %s", out / "scrape_resume.json")


def write_finder_results(rows: list[FinderCruiseResult], out_csv: Path) -> None:
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        out_csv.write_text("", encoding="utf-8")
        log.info("0 resultats finder -> %s", out_csv)
        return
    with out_csv.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(asdict(rows[0]).keys()))
        w.writeheader()
        for r in rows:
            w.writerow(asdict(r))
    log.info("%d resultats finder ecrits -> %s", len(rows), out_csv)


def load_url_set(path: Path | None) -> set[str]:
    if not path or not path.exists():
        return set()
    return {
        line.strip().lstrip("\ufeff")
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines()
        if line.strip().lstrip("\ufeff") and not line.strip().lstrip("\ufeff").startswith("#")
    }


def write_url_set(path: Path, urls: set[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(sorted(urls)) + ("\n" if urls else ""), encoding="utf-8")


def extract_cached_page_url(html: str) -> str | None:
    m = re.search(r'<meta\s+(?:name|property)=["\']og:url["\']\s+content=["\']([^"\']+)["\']', html, re.I)
    if m:
        return m.group(1)
    m = re.search(r'<link\s+href=["\']([^"\']+)["\']\s+rel=["\']canonical["\']', html, re.I)
    return m.group(1) if m else None


# --------------------------------------------------------------------------
# COMMANDES
# --------------------------------------------------------------------------

def cmd_discover(args, client: Client) -> int:
    urls: set[str] = set()
    no_growth_streak = 0
    stop_reason = "max-pages"
    for page in range(1, args.pages + 1):
        url = SHIPS_INDEX if page == 1 else f"{SHIPS_INDEX}?page={page}"
        html = client.get(url, force=args.force)
        if html is None:
            stop_reason = "fetch-failed-or-blocked"
            break
        found = extract_ship_links(html)
        if not found:
            log.warning("page %d: aucun navire", page)
            stop_reason = "no-ships-on-page"
            break
        before = len(urls)
        urls.update(found)
        delta = len(urls) - before
        log.info("page %d: %d navires (+%d)", page, len(found), delta)
        if delta == 0:
            no_growth_streak += 1
            if no_growth_streak >= args.stale_pages:
                stop_reason = f"stale-pages-{args.stale_pages}"
                log.info("arret discover: %d pages consecutives sans nouveaux navires", args.stale_pages)
                break
        else:
            no_growth_streak = 0
    Path(args.out).write_text("\n".join(sorted(urls)) + "\n", encoding="utf-8")
    log.info("%d navires -> %s", len(urls), args.out)
    log.info("discover resume: pages_max=%d stale_pages=%d stop=%s", args.pages, args.stale_pages, stop_reason)
    return 0 if urls else 1


def cmd_scrape(args, client: Client) -> int:
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    empty_ships_path = Path(args.empty_ships_file) if args.empty_ships_file else None
    known_empty_ships = set() if args.ignore_empty_ships_file else load_url_set(empty_ships_path)
    newly_empty_ships: set[str] = set()

    ships = []
    if args.url:
        ships.append(args.url)
    if args.ships:
        ships += [l.strip() for l in Path(args.ships).read_text().splitlines()
                  if l.strip() and not l.startswith("#")]
    if not ships:
        log.error("Fournis --url ou --ships")
        return 2

    started_at = datetime.now().astimezone()
    ships_total = len(ships)
    ships_fetched = 0
    ships_failed = 0
    ships_with_current = 0
    ships_with_schedule = 0
    ships_skipped_known_empty = 0
    ships_marked_empty = 0
    total_port_calls = 0

    detailed: list[DetailedItinerary] = []
    expanded_details: list[DetailedItinerary] = []
    schedule: list[ScheduledSailing] = []
    for n, url in enumerate(ships, 1):
        if url in known_empty_ships:
            ships_skipped_known_empty += 1
            log.info("[%d/%d] skip connu sans itineraire: %s", n, len(ships), url)
            continue

        html = client.get(url)
        if html is None:
            ships_failed += 1
            continue
        ships_fetched += 1
        name, line = extract_ship_meta(html)
        name = name or ship_id_of(url)
        cur = parse_current_itinerary(html, url, name, line)
        sch = parse_schedule(html, url, name, line)
        if cur:
            detailed.append(cur)
            ships_with_current += 1
            total_port_calls += len(cur.port_calls)
        schedule.extend(sch)
        if sch:
            ships_with_schedule += 1

        if not cur and not sch:
            newly_empty_ships.add(url)
            ships_marked_empty += 1
            if empty_ships_path:
                write_url_set(empty_ships_path, known_empty_ships | newly_empty_ships)

        if args.expand_schedule_details and sch:
            expanded = expand_scheduled_sailings(
                client,
                ship_url=url,
                ship_name=name,
                cruise_line=line,
                sailings=sch,
                per_ship_limit=args.expand_limit_per_ship,
            )
            expanded_details.extend(expanded)

        log.info("[%d/%d] %-32s escales=%-3s departs=%d", n, len(ships),
                 name[:32], len(cur.port_calls) if cur else 0, len(sch))
        if n % 25 == 0:
            write_detailed(detailed, out)
            write_schedule(schedule, out)
            if empty_ships_path and newly_empty_ships:
                write_url_set(empty_ships_path, known_empty_ships | newly_empty_ships)

    all_detailed = detailed + expanded_details
    write_detailed(all_detailed, out)
    write_schedule(schedule, out)
    write_ports(all_detailed, out)
    if empty_ships_path:
        write_url_set(empty_ships_path, known_empty_ships | newly_empty_ships)

    sync_exit_code = None
    if args.sync_db:
        input_json = str(out / "itineraires_detailles.json")
        cmd = ["node", args.sync_script, input_json]
        log.info("sync db: %s", " ".join(cmd))
        proc = subprocess.run(cmd, text=True)
        sync_exit_code = proc.returncode
        if proc.returncode != 0:
            log.error("Echec de sync DB (code=%d)", proc.returncode)
            summary = {
                "started_at": started_at.isoformat(timespec="seconds"),
                "finished_at": datetime.now().astimezone().isoformat(timespec="seconds"),
                "ships_total": ships_total,
                "ships_fetched": ships_fetched,
                "ships_failed": ships_failed,
                "ships_skipped_known_empty": ships_skipped_known_empty,
                "ships_marked_empty": ships_marked_empty,
                "ships_with_current_itinerary": ships_with_current,
                "ships_with_schedule": ships_with_schedule,
                "detailed_itineraries": len(all_detailed),
                "expanded_scheduled_itineraries": len(expanded_details),
                "scheduled_sailings": len(schedule),
                "total_port_calls": total_port_calls,
                "sync_db_enabled": True,
                "sync_db_exit_code": sync_exit_code,
                "stop": "sync-db-failed",
                "http_stats": client.stats,
            }
            write_scrape_summary(out, summary)
            return proc.returncode

    summary = {
        "started_at": started_at.isoformat(timespec="seconds"),
        "finished_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "ships_total": ships_total,
        "ships_fetched": ships_fetched,
        "ships_failed": ships_failed,
        "ships_skipped_known_empty": ships_skipped_known_empty,
        "ships_marked_empty": ships_marked_empty,
        "empty_ships_file": str(empty_ships_path) if empty_ships_path else None,
        "ships_with_current_itinerary": ships_with_current,
        "ships_with_schedule": ships_with_schedule,
        "detailed_itineraries": len(all_detailed),
        "expanded_scheduled_itineraries": len(expanded_details),
        "scheduled_sailings": len(schedule),
        "total_port_calls": total_port_calls,
        "sync_db_enabled": bool(args.sync_db),
        "sync_db_exit_code": sync_exit_code,
        "stop": "completed",
        "http_stats": client.stats,
    }
    write_scrape_summary(out, summary)

    log.info(
        "scrape resume: ships=%d fetched=%d skipped_empty=%d marked_empty=%d failed=%d current=%d schedule=%d port_calls=%d",
        ships_total,
        ships_fetched,
        ships_skipped_known_empty,
        ships_marked_empty,
        ships_failed,
        ships_with_current,
        ships_with_schedule,
        total_port_calls,
    )

    log.info("cache=%(cache)d reseau=%(net)d erreurs=%(err)d", client.stats)
    return 0 if (all_detailed or schedule) else 1


def cmd_inspect(args, client: Client) -> int:
    html = client.get(args.url, force=args.force)
    if html is None:
        return 1
    Path(args.out or "inspect.html").write_text(html, encoding="utf-8")
    doc = soup_of(html)
    print(f"\n=== {args.url}\nh1: {clean(doc.find('h1'))}\n")
    for i, t in enumerate(doc.find_all("table")):
        sig = header_signature(t)
        role = ("<<< CURRENT ITINERARY" if HDR_CURRENT <= sig else
                "<<< SCHEDULE" if HDR_SCHEDULE <= sig else "")
        print(f"[{i}] lignes={len(t.find_all('tr')):3d} entete={sorted(sig)} {role}")
        for r in t.find_all("tr")[1:3]:
            print(f"     {[clean(c) for c in r.find_all(['td','th'])]}")
    return 0


def cmd_finder(args, client: Client) -> int:
    html = client.get(args.url, force=args.force)
    if html is None:
        return 1

    rows = parse_finder_results(html, args.url)
    out_csv = Path(args.out)
    write_finder_results(rows, out_csv)

    if args.ships_out:
        ships = sorted({r.ship_url for r in rows if r.ship_url})
        Path(args.ships_out).write_text("\n".join(ships) + ("\n" if ships else ""), encoding="utf-8")
        log.info("%d navires uniques -> %s", len(ships), args.ships_out)

    if args.expand_details:
        details = enrich_finder_details(client, rows)
        details_dir = Path(args.details_out_dir)
        details_dir.mkdir(parents=True, exist_ok=True)
        write_detailed(details, details_dir)
        write_ports(details, details_dir)
        if args.sync_db:
            input_json = str(details_dir / "itineraires_detailles.json")
            cmd = ["node", args.sync_script, input_json]
            log.info("sync db (finder details): %s", " ".join(cmd))
            proc = subprocess.run(cmd, text=True)
            if proc.returncode != 0:
                return proc.returncode
        log.info("finder details: %d/%d enrichis", len(details), len(rows))

    return 0 if rows else 1


def cmd_mark_empty_from_cache(args, client: Client) -> int:
    cache_dir = Path(args.cache_dir or args.cache)
    empty: set[str] = set()
    with_data: set[str] = set()
    ship_pages = 0
    skipped_non_ship_pages = 0
    unknown_pages = 0

    for path in cache_dir.glob("*.html"):
        html = path.read_text(encoding="utf-8", errors="replace")
        url = extract_cached_page_url(html)
        if not url:
            unknown_pages += 1
            continue
        if not re.search(r"/ships/[A-Za-z0-9\-]+-\d+/?$", url):
            skipped_non_ship_pages += 1
            continue

        ship_pages += 1
        name, line = extract_ship_meta(html)
        name = name or ship_id_of(url)
        cur = parse_current_itinerary(html, url, name, line)
        sch = parse_schedule(html, url, name, line)
        if cur or sch:
            with_data.add(url)
        else:
            empty.add(url)

    safe_empty = empty - with_data
    output_path = Path(args.out)
    existing = load_url_set(output_path) if args.merge else set()
    write_url_set(output_path, existing | safe_empty)

    log.info(
        "cache scan: pages_navire=%d vides=%d avec_donnees=%d non_navire=%d inconnues=%d -> %s",
        ship_pages,
        len(safe_empty),
        len(with_data),
        skipped_non_ship_pages,
        unknown_pages,
        output_path,
    )
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--delay", type=float, default=DEFAULT_DELAY)
    p.add_argument("--cache", default=".cache")
    p.add_argument("--force", action="store_true")
    p.add_argument("--no-robots", action="store_true")
    p.add_argument("-v", "--verbose", action="store_true")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("discover")
    s.add_argument("--out", default="ships.txt")
    s.add_argument("--pages", type=int, default=110)
    s.add_argument("--stale-pages", type=int, default=2,
                   help="arreter apres N pages consecutives sans nouveaux navires")
    s.set_defaults(func=cmd_discover)

    s = sub.add_parser("scrape")
    s.add_argument("--ships")
    s.add_argument("--url")
    s.add_argument("--out", default="data")
    s.add_argument("--sync-db", action="store_true",
                   help="upsert des itineraires detailles vers la BD")
    s.add_argument("--sync-script", default="scripts/sync_cruisemapper_to_db.mjs",
                   help="script Node de sync JSON -> BD")
    s.add_argument("--expand-schedule-details", action="store_true",
                   help="recupere le port-par-port pour chaque depart du tableau planning via /ships/cruise.json")
    s.add_argument("--expand-limit-per-ship", type=int, default=0,
                   help="limite le nombre de departs enrichis par navire (0 = tous)")
    s.add_argument("--empty-ships-file", default="data/no_itinerary_ships.txt",
                   help="fichier TXT persistant des navires sans current itinerary ni departs; ils sont skippes aux prochains runs")
    s.add_argument("--ignore-empty-ships-file", action="store_true",
                   help="ignore la skiplist des navires vides pour forcer une verification complete")
    s.set_defaults(func=cmd_scrape)

    s = sub.add_parser("inspect")
    s.add_argument("--url", required=True)
    s.add_argument("--out")
    s.set_defaults(func=cmd_inspect)

    s = sub.add_parser("finder")
    s.add_argument("--url", required=True,
                   help="URL complete de recherche Cruise Finder")
    s.add_argument("--out", default="data/finder_results.csv",
                   help="CSV de sortie des resultats")
    s.add_argument("--ships-out",
                   help="fichier TXT des URL navires uniques extraites")
    s.add_argument("--expand-details", action="store_true",
                   help="recupere l'itineraire port-par-port de chaque resultat via /ships/cruise.json")
    s.add_argument("--details-out-dir", default="data/finder_details",
                   help="dossier de sortie des itineraires detailles enrichis")
    s.add_argument("--sync-db", action="store_true",
                   help="upsert des itineraires detailles enrichis vers la BD")
    s.add_argument("--sync-script", default="scripts/sync_cruisemapper_to_db.mjs",
                   help="script Node de sync JSON -> BD")
    s.set_defaults(func=cmd_finder)

    s = sub.add_parser("mark-empty-from-cache")
    s.add_argument("--cache-dir",
                   help="dossier cache a scanner (defaut: valeur globale --cache)")
    s.add_argument("--out", default="data/no_itinerary_ships.txt",
                   help="fichier TXT de skiplist a ecrire")
    s.add_argument("--merge", action="store_true",
                   help="fusionne avec la skiplist existante au lieu de la remplacer")
    s.set_defaults(func=cmd_mark_empty_from_cache)

    args = p.parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)-7s %(message)s",
                        datefmt="%H:%M:%S")
    client = Client(Path(args.cache), delay=args.delay,
                    respect_robots=not args.no_robots)
    try:
        return args.func(args, client)
    except KeyboardInterrupt:
        log.warning("Interrompu - cache conserve, relance pour reprendre")
        return 130


if __name__ == "__main__":
    sys.exit(main())
