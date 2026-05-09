# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AydoCorp website built with Next.js 15.3.3 — authentication, fleet operations management, mission planning, and Discord integration. Hybrid storage: Azure Cosmos DB primary, local JSON fallback.

## Commands

### Development

- `npm run dev` - Start dev server on port 3000
- `npm run build` - Production build (TS and ESLint errors block the build)
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript check (faster than full build)
- `npm run clean` - Remove .next directory

### Database

- `npm run migrate-users` - Migrate users from local to Cosmos DB
- `npm run migrate-timezone` - Migrate timezone data
- `npm run test-cosmos` / `npm run test-mongo` / `npm run verify-cosmos` - DB connectivity tests

### Utilities

- `npm run kill-port` - Kill process on port (`npm run kill-port port#`)
- `npm run gen-password` - Generate secure password
- `npm run verify-email` - Verify email config
- `npm run start-discord-monitor` - Start Discord role monitoring
- `npm run assign-synced-role` - Assign Discord synced roles

## Architecture

### Storage

- **Primary**: Azure Cosmos DB for MongoDB vCore
- **Fallback**: Local JSON files in `/data`
- Auto-falls back if cloud DB unavailable; check via `/api/storage-status`

### Authentication

- NextAuth.js with Microsoft Entra ID (Azure AD)
- Username/password auth via Cosmos DB
- Discord OAuth for role sync
- Clearance levels (1-5) and role-based access control

### Key Feature Areas

- **Fleet Operations**: Mission planning, ops management, resource allocation
- **Mission Builder**: Complex React state management for mission composition
- **Discord Integration**: Role monitoring/sync, events, OAuth, auto role assignment
- **Ship Database**: Dynamic ship data from FleetYards.net API (`/api/ships/*`)
- **User Management**: Profiles, timezones, clearance-based access

### File Structure

- `/src/app` - Next.js App Router pages and API routes
- `/src/components` - React components by feature area
- `/src/components/ui/mobiglas/` - MobiGlas design system (see below)
- `/src/lib` - Core libraries (auth, storage, Discord, ships, etc.)
- `/src/lib/ships/` - Ship data modules (format, image, mappers)
- `/src/types` - TypeScript type definitions (including `ship.ts`)
- `/src/hooks` - Custom React hooks
- `/src/scripts` - Admin and migration scripts
- `/data` - Local fallback storage (JSON files)

### MobiGlas UI Components

Use these when building new pages/components — they provide the project's consistent UI:

- `MobiGlasContainer` - Page/section wrapper
- `MobiGlasPanel` - Content panel
- `MobiGlasButton` - Standard button
- `MobiGlasInput` - Form input
- `MobiGlasPagination` - Pagination control
- `MobiGlasConfirmDialog` - Confirmation modal
- `MobiGlasToast` / `MobiGlasToastProvider` - Toast notifications
- `MobiGlasFormError` - Form validation errors

All located in `src/components/ui/mobiglas/`.

### Configuration

- TypeScript path aliases: `@/*` -> `./src/*`
- Tailwind CSS for styling
- SVG allowed via `dangerouslyAllowSVG`; ship images cached 7 days
- Standalone output in production; standard in dev
- Discord.js handled via `serverExternalPackages` in next.config.js
- ESLint config: `.eslintrc.js` (ESLint 8 prioritizes .js over .json)

## Gotchas

- `COSMOS_DATABASE_ID` env var must be `aydocorp-database` (not `aydocorpdb-vcore`)
- `cdn.ts` is NOT ship-specific — used by 20+ components for general site assets. Do NOT remove.
- `images.aydocorp.space` remote pattern in next.config.js serves non-ship imagery. Keep it.
- `node-cron` uses `require()` not ESM import (Edge bundling issues)
- Ship images: `resolveShipImage()` with FleetYards CDN URLs; `getShipPlaceholder()` returns `''` — components handle empty state via CSS (no placeholder PNGs)
- Mission builder has complex state flow — understand it before modifying
- Always test both cloud and fallback storage modes when making storage changes
- Environment variables are critical — copy `.env.example` to `.env.local`
- `@typescript-eslint` violations are downgraded to warnings in `.eslintrc.js`

## AI Workflow Reference

For Gemini CLI, Cursor Agent, and multi-AI workflow documentation, see [docs/ai-workflow.md](docs/ai-workflow.md).
