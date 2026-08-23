#!/usr/bin/env python3
"""
CruiseMapper Cruise Ports Collector
====================================

Collects cruise-port metadata and port-call schedules from CruiseMapper
and exports normalized JSON, CSV, and SQLite files suitable for later DB import.

IMPORTANT
---------
CruiseMapper's Terms of Use currently restrict automated/systematic data collection
without permission. This script therefore requires an explicit
--i-have-permission flag before making requests to cruisemapper.com.

Use only if you have permission/authorization to collect the data.

Examples
--------
Install:
    pip install requests beautifulsoup4 lxml

Test one port:
    python cruisemapper_ports_scraper.py \
        --port-url https://www.cruisemapper.com/ports/amalfi-port-176 \
        --i-have-permission

Collect first 3 listing pages:
    python cruisemapper_ports_scraper.py \
        --max-pages 3 \
        --i-have-permission

Full discovery + detail collection:
    python cruisemapper_ports_scraper.py \
        --i-have-permission \
        --delay 2.5 \
        --resume

Outputs
-------
output/
    ports.json
    ports.csv
    port_calls.json
    port_calls.csv
    failed_records.json
    cruisemapper_ports.sqlite
    discovered_ports.json
    state.json
    quality_report.json
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import math
import random
import re
import sqlite3
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


BASE_URL = "https://www.cruisemapper.com"
PORTS_URL = f"{BASE_URL}/ports"

DEFAULT_OUTPUT_DIR = Path("output")
DEFAULT_DELAY = 2.5
USER_AGENT = (
    "Mozilla/5.0 (compatible; CruisePortDataCollector/2.0; "
    "+https://example.com/data-collector)"
)

PORT_URL_RE = re.compile(
    r"^/ports/(?P<slug>[a-z0-9-]+)-port-(?P<external_id>\d+)(?:[/?#].*)?$",
    re.IGNORECASE,
)
LOCode_RE = re.compile(
    r"\b(?:port\s+)?locode\s*[:\-]?\s*([A-Z]{2}[A-Z0-9]{3})\b",
    re.IGNORECASE,
)
DISPLAYING_RE = re.compile(
    r"Displaying\s+\d+\s*-\s*\d+\s+of\s+([\d,]+)\s+result",
    re.IGNORECASE,
)

# Coordinate patterns intentionally require explicit labels/JSON-like keys.
LAT_PATTERNS = [
    re.compile(r'["\']latitude["\']\s*[:=]\s*["\']?(-?\d{1,2}(?:\.\d+)?)', re.I),
    re.compile(r'["\']lat["\']\s*[:=]\s*["\']?(-?\d{1,2}(?:\.\d+)?)', re.I),
]
LON_PATTERNS = [
    re.compile(r'["\']longitude["\']\s*[:=]\s*["\']?(-?\d{1,3}(?:\.\d+)?)', re.I),
    re.compile(r'["\']lng["\']\s*[:=]\s*["\']?(-?\d{1,3}(?:\.\d+)?)', re.I),
    re.compile(r'["\']lon["\']\s*[:=]\s*["\']?(-?\d{1,3}(?:\.\d+)?)', re.I),
]


@dataclass
class DiscoveredPort:
    external_id: str
    slug: str
    name: str
    url: str
    listing_excerpt: Optional[str] = None


@dataclass
class PortCall:
    port_external_id: str
    port_name: str
    date_text: Optional[str]
    date_iso: Optional[str]
    ship_name: Optional[str]
    ship_url: Optional[str]
    cruise_line: Optional[str]
    arrival_time: Optional[str]
    departure_time: Optional[str]
    source_url: str


@dataclass
class PortRecord:
    external_id: str
    slug: str
    name: str
    url: str
    region: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    locode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    getting_from_port: Optional[str] = None
    things_to_do: list[dict[str, Any]] = field(default_factory=list)
    terminal_notes: Optional[str] = None
    tender_status: Optional[str] = None
    tender_evidence: Optional[str] = None
    source_name: str = "CruiseMapper"
    source_url: str = ""
    retrieved_at: str = ""
    raw_text_sha256: Optional[str] = None


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def clean_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = re.sub(r"\s+", " ", value).strip()
    return value or None


def text_of(node: Optional[Tag]) -> Optional[str]:
    if node is None:
        return None
    return clean_text(node.get_text(" ", strip=True))


def absolute_url(href: str) -> str:
    return urljoin(BASE_URL, href)


def normalize_port_url(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.scheme or 'https'}://{parsed.netloc or 'www.cruisemapper.com'}{parsed.path}"


def make_session() -> requests.Session:
    retry = Retry(
        total=5,
        connect=5,
        read=5,
        status=5,
        backoff_factor=1.0,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET"]),
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-CA,en;q=0.9,fr-CA;q=0.8,fr;q=0.7",
            "Cache-Control": "no-cache",
        }
    )
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


class DiskCache:
    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _path_for(self, url: str) -> Path:
        digest = hashlib.sha256(url.encode("utf-8")).hexdigest()
        return self.cache_dir / f"{digest}.html"

    def get(self, url: str) -> Optional[str]:
        path = self._path_for(url)
        if not path.exists():
            return None
        return path.read_text(encoding="utf-8", errors="replace")

    def put(self, url: str, html: str) -> None:
        self._path_for(url).write_text(html, encoding="utf-8")


class Collector:
    def __init__(
        self,
        output_dir: Path,
        delay: float = DEFAULT_DELAY,
        use_cache: bool = True,
        force_refresh: bool = False,
    ):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.session = make_session()
        self.delay = max(0.0, delay)
        self.cache = DiskCache(self.output_dir / ".cache")
        self.use_cache = use_cache
        self.force_refresh = force_refresh
        self.last_request_at = 0.0

    def _throttle(self) -> None:
        elapsed = time.monotonic() - self.last_request_at
        # Small random jitter avoids perfectly mechanical request timing.
        wait_for = self.delay + random.uniform(0.0, min(0.75, self.delay * 0.25))
        if elapsed < wait_for:
            time.sleep(wait_for - elapsed)

    def fetch(self, url: str) -> str:
        if self.use_cache and not self.force_refresh:
            cached = self.cache.get(url)
            if cached is not None:
                logging.debug("Cache hit: %s", url)
                return cached

        self._throttle()
        logging.info("GET %s", url)
        response = self.session.get(url, timeout=(15, 45))
        self.last_request_at = time.monotonic()
        response.raise_for_status()

        html = response.text
        if self.use_cache:
            self.cache.put(url, html)
        return html


def parse_listing_page(html: str) -> tuple[list[DiscoveredPort], Optional[int]]:
    soup = BeautifulSoup(html, "lxml")
    ports: dict[str, DiscoveredPort] = {}

    for a in soup.find_all("a", href=True):
        href = a["href"]
        parsed = urlparse(href)
        match = PORT_URL_RE.match(parsed.path)
        if not match:
            continue

        external_id = match.group("external_id")
        slug = match.group("slug")
        name = clean_text(a.get_text(" ", strip=True))
        if not name:
            continue

        # Prefer the heading/list-card anchor over duplicate Wiki/Things-to-do links.
        existing = ports.get(external_id)
        if existing and len(existing.name) >= len(name):
            continue

        excerpt = None
        card_parent = a.find_parent(["li", "article", "div"])
        if card_parent:
            candidate = clean_text(card_parent.get_text(" ", strip=True))
            if candidate and len(candidate) > len(name):
                # Keep a short listing excerpt only.
                excerpt = candidate[:1000]

        ports[external_id] = DiscoveredPort(
            external_id=external_id,
            slug=slug,
            name=name,
            url=absolute_url(parsed.path),
            listing_excerpt=excerpt,
        )

    page_text = clean_text(soup.get_text(" ", strip=True)) or ""
    total = None
    m = DISPLAYING_RE.search(page_text)
    if m:
        total = int(m.group(1).replace(",", ""))

    return list(ports.values()), total


def find_label_value(soup: BeautifulSoup, label: str) -> Optional[str]:
    label_re = re.compile(rf"^\s*{re.escape(label)}\s*$", re.I)

    for node in soup.find_all(string=label_re):
        parent = node.parent
        if not parent:
            continue

        # 1. sibling
        sibling = parent.find_next_sibling()
        if sibling:
            value = text_of(sibling)
            if value and value.lower() != label.lower():
                return value

        # 2. next meaningful element
        nxt = parent.find_next()
        hops = 0
        while nxt and hops < 8:
            hops += 1
            if isinstance(nxt, Tag):
                value = text_of(nxt)
                if value and value.lower() != label.lower():
                    return value
            nxt = nxt.find_next()

    return None


def extract_coordinates(html: str) -> tuple[Optional[float], Optional[float]]:
    lat = lon = None

    for pat in LAT_PATTERNS:
        m = pat.search(html)
        if m:
            try:
                candidate = float(m.group(1))
                if -90 <= candidate <= 90:
                    lat = candidate
                    break
            except ValueError:
                pass

    for pat in LON_PATTERNS:
        m = pat.search(html)
        if m:
            try:
                candidate = float(m.group(1))
                if -180 <= candidate <= 180:
                    lon = candidate
                    break
            except ValueError:
                pass

    return lat, lon


def extract_section(
    soup: BeautifulSoup,
    heading_text: str,
    stop_tags: tuple[str, ...] = ("h2", "h3"),
) -> Optional[str]:
    target = None
    wanted = clean_text(heading_text).lower()

    for heading in soup.find_all(["h2", "h3", "h4"]):
        t = text_of(heading)
        if t and wanted in t.lower():
            target = heading
            break

    if not target:
        return None

    parts: list[str] = []
    for elem in target.next_siblings:
        if isinstance(elem, Tag):
            if elem.name in stop_tags:
                break
            if elem.name in ("p", "ul", "ol", "div"):
                t = text_of(elem)
                if t:
                    parts.append(t)

    return clean_text(" ".join(parts))


NEWS_HEADING_RE = re.compile(
    r"\b(?:latest\s+)?(?:cruise\s+)?news\b|\brelated\s+(?:news|articles|stories)\b|\bmore\s+news\b",
    re.I,
)
NEWS_SENTENCE_RE = re.compile(
    r"\b(?:has|have)\s+(?:announced|unveiled|published|revealed|opened|introduced)\b|"
    r"\bannounced\s+(?:that|the)\b|\bwill\s+join\b",
    re.I,
)


def infer_city_country_from_name(name: str) -> tuple[Optional[str], Optional[str]]:
    """Extract only location text explicitly present in the page title."""
    cleaned = clean_text(name) or ""
    city = clean_text(re.sub(r"\s*\([^)]*\)\s*$", "", cleaned))
    country = None
    m = re.search(r"\(([^)]*)\)\s*$", cleaned)
    if m:
        parts = [clean_text(x) for x in m.group(1).split(",")]
        parts = [x for x in parts if x]
        if len(parts) >= 2:
            country = parts[-1]
    return city, country


def is_news_like_paragraph(text: str) -> bool:
    t = clean_text(text) or ""
    if len(t) < 70:
        return False
    return bool(NEWS_SENTENCE_RE.search(t))


def extract_clean_port_prose(soup: BeautifulSoup) -> list[str]:
    """Collect substantive port prose and stop before related/news blocks."""
    paragraphs: list[str] = []
    seen: set[str] = set()
    h1 = soup.find("h1")
    root = h1.find_parent(["main", "article"]) if h1 else None
    if root is None:
        root = soup

    for node in root.find_all(["h2", "h3", "h4", "p"], recursive=True):
        if node.find_parent(["nav", "footer", "header", "form"]):
            continue
        t = text_of(node)
        if not t:
            continue
        if node.name in ("h2", "h3", "h4"):
            if NEWS_HEADING_RE.search(t):
                break
            continue
        if len(t) < 60 or t in seen:
            continue
        if paragraphs and is_news_like_paragraph(t):
            break
        seen.add(t)
        paragraphs.append(t)

    return paragraphs or extract_main_prose(soup)


def trim_description_before_structured_sections(
    prose: list[str],
    getting_from_port: Optional[str],
    things_to_do: list[dict[str, Any]],
) -> list[str]:
    if not prose:
        return prose
    stop_fragments: list[str] = []
    if getting_from_port:
        g = clean_text(getting_from_port)
        if g:
            stop_fragments.append(g[:100])
    for item in things_to_do:
        d = clean_text(item.get("description"))
        if d:
            stop_fragments.append(d[:100])
    result: list[str] = []
    for p in prose:
        cp = clean_text(p) or ""
        if any(fragment and fragment in cp for fragment in stop_fragments):
            break
        result.append(cp)
    return result or prose[:1]


def extract_main_prose(soup: BeautifulSoup) -> list[str]:
    """
    Gets substantial prose paragraphs while excluding obvious UI/nav/footer text.
    """
    paragraphs: list[str] = []
    seen: set[str] = set()

    for p in soup.find_all("p"):
        if p.find_parent(["nav", "footer", "header", "form"]):
            continue
        t = text_of(p)
        if not t or len(t) < 60:
            continue
        if t in seen:
            continue
        seen.add(t)
        paragraphs.append(t)

    # Some pages place body prose directly in divs rather than <p>.
    if not paragraphs:
        for node in soup.find_all(["div", "section", "article"]):
            if node.find_parent(["nav", "footer", "header", "form"]):
                continue
            if node.find(["div", "section", "article"], recursive=False):
                continue
            t = text_of(node)
            if t and len(t) >= 120 and t not in seen:
                seen.add(t)
                paragraphs.append(t)

    return paragraphs


def detect_tender_status(text: str) -> tuple[Optional[str], Optional[str]]:
    """
    Only returns a status when the source text explicitly says something
    indicating tender/anchoring or docking. Otherwise returns None.
    """
    sentences = re.split(r"(?<=[.!?])\s+", text)

    tender_patterns = (
        r"\banchor(?:s|ed|ing)?\s+offshore\b",
        r"\bby\s+tender\b",
        r"\btender(?:ing|ed|s)?\b",
        r"\btender\s+port\b",
    )
    dock_patterns = (
        r"\bcruise\s+ships?\s+dock\b",
        r"\bdock(?:s|ed|ing)?\s+(?:at|alongside)\b",
        r"\bberth(?:s|ed|ing)?\s+(?:at|alongside)\b",
    )

    for sentence in sentences:
        s = clean_text(sentence) or ""
        if any(re.search(p, s, re.I) for p in tender_patterns):
            return "tender", s[:500]

    for sentence in sentences:
        s = clean_text(sentence) or ""
        if any(re.search(p, s, re.I) for p in dock_patterns):
            return "dock", s[:500]

    return None, None


def extract_things_to_do(soup: BeautifulSoup) -> list[dict[str, Any]]:
    """
    Extracts h4-based activities under a Things/Best Ways section when present.
    Nothing is inferred if headings are absent.
    """
    results: list[dict[str, Any]] = []
    seen: set[str] = set()

    for h4 in soup.find_all("h4"):
        name = text_of(h4)
        if not name or name in seen:
            continue

        # Gather text until next h3/h4.
        parts: list[str] = []
        cur = h4.find_next_sibling()
        while cur:
            if isinstance(cur, Tag) and cur.name in ("h3", "h4"):
                break
            if isinstance(cur, Tag):
                t = text_of(cur)
                if t:
                    parts.append(t)
            cur = cur.find_next_sibling()

        description = clean_text(" ".join(parts))
        if description and len(description) >= 30:
            seen.add(name)

            recommended_time = None
            difficulty = None

            m = re.search(
                r"Recommended time:\s*([^.;]+)",
                description,
                re.I,
            )
            if m:
                recommended_time = clean_text(m.group(1))

            m = re.search(
                r"Difficulty:\s*([^.;]+)",
                description,
                re.I,
            )
            if m:
                difficulty = clean_text(m.group(1))

            results.append(
                {
                    "name": name,
                    "description": description,
                    "recommended_time": recommended_time,
                    "difficulty": difficulty,
                }
            )

    return results


def parse_date_text(date_text: Optional[str]) -> Optional[str]:
    if not date_text:
        return None

    # Remove weekday if present, then try common CruiseMapper date style.
    cleaned = clean_text(date_text)
    if not cleaned:
        return None

    # e.g. "1 August, 2026 Saturday"
    cleaned = re.sub(
        r"\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b",
        "",
        cleaned,
        flags=re.I,
    )
    cleaned = clean_text(cleaned)

    for fmt in ("%d %B, %Y", "%d %B %Y", "%B %d, %Y"):
        try:
            return datetime.strptime(cleaned, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def parse_schedule_table(
    soup: BeautifulSoup,
    port_external_id: str,
    port_name: str,
    source_url: str,
) -> list[PortCall]:
    calls: list[PortCall] = []

    for table in soup.find_all("table"):
        header_text = " ".join(
            clean_text(th.get_text(" ", strip=True)) or ""
            for th in table.find_all(["th"])
        ).lower()

        # Some HTML tables use first row <td> cells as headers.
        if not header_text:
            first_row = table.find("tr")
            if first_row:
                header_text = " ".join(
                    clean_text(c.get_text(" ", strip=True)) or ""
                    for c in first_row.find_all(["td", "th"])
                ).lower()

        if not all(key in header_text for key in ("ship", "arrival", "departure")):
            continue

        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all(["td", "th"])
            if len(cells) < 4:
                continue

            cell_texts = [clean_text(c.get_text(" ", strip=True)) for c in cells]
            row_joined = " ".join(x or "" for x in cell_texts).lower()
            if "ship" in row_joined and "arrival" in row_joined and "departure" in row_joined:
                continue

            date_text = cell_texts[0]
            ship_cell = cells[1]
            arrival = cell_texts[2] or None
            departure = cell_texts[3] or None

            ship_name = text_of(ship_cell)
            ship_url = None
            ship_anchor = ship_cell.find("a", href=True)
            if ship_anchor:
                ship_url = absolute_url(ship_anchor["href"])
                ship_name = text_of(ship_anchor) or ship_name

            cruise_line = None
            img = ship_cell.find("img")
            if img:
                alt = clean_text(img.get("alt"))
                if alt:
                    cruise_line = re.sub(
                        r"\s+(?:Cruises\s+)?cruise\s+line$",
                        "",
                        alt,
                        flags=re.I,
                    )
                    cruise_line = clean_text(cruise_line)

            calls.append(
                PortCall(
                    port_external_id=port_external_id,
                    port_name=port_name,
                    date_text=date_text,
                    date_iso=parse_date_text(date_text),
                    ship_name=ship_name,
                    ship_url=ship_url,
                    cruise_line=cruise_line,
                    arrival_time=arrival,
                    departure_time=departure,
                    source_url=source_url,
                )
            )

    return calls


def parse_port_page(
    html: str,
    url: str,
    fallback: Optional[DiscoveredPort] = None,
) -> tuple[PortRecord, list[PortCall]]:
    soup = BeautifulSoup(html, "lxml")
    h1 = soup.find("h1")
    name = text_of(h1) or (fallback.name if fallback else None)
    if not name:
        raise ValueError(f"Unable to determine port name for {url}")

    path = urlparse(url).path
    m = PORT_URL_RE.match(path)
    if m:
        external_id = m.group("external_id")
        slug = m.group("slug")
    elif fallback:
        external_id = fallback.external_id
        slug = fallback.slug
    else:
        raise ValueError(f"URL is not recognized as a CruiseMapper port URL: {url}")

    all_text = clean_text(soup.get_text(" ", strip=True)) or ""

    locode = None
    locode_match = LOCode_RE.search(all_text)
    if locode_match:
        locode = locode_match.group(1).upper()

    region = find_label_value(soup, "Region")
    city, country = infer_city_country_from_name(name)

    latitude, longitude = extract_coordinates(html)

    getting_from_port = (
        extract_section(soup, "Getting from the Cruise Port")
        or extract_section(soup, "Getting from the Port")
        or extract_section(soup, "Cruise Port")
    )

    things_to_do = extract_things_to_do(soup)
    prose = extract_clean_port_prose(soup)
    prose = trim_description_before_structured_sections(
        prose, getting_from_port, things_to_do
    )
    description = clean_text("\n\n".join(prose)) if prose else None
    summary = prose[0] if prose else (fallback.listing_excerpt if fallback else None)

    terminal_notes_parts = []
    for sentence in re.split(r"(?<=[.!?])\s+", description or ""):
        if re.search(r"\bterminal\b|\bberth\b|\bpier\b", sentence, re.I):
            terminal_notes_parts.append(clean_text(sentence))
    terminal_notes = clean_text(
        " ".join(x for x in terminal_notes_parts if x)[:2500]
    )

    tender_status, tender_evidence = detect_tender_status(description or all_text)

    record = PortRecord(
        external_id=external_id,
        slug=slug,
        name=name,
        url=normalize_port_url(url),
        region=region,
        city=city,
        country=country,
        locode=locode,
        latitude=latitude,
        longitude=longitude,
        summary=summary,
        description=description,
        getting_from_port=getting_from_port,
        things_to_do=things_to_do,
        terminal_notes=terminal_notes,
        tender_status=tender_status,
        tender_evidence=tender_evidence,
        source_name="CruiseMapper",
        source_url=normalize_port_url(url),
        retrieved_at=utc_now_iso(),
        raw_text_sha256=hashlib.sha256(all_text.encode("utf-8")).hexdigest(),
    )

    calls = parse_schedule_table(
        soup=soup,
        port_external_id=external_id,
        port_name=name,
        source_url=record.source_url,
    )
    return record, calls


def discover_all_ports(
    collector: Collector,
    max_pages: Optional[int] = None,
) -> list[DiscoveredPort]:
    discovered: dict[str, DiscoveredPort] = {}

    first_html = collector.fetch(PORTS_URL)
    first_ports, total = parse_listing_page(first_html)
    for p in first_ports:
        discovered[p.external_id] = p

    if total:
        page_count = math.ceil(total / 15)
        logging.info("Site reports %s ports (~%s listing pages)", total, page_count)
    else:
        page_count = max_pages or 1000
        logging.warning(
            "Could not determine total port count; discovery will stop when a page adds no new ports."
        )

    if max_pages is not None:
        page_count = min(page_count, max_pages)

    # Page 1 already fetched.
    for page in range(2, page_count + 1):
        html = collector.fetch(f"{PORTS_URL}?page={page}")
        page_ports, _ = parse_listing_page(html)

        before = len(discovered)
        for p in page_ports:
            discovered[p.external_id] = p

        added = len(discovered) - before
        logging.info(
            "Discovery page %s: %s rows, %s new, %s total",
            page,
            len(page_ports),
            added,
            len(discovered),
        )

        if not page_ports or added == 0:
            logging.info("No new ports found on page %s; stopping discovery.", page)
            break

    return list(discovered.values())


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def save_json(path: Path, data: Any) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    tmp.replace(path)


def flatten_port_for_csv(port: dict[str, Any]) -> dict[str, Any]:
    row = dict(port)
    row["things_to_do"] = json.dumps(
        row.get("things_to_do") or [],
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return row


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8")
        return

    fieldnames: list[str] = []
    seen = set()
    for row in rows:
        for key in row:
            if key not in seen:
                seen.add(key)
                fieldnames.append(key)

    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def init_sqlite(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS ports (
            external_id TEXT PRIMARY KEY,
            slug TEXT NOT NULL,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            region TEXT,
            city TEXT,
            country TEXT,
            locode TEXT,
            latitude REAL,
            longitude REAL,
            summary TEXT,
            description TEXT,
            getting_from_port TEXT,
            things_to_do_json TEXT NOT NULL DEFAULT '[]',
            terminal_notes TEXT,
            tender_status TEXT,
            tender_evidence TEXT,
            source_name TEXT NOT NULL,
            source_url TEXT NOT NULL,
            retrieved_at TEXT NOT NULL,
            raw_text_sha256 TEXT
        );

        CREATE TABLE IF NOT EXISTS port_calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            port_external_id TEXT NOT NULL,
            port_name TEXT NOT NULL,
            date_text TEXT,
            date_iso TEXT,
            ship_name TEXT,
            ship_url TEXT,
            cruise_line TEXT,
            arrival_time TEXT,
            departure_time TEXT,
            source_url TEXT NOT NULL,
            UNIQUE (
                port_external_id,
                date_text,
                ship_name,
                arrival_time,
                departure_time
            ),
            FOREIGN KEY (port_external_id) REFERENCES ports(external_id)
                ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_ports_region
            ON ports(region);
        CREATE INDEX IF NOT EXISTS idx_ports_locode
            ON ports(locode);
        CREATE INDEX IF NOT EXISTS idx_ports_country
            ON ports(country);
        CREATE INDEX IF NOT EXISTS idx_ports_city
            ON ports(city);
        CREATE INDEX IF NOT EXISTS idx_port_calls_port_date
            ON port_calls(port_external_id, date_iso);
        CREATE INDEX IF NOT EXISTS idx_port_calls_ship
            ON port_calls(ship_name);
        """
    )

    existing_columns = {row[1] for row in conn.execute("PRAGMA table_info(ports)").fetchall()}
    if "city" not in existing_columns:
        conn.execute("ALTER TABLE ports ADD COLUMN city TEXT")
    if "country" not in existing_columns:
        conn.execute("ALTER TABLE ports ADD COLUMN country TEXT")

    conn.commit()
    return conn


def upsert_port_sqlite(conn: sqlite3.Connection, p: PortRecord) -> None:
    conn.execute(
        """
        INSERT INTO ports (
            external_id, slug, name, url, region, city, country, locode,
            latitude, longitude, summary, description, getting_from_port,
            things_to_do_json, terminal_notes, tender_status, tender_evidence,
            source_name, source_url, retrieved_at, raw_text_sha256
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(external_id) DO UPDATE SET
            slug=excluded.slug,
            name=excluded.name,
            url=excluded.url,
            region=excluded.region,
            city=excluded.city,
            country=excluded.country,
            locode=excluded.locode,
            latitude=excluded.latitude,
            longitude=excluded.longitude,
            summary=excluded.summary,
            description=excluded.description,
            getting_from_port=excluded.getting_from_port,
            things_to_do_json=excluded.things_to_do_json,
            terminal_notes=excluded.terminal_notes,
            tender_status=excluded.tender_status,
            tender_evidence=excluded.tender_evidence,
            source_name=excluded.source_name,
            source_url=excluded.source_url,
            retrieved_at=excluded.retrieved_at,
            raw_text_sha256=excluded.raw_text_sha256
        """,
        (
            p.external_id,
            p.slug,
            p.name,
            p.url,
            p.region,
            p.city,
            p.country,
            p.locode,
            p.latitude,
            p.longitude,
            p.summary,
            p.description,
            p.getting_from_port,
            json.dumps(p.things_to_do, ensure_ascii=False),
            p.terminal_notes,
            p.tender_status,
            p.tender_evidence,
            p.source_name,
            p.source_url,
            p.retrieved_at,
            p.raw_text_sha256,
        ),
    )


def replace_calls_sqlite(
    conn: sqlite3.Connection,
    port_external_id: str,
    calls: list[PortCall],
) -> None:
    conn.execute(
        "DELETE FROM port_calls WHERE port_external_id = ?",
        (port_external_id,),
    )
    conn.executemany(
        """
        INSERT OR IGNORE INTO port_calls (
            port_external_id, port_name, date_text, date_iso,
            ship_name, ship_url, cruise_line,
            arrival_time, departure_time, source_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (
                c.port_external_id,
                c.port_name,
                c.date_text,
                c.date_iso,
                c.ship_name,
                c.ship_url,
                c.cruise_line,
                c.arrival_time,
                c.departure_time,
                c.source_url,
            )
            for c in calls
        ],
    )


def build_quality_report(
    conn: sqlite3.Connection,
    output_dir: Path,
    discovered_count: Optional[int] = None,
    failed_count: Optional[int] = None,
) -> dict[str, Any]:
    conn.row_factory = sqlite3.Row
    total = conn.execute("SELECT COUNT(*) FROM ports").fetchone()[0]
    calls = conn.execute("SELECT COUNT(*) FROM port_calls").fetchone()[0]

    def count_where(where: str) -> int:
        return conn.execute(f"SELECT COUNT(*) FROM ports WHERE {where}").fetchone()[0]

    with_coords = count_where("latitude IS NOT NULL AND longitude IS NOT NULL")
    with_locode = count_where("locode IS NOT NULL AND TRIM(locode) <> ''")
    with_country = count_where("country IS NOT NULL AND TRIM(country) <> ''")
    with_city = count_where("city IS NOT NULL AND TRIM(city) <> ''")
    with_description = count_where("description IS NOT NULL AND LENGTH(TRIM(description)) > 0")
    with_getting = count_where("getting_from_port IS NOT NULL AND LENGTH(TRIM(getting_from_port)) > 0")
    tender = count_where("tender_status = 'tender'")
    dock = count_where("tender_status = 'dock'")
    unknown = total - tender - dock
    calls_missing_arrival = conn.execute("SELECT COUNT(*) FROM port_calls WHERE arrival_time IS NULL OR TRIM(arrival_time) = ''").fetchone()[0]
    calls_missing_departure = conn.execute("SELECT COUNT(*) FROM port_calls WHERE departure_time IS NULL OR TRIM(departure_time) = ''").fetchone()[0]

    def pct(n: int) -> float:
        return round((n / total * 100.0), 1) if total else 0.0

    report = {
        "generated_at": utc_now_iso(),
        "discovered_ports": discovered_count,
        "ports_in_database": total,
        "failed_ports": failed_count,
        "port_calls": calls,
        "coverage": {
            "coordinates": {"count": with_coords, "percent": pct(with_coords)},
            "locode": {"count": with_locode, "percent": pct(with_locode)},
            "country": {"count": with_country, "percent": pct(with_country)},
            "city": {"count": with_city, "percent": pct(with_city)},
            "description": {"count": with_description, "percent": pct(with_description)},
            "getting_from_port": {"count": with_getting, "percent": pct(with_getting)},
        },
        "port_access": {"tender_confirmed": tender, "dock_confirmed": dock, "unknown": unknown},
        "port_calls_missing_times": {"arrival": calls_missing_arrival, "departure": calls_missing_departure},
    }
    save_json(output_dir / "quality_report.json", report)
    return report


def print_quality_report(report: dict[str, Any]) -> None:
    cov = report["coverage"]
    access = report["port_access"]
    print("\nQUALITY REPORT")
    print("--------------")
    if report.get("discovered_ports") is not None:
        print(f"Ports discovered:       {report['discovered_ports']}")
    print(f"Ports in database:      {report['ports_in_database']}")
    if report.get("failed_ports") is not None:
        print(f"Ports failed:           {report['failed_ports']}")
    print(f"Port calls extracted:   {report['port_calls']}")
    print(f"With coordinates:       {cov['coordinates']['count']} ({cov['coordinates']['percent']}%)")
    print(f"With LOCODE:            {cov['locode']['count']} ({cov['locode']['percent']}%)")
    print(f"With country:           {cov['country']['count']} ({cov['country']['percent']}%)")
    print(f"With city:              {cov['city']['count']} ({cov['city']['percent']}%)")
    print(f"With description:       {cov['description']['count']} ({cov['description']['percent']}%)")
    print(f"Tender confirmed:       {access['tender_confirmed']}")
    print(f"Dock confirmed:         {access['dock_confirmed']}")
    print(f"Tender/dock unknown:    {access['unknown']}")
    print("Quality JSON:           quality_report.json")


def export_sqlite_to_files(conn: sqlite3.Connection, output_dir: Path) -> None:
    conn.row_factory = sqlite3.Row

    ports_rows = [
        dict(row)
        for row in conn.execute(
            "SELECT * FROM ports ORDER BY name COLLATE NOCASE"
        ).fetchall()
    ]
    for row in ports_rows:
        try:
            row["things_to_do"] = json.loads(row.pop("things_to_do_json"))
        except Exception:
            row["things_to_do"] = []

    calls_rows = [
        dict(row)
        for row in conn.execute(
            """
            SELECT
                port_external_id, port_name, date_text, date_iso,
                ship_name, ship_url, cruise_line,
                arrival_time, departure_time, source_url
            FROM port_calls
            ORDER BY COALESCE(date_iso, '9999-99-99'), port_name, ship_name
            """
        ).fetchall()
    ]

    save_json(output_dir / "ports.json", ports_rows)
    save_json(output_dir / "port_calls.json", calls_rows)

    write_csv(
        output_dir / "ports.csv",
        [flatten_port_for_csv(row) for row in ports_rows],
    )
    write_csv(output_dir / "port_calls.csv", calls_rows)


def run_single_port(
    collector: Collector,
    url: str,
    conn: sqlite3.Connection,
) -> None:
    html = collector.fetch(url)
    port, calls = parse_port_page(html, url)

    upsert_port_sqlite(conn, port)
    replace_calls_sqlite(conn, port.external_id, calls)
    conn.commit()

    logging.info(
        "Saved %s (%s), %s port calls",
        port.name,
        port.external_id,
        len(calls),
    )


def run_full(
    collector: Collector,
    conn: sqlite3.Connection,
    max_pages: Optional[int],
    max_ports: Optional[int],
    resume: bool,
) -> None:
    discovered_path = collector.output_dir / "discovered_ports.json"
    state_path = collector.output_dir / "state.json"
    failed_path = collector.output_dir / "failed_records.json"

    if resume and discovered_path.exists():
        raw_discovered = load_json(discovered_path, [])
        discovered = [DiscoveredPort(**x) for x in raw_discovered]
        logging.info("Loaded %s discovered ports from resume file", len(discovered))
    else:
        discovered = discover_all_ports(collector, max_pages=max_pages)
        save_json(discovered_path, [asdict(x) for x in discovered])

    if max_ports is not None:
        discovered = discovered[:max_ports]

    state = load_json(state_path, {"completed": []}) if resume else {"completed": []}
    completed = set(str(x) for x in state.get("completed", []))
    failed = load_json(failed_path, []) if resume else []

    for idx, item in enumerate(discovered, start=1):
        if resume and item.external_id in completed:
            logging.info(
                "[%s/%s] Skip completed: %s",
                idx,
                len(discovered),
                item.name,
            )
            continue

        logging.info(
            "[%s/%s] Collecting %s",
            idx,
            len(discovered),
            item.name,
        )

        try:
            html = collector.fetch(item.url)
            port, calls = parse_port_page(html, item.url, fallback=item)

            upsert_port_sqlite(conn, port)
            replace_calls_sqlite(conn, port.external_id, calls)
            conn.commit()

            completed.add(item.external_id)
            state["completed"] = sorted(completed, key=lambda x: int(x))
            state["updated_at"] = utc_now_iso()
            save_json(state_path, state)

            logging.info(
                "Saved %s | region=%s | locode=%s | calls=%s",
                port.name,
                port.region,
                port.locode,
                len(calls),
            )

        except KeyboardInterrupt:
            logging.warning("Interrupted. Progress has been saved.")
            raise
        except Exception as exc:
            conn.rollback()
            logging.exception("Failed port %s: %s", item.url, exc)
            failed.append(
                {
                    "external_id": item.external_id,
                    "name": item.name,
                    "url": item.url,
                    "error": repr(exc),
                    "failed_at": utc_now_iso(),
                }
            )
            save_json(failed_path, failed)

    export_sqlite_to_files(conn, collector.output_dir)
    save_json(failed_path, failed)
    report = build_quality_report(conn, collector.output_dir, discovered_count=len(discovered), failed_count=len(failed))
    print_quality_report(report)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collect CruiseMapper port data into JSON/CSV/SQLite."
    )

    parser.add_argument(
        "--i-have-permission",
        action="store_true",
        help=(
            "Required confirmation that you have authorization to perform "
            "automated collection from CruiseMapper."
        ),
    )
    parser.add_argument(
        "--port-url",
        help="Collect only one specific CruiseMapper port URL.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        help="Output directory (default: output).",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=DEFAULT_DELAY,
        help=f"Minimum delay between network requests in seconds (default: {DEFAULT_DELAY}).",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        help="Limit discovery to N listing pages (useful for testing).",
    )
    parser.add_argument(
        "--max-ports",
        type=int,
        help="Limit detailed extraction to N ports (useful for testing).",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume using discovered_ports.json and state.json.",
    )
    parser.add_argument(
        "--force-refresh",
        action="store_true",
        help="Ignore cached HTML and download pages again.",
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Disable HTML disk cache.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%H:%M:%S",
    )

    if not args.i_have_permission:
        print(
            "\nREFUSING TO START NETWORK COLLECTION\n"
            "------------------------------------\n"
            "CruiseMapper's published terms currently restrict systematic/automated\n"
            "data collection without authorization.\n\n"
            "If you have permission to collect this data, rerun with:\n"
            "    --i-have-permission\n",
            file=sys.stderr,
        )
        return 2

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    collector = Collector(
        output_dir=output_dir,
        delay=args.delay,
        use_cache=not args.no_cache,
        force_refresh=args.force_refresh,
    )

    db_path = output_dir / "cruisemapper_ports.sqlite"
    conn = init_sqlite(db_path)

    try:
        if args.port_url:
            if "cruisemapper.com/ports/" not in args.port_url:
                raise ValueError("--port-url must be a CruiseMapper port URL.")
            run_single_port(collector, args.port_url, conn)
            export_sqlite_to_files(conn, output_dir)
            report = build_quality_report(conn, output_dir, discovered_count=1, failed_count=0)
            print_quality_report(report)
        else:
            run_full(
                collector=collector,
                conn=conn,
                max_pages=args.max_pages,
                max_ports=args.max_ports,
                resume=args.resume,
            )
    finally:
        conn.close()

    print("\nDone.")
    print(f"SQLite : {db_path}")
    print(f"Ports  : {output_dir / 'ports.json'}")
    print(f"CSV    : {output_dir / 'ports.csv'}")
    print(f"Calls  : {output_dir / 'port_calls.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
