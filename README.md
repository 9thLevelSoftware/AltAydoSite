# AydoCorp Website

The web portal for the **Aydo Intergalactic Corporation** — a Next.js 15 application
covering member authentication, fleet operations, mission planning, ship database
management, finance tracking, and Discord role synchronization, all wrapped in an
in-universe **MobiGlas** UI design system.

## Highlights

- **Authentication** — NextAuth.js with Microsoft Entra ID (Azure AD) and
  username/password against the user database. Session-based RBAC with org
  clearance levels (1–5).
- **Fleet Operations** — ship database, fleet composition, mission planner,
  planned missions, escort requests, and operations dashboards.
- **Discord Integration** — Discord OAuth login, role mapping & monitoring,
  scheduled events, and `discord.js`-driven announcements.
- **Hybrid Storage** — Azure Cosmos DB for MongoDB vCore as the primary store
  with automatic fallback to local JSON files in `/data` when cloud is
  unavailable (check via `GET /api/storage-status`).
- **Ship Asset Pipeline** — FleetYards cache in MongoDB, mirrored to Cloudflare
  R2 (`images.aydocorp.space`) via scheduled sync.
- **MobiGlas UI Kit** — themed React components under
  `src/components/ui/mobiglas/` (container, panel, button, input, pagination,
  toast, confirm dialog, form error, holographic accents, scanline / data-stream
  effects).
- **Email & Notifications** — Nodemailer-backed transactional email (password
  reset, verification) and Discord event announcements.
- **Security** — bcrypt password hashing, rate limiting, file-type validation
  on uploads, and structured error reporting.

## Tech Stack

- **Framework**: Next.js 15.5 (App Router) + React 18 + TypeScript
- **Styling**: Tailwind CSS 3 + custom MobiGlas theme
- **Auth**: NextAuth.js 4 + Microsoft Entra ID
- **Database**: Azure Cosmos DB for MongoDB vCore (driver: `mongodb`)
- **Object Storage**: Cloudflare R2 (via `@aws-sdk/client-s3`)
- **Discord**: `discord.js` + a Node `node-cron` monitor
- **Testing**: Vitest
- **Tooling**: ESLint, Prettier, Husky + lint-staged, `tsx` for TS scripts

## Prerequisites

- Node.js 18 – 22
- npm 9+
- Azure account with a Cosmos DB for MongoDB vCore cluster
- Microsoft Entra ID (Azure AD) app registration
- Cloudflare R2 bucket (for ship image mirroring)
- Discord application + bot (for OAuth and role sync)

## Local Development

```bash
git clone https://github.com/9thLevelSoftware/AltAydoSite.git
cd AltAydoSite
npm install
cp .env.example .env.local   # then fill in values
npm run dev                   # http://localhost:3000
```

### Required Environment Variables

See `.env.example` / `.env.local.example` for the full list. Key groups:

- **NextAuth**: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- **Cosmos DB**: `COSMOSDB_CONNECTION_STRING`, `COSMOS_DATABASE_ID` (must be
  `aydocorp-database`), `COSMOS_CONTAINER_ID`
- **Microsoft Entra ID**: `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`
- **Cloudflare R2**: `CLOUDFLARE_R2_*` (account ID, access key, bucket URL, etc.)
- **Discord**: bot token, client ID/secret, guild ID, role mappings
- **Email (Nodemailer)**: SMTP host/user/pass + `EMAIL_FROM`

`COSMOS_DATABASE_ID` must remain `aydocorp-database` even if your cluster name
differs — see `AGENTS.md` for the rationale.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server on port 3000 |
| `npm run build` | Production build (TS + ESLint errors block the build) |
| `npm start` | Start production server |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript only (faster than full build) |
| `npm test` | Vitest unit tests |
| `npm run clean` | Remove `.next/` |
| `npm run kill-port <port>` | Kill whatever process holds the given port |
| `npm run sync-ships` | Sync FleetYards ships into MongoDB + R2 |
| `npm run migrate-ships` | One-shot ship reference migration |
| `npm run migrate-timezone` | One-shot timezone data migration |
| `npm run test-cosmos` / `test-mongo` / `verify-cosmos` | DB connectivity checks |
| `npm run gen-password` | Generate a secure random password |
| `npm run verify-email` | Verify email (SMTP) config |
| `npm run start-discord-monitor` | Run the Discord role monitor |
| `npm run assign-synced-role` | Assign the "synced" Discord role |

## Project Structure

```
src/
  app/              Next.js App Router pages and API routes
    api/            auth/, users/, ships/, fleet-ops/, planned-missions/,
                    finance/, events/, discord/, cron/, storage-status/
    dashboard/      fleet-database, mission-planner, finance-tracker, ...
    admin/, login/, signup/, services/, references/, ...
  components/       React components by feature area
    ui/mobiglas/    MobiGlas design system (container, panel, button, ...)
  lib/              auth, storage adapters, Discord, ships, missions, ...
  hooks/            Custom React hooks
  scripts/          One-shot maintenance scripts (migrations, verification)
  types/            Shared TypeScript types
data/               Local JSON fallback storage (users, ships, missions, ...)
public/             Static assets, fonts, images
docs/               Mission builder / template documentation
```

## Deployment

The repo ships with Azure App Service configuration (`.deployment`,
`web.config`) and a production-mode `standalone` Next.js output. GitHub Actions
workflows under `.github/workflows/` cover:

- `main_aydocorp.yml` — primary build/deploy
- `ship-sync.yml` — scheduled FleetYards ship sync
- `cloudflare-r2-pr-check.yml` — R2 health check on PRs
- `working_branch_aydocorp.yml` — preview/staging deploys

Push to `main` to trigger the production pipeline. Set the same env vars from
`.env.example` in your hosting platform's secret store.

## Authentication Methods

1. **Microsoft Entra ID (Azure AD)** — “Sign in with Microsoft” via NextAuth.
   New users are provisioned automatically with default permissions.
2. **Username & Password** — local handles authenticated against the user
   store with bcrypt-hashed credentials.

## Contributing

- Run `npm run lint` and `npm run type-check` before committing (Husky enforces
  lint-staged on pre-commit).
- Use the MobiGlas UI components for any new page or feature to keep the
  in-universe look consistent.
- See `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` for project-specific guidance
  tailored to AI coding assistants.

## License

Private project — all rights reserved by Aydo Intergalactic Corporation.