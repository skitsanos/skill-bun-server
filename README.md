# bun-server

This repository contains an Agent skill (`SKILL.md`) and a copyable Bun starter template in `assets/`.

## Contents

- `SKILL.md` - Skill instructions and constraints.
- `references/` - Routing and static-asset guidance used by the skill.
- `assets/` - A runnable Bun starter app scaffold.

## Quick start (starter template)

```bash
cd assets
bun install
bun run dev
```

Open:
- `http://localhost:3000`
- `http://localhost:3000/api/health`

For production run:

```bash
bun run start
```

## Assets and routes

- Static files are served from `public/assets/{js,css,images}`.
- Route handlers are file-based under `src/routes/` using `loadRoutes` conventions.
- JSON is the default API exchange format; multipart is expected only for file uploads.

## Docker (template)

The `assets/Dockerfile` defines a Bun production image with:

1. `oven/bun` base image.
2. Dependency install stage (`bun install --frozen-lockfile --production`).
3. `.dockerignore` trimmed build context for smaller/faster builds.
4. Runtime stage running `bun run start` as `USER bun`.

Build and run:

```bash
docker build -t bun-server -f assets/Dockerfile assets/
docker run --rm -p 3000:3000 bun-server
```

### Health check behavior

The `assets/Dockerfile` includes a container health check:

- `GET http://localhost:3000/api/health`
- Interval: `30s`, timeout: `5s`, start period: `10s`, retries: `3`

You can override these values and/or endpoint when running custom builds.

## File layout in `assets/`

```text
assets/
├── src/
│   ├── index.ts
│   ├── routes/
│   ├── middleware/
│   ├── ui/
│   └── utils/
├── public/
├── Dockerfile
├── package.json
├── tsconfig.json
└── bun.lock
```
