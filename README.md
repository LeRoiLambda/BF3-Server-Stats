# BF3 Server Stats

A Next.js dashboard for Battlefield 3 server statistics. The app reads from an
existing BF3 stats database and renders live server state, player leaderboards,
player profiles, chat logs, map and country breakdowns, suspicious-player views,
and ban/moderation information.

This project is built around the database produced by the BF3 Procon stats
logger and extended by AdKats. The companion AdKats source is the LeRoiLambda
fork: https://github.com/leroilambda/adkats.

## Related Projects

- [tyger07/BF3-Server-Stats](https://github.com/tyger07/BF3-Server-Stats) is
  the older PHP BF3 stats webpage for XpKiller's Procon stats logging plugin.
  It is the closest historical reference for this kind of BF3 stats site.
- This project keeps the same general database ecosystem but is a modern
  Next.js/TypeScript implementation with server-rendered pages, React
  components, and optional AdKats moderation data.

## Features

- Live server overview with current map, mode, slot usage, and online state.
- Per-server live scoreboard grouped by team.
- Overall and weekly leaderboards for one server or all active servers.
- Player profiles with score, rank positions, weapon stats, dogtags, and
  moderation status.
- Chat log browsing with search and autocomplete.
- Map and country statistics.
- Suspicious-player and ban views using optional AdKats data when available.
- Health and server-list API endpoints for diagnostics.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- MySQL via `mysql2`
- Recharts
- Zod for runtime environment validation

## Requirements

- Node.js 20 or newer
- npm
- A MySQL database containing the BF3 stats tables produced by the Procon
  stats/mapstats logger
- Optional AdKats tables for bans, moderation records, and policy data
- Network access from the app host to that database

This repository does not include database migrations or seed data. It expects an
existing BF3 stats database, typically populated by the legacy Procon
stats/mapstats logger and extended by the AdKats fork.

## Setup

Install dependencies:

```sh
npm install
```

Create a local environment file:

```sh
cp .env.example .env.local
```

Edit `.env.local` so it points at the BF3 stats database.

Start the development server:

```sh
npm run dev
```

Open http://localhost:3000.

## Environment Variables

The app validates its environment at runtime. Missing or invalid required values
will cause startup or request failures.

| Variable | Description |
| --- | --- |
| `BF3_STATS_DB_HOST` | MySQL host. |
| `BF3_STATS_DB_PORT` | MySQL port. Defaults to `3306`. |
| `BF3_STATS_DB_NAME` | MySQL database name. |
| `BF3_STATS_DB_USER` | MySQL user. |
| `BF3_STATS_DB_PASS` | MySQL password. |
| `BF3_STATS_CLAN_NAME` | Clan or community name. Parsed for runtime config. |
| `BF3_STATS_BANNER_IMAGE` | Public image path for the header banner, for example `/images/bf3-logo.png`. |
| `BF3_STATS_WEEK_TIME_ZONE` | IANA timezone used for weekly leaderboard reset calculations, for example `America/Los_Angeles`. |

## Available Scripts

```sh
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

- `dev` starts the Next.js development server.
- `build` creates a production build.
- `start` serves the production build.
- `lint` runs ESLint.
- `typecheck` runs TypeScript without emitting files.

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Redirects to `/servers`. |
| `/servers` | Chooses the right server landing page based on active servers. |
| `/servers/home` | All-servers live overview. |
| `/servers/[sid]` | Per-server home page with live scoreboard. |
| `/servers/[sid]/leaders` | Per-server leaderboard. |
| `/servers/[sid]/chat` | Per-server chat log search. |
| `/servers/[sid]/maps` | Per-server map and mode stats. |
| `/servers/[sid]/countries` | Per-server country breakdown. |
| `/servers/[sid]/suspicious` | Per-server suspicious-player list. |
| `/servers/[sid]/server` | Per-server aggregate stats and recent rounds. |
| `/servers/[sid]/bans` | Per-server ban and moderation policy view. |
| `/servers/leaders` | All-servers leaderboard. |
| `/players/[pid]` | Player profile, optionally scoped with `?sid=[serverId]`. |

## API Endpoints

| Endpoint | Purpose |
| --- | --- |
| `/api/health` | Checks database connectivity and active server context. |
| `/api/servers` | Returns active server data as JSON. |
| `/api/players/suggest` | Player autocomplete for search fields. |
| `/api/search/chat` | Chat search autocomplete. |

## Project Structure

```text
app/                         Next.js pages and API routes
components/                  Shared React components
components/layout/           Shell, navigation, and UI class helpers
components/search/           Player autocomplete and search widgets
components/stats/            Stats tables, badges, charts, and profile sections
src/server/db/               MySQL pool, health check, and table availability checks
src/server/domain/           BF3 map, mode, weapon, rank, and country helpers
src/server/repositories/     Database query layer
src/server/routing/          Route parameter and section helpers
src/server/utils/            Date and number formatting helpers
public/images/               BF3 images, maps, ranks, weapons, and flags
```

## Database Notes

The expected database is a shared MySQL database used by two Procon plugins:

- The BF3 stats/mapstats logger, which produces the core server, player, chat,
  map, weapon, and current-player tables.
- The LeRoiLambda AdKats fork, which adds bans, moderation records, settings,
  and related player metadata: https://github.com/leroilambda/adkats.

The app queries legacy BF3 stats tables including:

- `tbl_games`
- `tbl_server`
- `tbl_server_stats`
- `tbl_playerdata`
- `tbl_playerstats`
- `tbl_server_player`
- `tbl_currentplayers`
- `tbl_teamscores`
- `tbl_mapstats`
- `tbl_chatlog`
- `tbl_weapons`
- `tbl_weapons_stats`

Some features are optional and are enabled only when their tables exist:

- `tbl_sessions` for weekly leaderboard history
- `tbl_dogtags` for player dogtag sections
- `adkats_bans` and other `adkats_*` tables for ban and moderation data

The repository layer checks optional table availability and returns empty or
unavailable states when those tables are missing.

## Deployment

Build and run the production app:

```sh
npm run build
npm run start
```

The production environment must define the same environment variables and must
be able to connect to the MySQL database.

### Custom Server Startup

This repository uses `server.js` as its Node startup file. It is a custom Next.js
server: it prepares the Next app and passes every request to Next's request
handler.

For hosts that ask for an application startup file, configure it to `server.js`.

The server listens on `process.env.PORT` when the host provides one, and falls
back to `3000` for local/manual runs.

On memory-constrained hosts, building directly on the remote server may fail. In
that case, build locally, archive the build output and runtime files, upload
them, then extract them on the remote host. The remote host still needs
production dependencies and the correct environment variables.

Typical files to upload after a local build:

```text
.next/
public/
package.json
package-lock.json
next.config.ts
server.js
```

Then install production dependencies on the remote host and start the app:

```sh
npm ci --omit=dev
npm run start
```

If your host uses Passenger, restart the application through the host control
panel or by touching the Passenger restart file, usually `tmp/restart.txt`.

## Troubleshooting

- Use `/api/health` to confirm database connectivity and active-server context.
- Use `/api/servers` to inspect which BF3 servers the app considers active.
- Check `.env.local` when startup fails with an environment validation error.
- Confirm `BF3_STATS_WEEK_TIME_ZONE` is a valid IANA timezone.
- If weekly leaderboards, dogtags, bans, or moderation sections are unavailable,
  check whether the optional tables exist in the database.
- If images are missing, verify that the referenced files exist under
  `public/images`.
