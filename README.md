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

- Node.js 20.9 or newer
- npm
- A MySQL database containing the BF3 stats tables produced by the Procon
  stats/mapstats logger
- Optional AdKats tables for bans, moderation records, and policy data
- Network access from the app host to that database
- Docker, optionally, for the sample database and the container image

The app reads an existing BF3 stats database, filled by the Procon
stats/mapstats logger and optionally extended by AdKats. It never writes to it.
For development, `sample-db/` holds a small generated database (see
[Sample Database](#sample-database)).

## Setup

Install dependencies and create a local environment file:

```sh
npm install
cp .env.example .env.local
```

`.env.example` points at the sample database. Start it with Docker, then the
development server:

```sh
docker compose up -d db
npm run dev
```

Open http://localhost:3000. To use another BF3 stats database, edit
`.env.local`.

`docker compose up --build` runs the whole stack in Docker instead, with a
production build of the app on http://localhost:3000.

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
| `BF3_STATS_BANNER_IMAGE` | Public image path for the header banner, for example `/images/bf3-logo.png`. |
| `BF3_STATS_WEEK_TIME_ZONE` | IANA timezone used for weekly leaderboard reset calculations, for example `America/Los_Angeles`. |
| `BF3_STATS_LOGGER_TIME_ZONE` | IANA timezone of the machine running Procon, for example `Europe/Paris` or `UTC`. The stats logger stamps rows with that machine's local time. |
| `BF3_STATS_LOGGER_TIME_OFFSET` | The stats logger's "Servertime Offset" setting, in hours. Defaults to `0`. |

## Available Scripts

```sh
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
```

- `dev` starts the Next.js development server.
- `build` creates the production build and its standalone server bundle.
- `start` serves the standalone build.
- `lint` runs ESLint.
- `typecheck` runs TypeScript without emitting files.
- `test` runs the unit tests in `tests/` with Vitest.

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
sample-db/                   Sample database: logger and AdKats tables and data
scripts/                     Build and start helpers for the standalone server
tests/                       Unit tests
```

## Database Notes

The expected database is a MySQL database shared by two Procon plugins:

- The BF3 stats/mapstats logger, which produces the core server, player, chat,
  map, weapon, and current-player tables. It is required.
- AdKats, which adds bans, moderation records, settings, and related player
  metadata. It is optional. The site is developed against the LeRoiLambda fork:
  https://github.com/leroilambda/adkats.

The app reads these stats logger tables:

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

- `tbl_sessions` for weekly leaderboard history. The logger always creates this
  table but only fills it when its "Session ON?" and "Save Sessiondata to DB?"
  settings are enabled; weekly boards count sessions once the player has left.
- `tbl_dogtags` for player dogtag sections
- `adkats_bans`, `adkats_records_main`, `adkats_commands`, `adkats_settings`
  and the `adkats_infractions_*` tables for bans, moderation details, infraction
  points and the punishment ladder. Upstream AdKats creates them too.
- `adkats_maplist` for the map rotation carousel. Only the LeRoiLambda AdKats
  fork creates it; without it the server page shows the live map alone.
- `tbl_chatlog.logPlayerID`, which AdKats adds, to link chat lines to players.
  Without it, chat speakers are matched to players by name.

The repository layer checks optional table availability and returns empty or
unavailable states when those tables are missing.

## Sample Database

`sample-db/` holds a small generated database in the logger's and AdKats'
table layouts:

- `01-logger-schema.sql` and `02-adkats-schema.sql` create the tables.
- `03-logger-data.sql` and `04-adkats-data.sql` fill them with three servers
  (one hidden with `ConnectionState` 'off'), about 260 players, recent rounds,
  sessions and chat, and a few bans, mutes and punishments.

Times are relative to when the files are loaded and written in UTC, so the
live, weekly and moderation views have current data after each load; the site
needs `BF3_STATS_LOGGER_TIME_ZONE=UTC` for them. Loading only the two logger
files gives a database without AdKats.

`docker compose up -d db` serves the sample database on port 3307. It lives in
memory and is loaded again on every start. To load it into another MySQL or
MariaDB server, create an empty database and run the files in order:

```sh
mysql -u root -p bf3_stats < sample-db/01-logger-schema.sql
mysql -u root -p bf3_stats < sample-db/02-adkats-schema.sql
mysql -u root -p bf3_stats < sample-db/03-logger-data.sql
mysql -u root -p bf3_stats < sample-db/04-adkats-data.sql
```

## Deployment

`npm run build` produces a self-contained server in `.next/standalone`: the
compiled app, `server.js`, the `node_modules` it needs, `public/` and the
static assets. It runs with Node.js alone:

```sh
npm run build
npm run start
```

`npm run start` loads the same `.env` files as `next start`
(`.env.production.local`, `.env.local`, `.env.production` and `.env`), then
starts `.next/standalone/server.js`. The server listens on `PORT` (default
`3000`) and `HOSTNAME` (default `0.0.0.0`).

### Docker

The `Dockerfile` builds an image that runs the standalone server as the
unprivileged `node` user on port 3000, with a health check on `/api/health`:

```sh
docker build -t bf3-server-stats .
docker run -p 3000:3000 --env-file .env.production bf3-server-stats
```

`--env-file` takes plain `NAME=value` lines, as in `.env.example`.

### Node.js hosts and Passenger

To run the app without the repository, copy the contents of
`.next/standalone` to the host and start `node server.js`. On hosts that ask
for an application startup file (Passenger, cPanel), set it to `server.js`,
then restart the application from the control panel or by touching
`tmp/restart.txt`.

Set the environment variables through the host, or in a `.env.production`
file next to `server.js`, which the server loads at startup.

The bundle includes platform-specific binaries (`sharp`, which optimizes
images), so build it for the host's operating system and CPU architecture:
Linux x64 for most hosts. Docker can build it for Linux x64 on any machine
and write it to `dist/`:

```sh
docker build --platform linux/amd64 --target bundle --output dist .
```

## Troubleshooting

- Use `/api/health` to confirm database connectivity and active-server context.
- Use `/api/servers` to inspect which BF3 servers the app considers active.
- Check `.env.local` when startup fails with an environment validation error.
- Confirm `BF3_STATS_WEEK_TIME_ZONE` and `BF3_STATS_LOGGER_TIME_ZONE` are valid
  IANA timezones.
- If the weekly leaderboard or chat searches such as "today" are off by some
  hours, check `BF3_STATS_LOGGER_TIME_ZONE` and `BF3_STATS_LOGGER_TIME_OFFSET`
  against the Procon host and the logger's settings.
- If weekly leaderboards, dogtags, bans, or moderation sections are unavailable,
  check whether the optional tables exist in the database.
- If images are missing, verify that the referenced files exist under
  `public/images`.
