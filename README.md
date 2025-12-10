# AssetSO - Asset Management System

Modern web app for company asset management with Stock Opname (SO), maintenance tracking, and full backup/restore.

## Features
- Asset management: complete asset profile (number, name, category, location, PIC), status tracking, image upload, import/export.
- Stock Opname: mobile-friendly scanning, SO sessions, real-time progress dashboard, notes during scanning, smart search.
- Maintenance: maintenance tickets, broken asset tracking, quick ticket from SO result, technician assignment, reports.
- People & locations: employees, departments, sites/locations, PIC assignments, distribution reports.
- User & security: role-based access (Admin, SO Asset, Viewer, etc.), admin panel, secure authentication.
- Backup & restore: one-click full backup (assets, employees, SO sessions, users) with metadata and validation.

## Tech Stack
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui + Lucide icons
- Prisma ORM (default SQLite for local); Supabase-ready
- Deployed on Vercel; Docker support available

## Quick Start
```bash
# Install dependencies
npm install

# Copy env and adjust values
cp .env.example .env.local
# Default uses SQLite: DATABASE_URL="file:./dev.db"

# Prepare database
npm run db:push
npm run db:seed

# Start dev server
npm run dev
# Production build
npm run build && npm start
```
Open http://localhost:3000.

## Project Structure
```
src/
  app/             # App Router routes & API
    admin/         # Admin panel
    assets/        # Asset management pages
    maintenance/   # Maintenance module
    so-asset/      # Stock Opname pages
    scan/          # Mobile scanning
    api/           # API routes
  components/      # Reusable UI (including shadcn/ui overrides)
  hooks/           # Custom React hooks
  lib/             # Utilities (db, helpers)
```

## Deployment Notes
- Vercel: see `vercel.json` (build runs `prisma generate && next build`, region `sin1`).
- Environment: set `DATABASE_URL` and auth secrets; adjust `PRISMA_GENERATE_DATAPROXY` if needed.
- Docker: Dockerfile provided; configure env before running the container.

## Maintenance
- Run `npm run lint` before deploy.
- Keep Prisma schema and seeds in sync; test backup/restore after schema changes.
