# Docker Deployment

The starter template in `assets/` includes a production-ready `Dockerfile` and `.dockerignore`.

## Dockerfile

```dockerfile
FROM oven/bun:latest AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun fetch http://localhost:3000/api/health || exit 1

USER bun
CMD ["bun", "run", "start"]
```

### Build stages

1. **base** - `oven/bun:latest` with `/app` workdir.
2. **deps** - Install production dependencies with frozen lockfile.
3. **runner** - Copy deps and source, run as non-root `bun` user.

### Build and run

```bash
docker build -t my-app .
docker run --rm -p 3000:3000 my-app
```

### Health check

The built-in HEALTHCHECK hits `GET /api/health` every 30s. Override the endpoint or intervals as needed for your deployment.

### .dockerignore

The template `.dockerignore` excludes `.git`, `node_modules`, lockfiles, env files, IDE configs, and logs to keep the build context small.
