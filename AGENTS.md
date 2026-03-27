# AGENTS.md

This file provides guidance for AI agents working with this repository.

## Project Overview

AydoCorp website built with Next.js 15.3.3 — authentication, fleet operations management, mission planning, and Discord integration. Hybrid storage: Azure Cosmos DB primary, local JSON fallback.

## Quick Start

```bash
npm install
npm run dev
```

The dev server starts on port 3000.

## Commands

### Development

- `npm run dev` - Start dev server on port 3000
- `npm run build` - Production build (TS and ESLint errors block the build)
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript check (faster than full build)
- `npm run clean` - Remove .next directory

### Testing

- `npm test` - Run unit tests (Vitest)
- `npm run test:watch` - Run tests in watch mode

### Database

- `npm run test-cosmos` / `npm run test-mongo` / `npm run verify-cosmos` - DB connectivity tests
- `npm run migrate-timezone` - Migrate timezone data

### Utilities

- `npm run kill-port` - Kill process on port (`npm run kill-port port#`)
- `npm run gen-password` - Generate secure password
- `npm run verify-email` - Verify email config

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

### File Structure

- `/src/app` - Next.js App Router pages and API routes
- `/src/components` - React components by feature area
- `/src/components/ui/mobiglas/` - MobiGlas design system
- `/src/lib` - Core libraries (auth, storage, Discord, ships, etc.)
- `/src/types` - TypeScript type definitions
- `/src/hooks` - Custom React hooks
- `/data` - Local fallback storage (JSON files)

### MobiGlas UI Components

Use these when building new pages/components:

- `MobiGlasContainer` - Page/section wrapper
- `MobiGlasPanel` - Content panel
- `MobiGlasButton` - Standard button
- `MobiGlasInput` - Form input
- `MobiGlasPagination` - Pagination control
- `MobiGlasConfirmDialog` - Confirmation modal
- `MobiGlasToast` / `MobiGlasToastProvider` - Toast notifications
- `MobiGlasFormError` - Form validation errors

All located in `src/components/ui/mobiglas/`.

## Configuration

- TypeScript path aliases: `@/*` -> `./src/*`
- Tailwind CSS for styling
- ESLint config: `.eslintrc.js`

## Gotchas

- `COSMOS_DATABASE_ID` env var must be `aydocorp-database` (not `aydocorpdb-vcore`)
- `cdn.ts` is NOT ship-specific — used by 20+ components for general site assets. Do NOT remove.
- `node-cron` uses `require()` not ESM import (Edge bundling issues)
- Ship images: `resolveShipImage()` with FleetYards CDN URLs; `getShipPlaceholder()` returns `''`
- Mission builder has complex state flow — understand it before modifying
- Environment variables are critical — copy `.env.example` to `.env.local`
- `@typescript-eslint` violations are downgraded to warnings in `.eslintrc.js`

## Code Style

- Run `npm run lint` before committing
- Run `npm run type-check` to verify TypeScript
- Use MobiGlas components for UI consistency
