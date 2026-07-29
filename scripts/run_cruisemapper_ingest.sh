#!/usr/bin/env bash
set -euo pipefail

# Weekly CruiseMapper ingest runner.
# - Loads project env
# - Uses a lock to avoid overlapping runs
# - Logs to data/logs/

PROJECT_DIR="/var/www/aeria-crm"
LOG_DIR="$PROJECT_DIR/data/logs"
LOCK_FILE="/tmp/cruisemapper_ingest.lock"

# Tunables (can be overridden in cron environment)
PAGES="${CRUISE_PAGES:-110}"
STALE_PAGES="${CRUISE_STALE_PAGES:-2}"
EXPAND_LIMIT_PER_SHIP="${CRUISE_EXPAND_LIMIT_PER_SHIP:-0}"
EMPTY_SHIPS_FILE="${CRUISE_EMPTY_SHIPS_FILE:-data/no_itinerary_ships.txt}"

mkdir -p "$LOG_DIR"
RUN_TS="$(date +%Y%m%d_%H%M%S)"
LOG_FILE="$LOG_DIR/cruisemapper_ingest_${RUN_TS}.log"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$(date -Is)] Another ingest is already running. Exiting." | tee -a "$LOG_FILE"
  exit 0
fi

START_EPOCH="$(date +%s)"

{
  echo "[$(date -Is)] Starting CruiseMapper ingest"
  cd "$PROJECT_DIR"

  if [[ -f .env ]]; then
    # shellcheck disable=SC1091
    source .env
  fi

  if [[ -n "${DATABASE_URL_POSTGRES:-}" ]]; then
    export DATABASE_URL="$DATABASE_URL_POSTGRES"
  fi

  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "[$(date -Is)] ERROR: DATABASE_URL is not set"
    exit 1
  fi

  mkdir -p data/full_ingest

  echo "[$(date -Is)] Discover ships (pages=$PAGES stale_pages=$STALE_PAGES)"
  python3 scripts/cruisemapper_scraper.py --no-robots discover \
    --out ships.txt \
    --pages "$PAGES" \
    --stale-pages "$STALE_PAGES"

  echo "[$(date -Is)] Mark already-cached ships with zero itineraries"
  python3 scripts/cruisemapper_scraper.py --no-robots mark-empty-from-cache \
    --out "$EMPTY_SHIPS_FILE" \
    --merge

  echo "[$(date -Is)] Scrape and sync to DB (expand_limit_per_ship=$EXPAND_LIMIT_PER_SHIP empty_ships_file=$EMPTY_SHIPS_FILE)"
  python3 scripts/cruisemapper_scraper.py --no-robots scrape \
    --ships ships.txt \
    --out data/full_ingest \
    --expand-schedule-details \
    --expand-limit-per-ship "$EXPAND_LIMIT_PER_SHIP" \
    --empty-ships-file "$EMPTY_SHIPS_FILE" \
    --sync-db

  # psql does not support the schema query param in URI.
  PGURL="$(echo "$DATABASE_URL" | cut -d'?' -f1)"
  echo "[$(date -Is)] Final row count"
  psql "$PGURL" -c 'SELECT COUNT(*) AS total FROM "ScrapedCruiseItinerary";'

  END_EPOCH="$(date +%s)"
  DURATION="$((END_EPOCH - START_EPOCH))"
  echo "[$(date -Is)] Completed successfully in ${DURATION}s"
} 2>&1 | tee -a "$LOG_FILE"
