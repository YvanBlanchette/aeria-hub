This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database: PostgreSQL

The project is configured to use PostgreSQL with Prisma.

### 1) Set DATABASE_URL

Create a `.env` file with a Postgres connection string.

Example:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aeria_hub?schema=public"
```

### 2) Initialize schema

For a fresh environment:

```bash
npm run db:migrate
```

If you want to sync schema without creating a new migration during local setup:

```bash
npm run db:push
```

### 3) Optional seed

```bash
npm run db:seed
```

## Cruise scraping into PostgreSQL

### Full ingest with per-sailing detailed itineraries

```bash
py scripts/cruisemapper_scraper.py --no-robots discover --out ships.txt --pages 110 --stale-pages 2
py scripts/cruisemapper_scraper.py --no-robots scrape --ships ships.txt --out data/full_ingest --expand-schedule-details --expand-limit-per-ship 0 --sync-db
```

### Weekly or monthly job

Run the full ingest command on a schedule (cron or systemd timer on VPS, Task Scheduler on Windows). The scraper upserts records into PostgreSQL, so reruns update existing rows.

### VPS cron (weekly at night)

A helper script is included: [scripts/run_cruisemapper_ingest.sh](scripts/run_cruisemapper_ingest.sh).

Install once on VPS:

```bash
cd /var/www/aeria-crm
chmod +x scripts/run_cruisemapper_ingest.sh
```

Add a weekly cron at 02:15 every Sunday:

```bash
crontab -e
```

```cron
15 2 * * 0 /bin/bash /var/www/aeria-crm/scripts/run_cruisemapper_ingest.sh >> /var/www/aeria-crm/data/logs/cron.log 2>&1
```

Useful checks:

```bash
crontab -l
tail -n 120 /var/www/aeria-crm/data/logs/cron.log
ls -lh /var/www/aeria-crm/data/logs/
```

## Migrate existing SQLite data to PostgreSQL

If you already have important data in SQLite, use this one-shot script before switching production to Postgres.

Script: [scripts/migrate_sqlite_to_postgres.py](scripts/migrate_sqlite_to_postgres.py)

### 1) Install dependency

```bash
pip install "psycopg[binary]"
```

### 2) Dry run (no writes)

```bash
py scripts/migrate_sqlite_to_postgres.py \
	--sqlite-path ./prisma/dev.db \
	--pg-url "postgresql://postgres:postgres@localhost:5432/aeria_hub?schema=public" \
	--dry-run
```

### 3) Real import

```bash
py scripts/migrate_sqlite_to_postgres.py \
	--sqlite-path ./prisma/dev.db \
	--pg-url "postgresql://postgres:postgres@localhost:5432/aeria_hub?schema=public" \
	--truncate
```

### 4) Validate

The script prints per-table counts:

- `src` = rows in SQLite
- `inserted` = rows written to Postgres
- `target_after` = rows in Postgres after import

Recommended safety steps on VPS:

- Backup SQLite file before migration.
- Backup Postgres database before `--truncate` run.
- Run dry-run first, then run real import in a maintenance window.
