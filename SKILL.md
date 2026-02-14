---
name: bun-server
description: Create high-performance web servers using Bun's native HTTP server with JSX/TSX server-side rendering, file-based routing, static assets, and middleware. Use when building APIs, web applications, or full-stack projects with Bun runtime (1.3+). Covers Bun.serve() with routes, cookies, WebSocket support, React SSR via renderToReadableStream, and Docker deployment.
---

# bun-server Skill

Build web servers using Bun's native `Bun.serve()` API with JSX server-side rendering, file-based routing, and static asset handling.

## Required defaults

- Prefer Bun-native APIs and avoid non-Bun substitutes unless the user explicitly asks for another stack.
- Use Bun-native capabilities where possible:
  - `Bun.serve()` for HTTP/WebSocket.
  - `Bun.file` for file I/O.
  - `Bun.$` for shell commands.
  - `Bun.markdown.html()` for markdown rendering.
  - `Bun.redis`, `Bun.sql`, `bun:sqlite` when those stores are used.
- Do not introduce `execa`, `express`, `pg`, `postgres.js`, `ioredis`, `better-sqlite3`, or `ws`.
- Use `loadRoutes` (preferred) for route handlers and keep route files under `src/routes/`.
- Ask the user which routing mode to use before generating route handlers (`loadRoutes` preferred).
- Keep application files modular and helper utilities in `src/utils` as focused methods/files.
- Use JSON payloads for API requests/responses by default; use multipart only for file uploads.
- Serve static assets from `public/assets/{js,css,images}`.
- See `references/creator-routing-and-architecture.md` for additional conventions.

## Quick Start

Copy the starter template from `assets/` folder or initialize manually:

```bash
bun init
bun add react react-dom
bun add -d @types/bun @types/react @types/react-dom
```

Create `src/index.ts`:

```typescript
import { loadRoutes } from '@/utils/loadRoutes';
import { matchRoute, resolveRoute } from '@/utils/loadRoutes';
import staticAssets from '@/utils/staticAssets';
import { resolve } from 'path';
import corsResponse, { corsHeaders } from '@/middleware/cors';

const envPort = process.env.PORT;
const PORT = Number.parseInt(envPort || '3000', 10);
const VALID_PORT = Number.isFinite(PORT) && PORT > 0 && PORT <= 65535 ? PORT : 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

async function startServer() {
  const routes = await loadRoutes('routes');
  const publicAssetsDir = resolve(process.cwd(), 'public', 'assets');
  await Bun.$`mkdir -p ${publicAssetsDir} ${resolve(publicAssetsDir, 'js')} ${resolve(publicAssetsDir, 'css')} ${resolve(publicAssetsDir, 'images')}`;

    const assetHandler = staticAssets({
        assetsPath: 'public/assets',
    });

  const addCors = (response: Response) => {
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders())) {
      headers.set(key, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };

  Bun.serve({
    port: VALID_PORT,
    development: !IS_PRODUCTION,
    routes,

    async fetch(req) {
      if (req.method === 'OPTIONS') {
        return addCors(corsResponse());
      }

      const url = new URL(req.url);
      if (url.pathname.startsWith('/assets/')) {
        const staticResponse = await assetHandler(req);
        if (staticResponse.status !== 404) {
          return addCors(staticResponse);
        }
      }

      const resolved = resolveRoute(routes, req);
      if (resolved) return addCors(await resolved.handler(resolved.request));

      const routeMatch = matchRoute(routes, url.pathname);
      if (routeMatch && req.method === 'HEAD' && routeMatch.handlers.GET) {
        const response = await routeMatch.handlers.GET(
          new Request(req.url, {
            method: 'GET',
            headers: req.headers,
          })
        );
        return addCors(
          new Response(null, {
            status: response.status,
            headers: response.headers,
          })
        );
      }

      if (routeMatch) {
        const allowedMethods = Object.keys(routeMatch.handlers).map((m) => m.toUpperCase());
        if (!allowedMethods.includes('HEAD') && allowedMethods.includes('GET')) {
          allowedMethods.push('HEAD');
        }
        return addCors(
          new Response('Method Not Allowed', {
            status: 405,
            headers: { Allow: [...new Set(allowedMethods)].sort().join(', ') },
          })
        );
      }

      return addCors(new Response('Not Found', { status: 404 }));
    },
  });

  console.log(`Server running at http://localhost:${VALID_PORT}`);
}

startServer().catch(console.error);
```

Run with hot reload: `bun run --hot src/index.ts`

## Project Structure

```
project/
├── src/
│   ├── index.ts              # Server entry point
│   ├── routes/               # File-based route handlers
│   │   ├── index.tsx         # GET /
│   │   └── api/
│   │       └── users/
│   │           ├── index.ts  # GET /api/users
│   │           ├── post.ts   # POST /api/users
│   │           └── $id/      # Dynamic param :id
│   │               ├── index.ts  # GET /api/users/:id
│   │               ├── put.ts    # PUT /api/users/:id
│   │               └── delete.ts # DELETE /api/users/:id
│   ├── middleware/
│   │   └── cors.ts           # CORS middleware
│   ├── ui/
│   │   └── Layout.tsx        # Base layout component
│   └── utils/
│       ├── loadRoutes.ts     # File-based route loader
│       ├── staticAssets.ts   # Static asset handler
│       ├── request.ts        # Request types
│       └── response.ts       # Response helpers
├── public/                   # Static assets
├── tsconfig.json
├── package.json
└── Dockerfile
```

## File-Based Routing

Routes are loaded automatically from `src/routes/` using the route loader in `assets/src/utils/loadRoutes.ts`.

### Route File Naming

| File | HTTP Method | Example |
|------|-------------|---------|
| `index.ts` / `index.tsx` | GET | Handler or React component |
| `post.ts` | POST | Create resource |
| `put.ts` | PUT | Update resource |
| `delete.ts` | DELETE | Delete resource |
| `patch.ts` | PATCH | Partial update |

### Dynamic Parameters

Use `$paramName` folders for dynamic segments:

```
src/routes/api/users/$id/index.ts  →  GET /api/users/:id
src/routes/api/users/$id/put.ts    →  PUT /api/users/:id
```

Access params via `req.params`:

```typescript
// src/routes/api/users/$id/index.ts
import type { RequestWithParams } from '@/utils/request';

export default async (req: RequestWithParams) => {
    const { id } = req.params;
    return Response.json({ id });
};
```

### React Components as Routes

Export a React component as default - the route loader auto-detects and wraps it with SSR:

```tsx
// src/routes/index.tsx
import Layout from '@/ui/Layout';

export default ({ request }: { request: Request }) => (
    <Layout title="Home">
        <h1>Welcome</h1>
    </Layout>
);
```

## Built-in Routes (Alternative)

For simple cases, define routes directly in `Bun.serve()`:

```typescript
serve({
  routes: {
    '/health': Response.json({ status: 'ok' }),
    
    '/api/users': () => Response.json({ users: [] }),
    
    '/api/posts': {
      GET: () => Response.json({ posts: [] }),
      POST: async (req) => {
        const body = await req.json();
        return Response.json({ created: body }, { status: 201 });
      },
    },
  },
});
```

## JSX Server-Side Rendering

Bun natively supports JSX. Use `react-dom/server` for streaming:

```tsx
import { renderToReadableStream } from 'react-dom/server';

const Page = ({ request }: { request: Request }) => (
  <html>
    <head><title>My App</title></head>
    <body>
      <h1>Path: {new URL(request.url).pathname}</h1>
    </body>
  </html>
);

export default async (req: Request) => {
  const stream = await renderToReadableStream(<Page request={req} />);
  return new Response(stream, {
    headers: { 'Content-Type': 'text/html' }
  });
};
```

## Cookies (Bun 1.3+)

```typescript
serve({
  routes: {
    '/login': (req) => {
      req.cookies.set('session', 'abc123', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
      });
      return Response.json({ success: true });
    },
    
    '/profile': (req) => {
      const session = req.cookies.get('session');
      if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      return Response.json({ session });
    },
    
    '/logout': (req) => {
      req.cookies.delete('session');
      return Response.json({ success: true });
    },
  }
});
```

## Static Assets

The `staticAssets` utility in `assets/src/utils/staticAssets.ts` handles static files with proper MIME types and caching.

```typescript
import staticAssets from '@/utils/staticAssets';

const assetHandler = staticAssets({
    assetsPath: 'public/assets',
    urlPrefix: '/assets',
    cacheControl: 'public, max-age=31536000',
});

Bun.serve({
    routes,
    async fetch(req) {
      if (new URL(req.url).pathname.startsWith('/assets/')) {
        const staticResponse = await assetHandler(req);
        if (staticResponse.status !== 404) return staticResponse;
      }
      return new Response('Not Found', { status: 404 });
    },
});
```

See `references/static-assets.md` for CDN integration patterns.

## Response Helpers

Use `assets/src/utils/response.ts` for consistent responses:

```typescript
import response from '@/utils/response';

// Success
return response.json({ user: data });
return response.html('<h1>Hello</h1>');
return response.redirect('/login');
return response.noContent();

// Errors
return response.error('Validation failed', 400, { fields: ['email'] });
return response.notFound('User not found');
return response.unauthorized();
return response.forbidden();
return response.badRequest('Invalid input');
return response.serverError();
```

## CORS Middleware

Use `assets/src/middleware/cors.ts`:

```typescript
import corsResponse, { corsHeaders } from '@/middleware/cors';

// Preflight response
if (req.method === 'OPTIONS') {
    return corsResponse({ origin: 'https://example.com' });
}

// Add headers to response
const headers = corsHeaders({ credentials: true });
```

Default CORS behavior is permissive (`*`) and intended for development; always review/override it for production deployments.

## Request Validation with Zod

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

export default async (req: Request) => {
  const body = await req.json();
  const result = UserSchema.safeParse(body);
  
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }
  
  return Response.json({ user: result.data }, { status: 201 });
};
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "lib": ["ESNext", "DOM"],
    "target": "ESNext",
    "module": "ESNext",
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

## Docker Deployment

```dockerfile
FROM oven/bun AS base
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

USER bun
CMD ["bun", "run", "src/index.ts"]
```

## Starter Template

The `assets/` folder contains a complete starter project:

```
assets/
├── src/
│   ├── index.ts          # Server with file-based routing
│   ├── routes/
│   │   ├── index.tsx     # Home page
│   │   └── api/health/index.ts
│   ├── middleware/cors.ts
│   ├── ui/Layout.tsx
│   └── utils/
│       ├── loadRoutes.ts
│       ├── staticAssets.ts
│       ├── request.ts
│       └── response.ts
├── package.json
├── tsconfig.json
├── Dockerfile
└── .dockerignore
```

Copy and run:

```bash
cp -r assets/* ./my-project/
cd my-project
bun install
bun run dev
```

## References

- `references/file-based-routing.md` - Route loader implementation details
- `references/static-assets.md` - Static asset handling with MIME types and CDN
- `assets/` - Complete starter template
