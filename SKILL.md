---
name: bun-server
description: Create high-performance web servers using Bun's native HTTP server with JSX/TSX server-side rendering, file-based routing, static assets, and middleware. Use when building APIs, web applications, or full-stack projects with Bun runtime (1.3+). Covers Bun.serve() with routes, cookies, WebSocket support, React SSR via renderToReadableStream, Docker deployment, and file-based route loading from a directory tree.
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
- Ask the user which routing mode to use before generating route handlers (`loadRoutes` preferred). For non-route modes, clearly ask for explicit `Bun.serve()` routing.
- Default API exchange format is JSON (`application/json`); use multipart only for file uploads.
- Keep application files modular: small files and focused utilities in `src/utils`.
- Serve static assets from `public/assets/{js,css,images}`.

## Quick Start

When bootstrapping a new project, generate files matching the structure in `assets/`. Initialize with:

```bash
bun init
bun add react react-dom zod
bun add -d @types/bun @types/react @types/react-dom
```

Use the reference code in `assets/src/` as the canonical source for:
- `src/index.ts` — Server entry point wiring file-based routing, static assets, and CORS
- `src/utils/loadRoutes.ts` — File-based route loader
- `src/utils/staticAssets.ts` — Static asset handler
- `src/utils/response.ts` — Response helpers
- `src/utils/request.ts` — Request types
- `src/middleware/cors.ts` — CORS middleware
- `src/ui/Layout.tsx` — Base HTML layout component

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
├── public/assets/            # Static assets (js/, css/, images/)
├── tsconfig.json
├── package.json
└── Dockerfile
```

## File-Based Routing

Routes are loaded automatically from `src/routes/` using `loadRoutes` (reference implementation in `assets/src/utils/loadRoutes.ts`). See `references/file-based-routing.md` for full implementation details.

### Route File Naming

| File | HTTP Method | Example |
|------|-------------|---------|
| `index.ts` / `index.tsx` | GET | Handler or React component |
| `post.ts` | POST | Create resource |
| `put.ts` | PUT | Update resource |
| `delete.ts` | DELETE | Delete resource |
| `patch.ts` | PATCH | Partial update |

Files prefixed with `_` (e.g., `_helpers.ts`) are ignored by the route loader and can be used for shared utilities within route directories.

### Dynamic Parameters

Use `$paramName` folders for dynamic segments:

```
src/routes/api/users/$id/index.ts  →  GET /api/users/:id
src/routes/api/users/$id/put.ts    →  PUT /api/users/:id
```

Access params via `req.params`:

```typescript
import type { RequestWithParams } from '@/utils/request';

export default async (req: RequestWithParams) => {
    const { id } = req.params;
    return Response.json({ id });
};
```

### React Components as Routes

Export a React component as default — the route loader auto-detects and wraps it with SSR:

```tsx
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
Bun.serve({
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

## Static Assets

The `staticAssets` utility (reference implementation in `assets/src/utils/staticAssets.ts`) handles static files with proper MIME types, caching, and path-traversal protection. See `references/static-assets.md` for full API and CDN integration patterns.

```typescript
import staticAssets from '@/utils/staticAssets';

const assetHandler = staticAssets({ assetsPath: 'public/assets' });
```

Wire it into `fetch` to intercept `/assets/*` requests before route matching.

## Response Helpers

Use the response helper (reference implementation in `assets/src/utils/response.ts`) for consistent responses:

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

Use the CORS middleware (reference implementation in `assets/src/middleware/cors.ts`):

```typescript
import corsResponse, { corsHeaders } from '@/middleware/cors';

const origin = req.headers.get('Origin');

if (req.method === 'OPTIONS') {
    return corsResponse({ origin: 'https://example.com' }, origin);
}

const headers = corsHeaders({ credentials: true }, origin);
```

When multiple origins are configured as an array, the middleware matches the request `Origin` header against the list and returns the matching one (per CORS spec, `Access-Control-Allow-Origin` only supports a single origin or `*`). A `Vary: Origin` header is added automatically when the response is origin-specific.

Default CORS is permissive (`*`) for development; review/override for production.

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "lib": ["ESNext", "DOM"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}
```

## References

- `references/file-based-routing.md` — Route loader implementation, path matching, 405/HEAD behavior
- `references/static-assets.md` — Static asset handler API, MIME types, CDN integration
- `references/cookies-and-validation.md` — Bun cookie API and Zod request validation patterns
- `references/docker-deployment.md` — Dockerfile, build stages, health check, .dockerignore
- `assets/` — Reference implementation (canonical source code for bootstrapping new projects)
