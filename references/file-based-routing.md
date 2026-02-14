# File-Based Routing

`loadRoutes` scans `src/routes/` and builds Bun route maps for `Bun.serve()`.
The `bun-server` template prefers this mode and asks for the user’s routing method choice before generating code.

## Conventions

- Route directory is relative to `src/` (`loadRoutes('routes')`).
- File-based handler filenames map to HTTP methods:
  - `index.ts`/`index.tsx` → `GET`
  - `get.ts` → `GET`
  - `post.ts` → `POST`
  - `put.ts` → `PUT`
  - `delete.ts` → `DELETE`
  - `patch.ts` → `PATCH`
  - `options.ts` → `OPTIONS`
  - `head.ts` → `HEAD`
- Folder names starting with `$` become path parameters (`$id` → `:id`).
- Only files ending in `.ts/.tsx/.js/.jsx` are loaded.
- Files prefixed with `_` (e.g., `_helpers.ts`) are ignored and can be used for shared utilities within route directories.
- `index.tsx` can export a React component and is rendered server-side via `renderToReadableStream(...)`.

## Route loading shape

The loader resolves files into a nested route map:

```ts
type RouteHandlers = Record<string, (req: Request) => Promise<Response> | Response>;
type Routes = Record<string, RouteHandlers>;
```

If a route supports multiple methods, its path maps to an object of handlers:

```ts
{
  '/api/users': {
    GET: [Function],
    POST: [Function],
  },
}
```

## Minimal loader flow

```ts
import { readdirSync } from 'fs';
import { basename, join, relative } from 'path';
import { pathToFileURL } from 'url';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

const routePathFromDir = (rootDir: string, dirPath: string) =>
  '/' +
  relative(rootDir, dirPath)
    .split(/[/\\]/)
    .filter(Boolean)
    .map((segment) =>
      segment.startsWith('$') ? `:${segment.substring(1)}` : segment
    )
    .join('/');

async function processFile(filePath: string, fileName: string) {
  const method = basename(fileName).replace(/\..+$/, '').toUpperCase();
  const module = await import(pathToFileURL(filePath).href);
  const defaultExport = module.default;

  if (!defaultExport) return null;
  if (method === 'INDEX' || HTTP_METHODS.includes(method)) {
    return [method === 'INDEX' ? 'GET' : method, defaultExport];
  }
  return null;
}
```

`createReactHandler` wraps React default exports into a `Response` stream when needed, passing `{ request: req }` as props.

The actual implementation also logs skipped invalid files and catches import/render errors.

## Path matching for dynamic segments

- `matchPath` normalizes both route and request path.
- Segments are compared one-by-one.
- Dynamic segments are extracted and attached to `req.params` when a route is resolved.
- For `loadRoutes` handlers, the loader passes a request clone containing params:

```ts
import type { RequestWithParams } from '@/utils/request';

// src/routes/api/users/$id/index.ts
export default async (req: RequestWithParams) => {
  const userId = req.params.id;
  return Response.json({ userId });
};
```

## 405 and HEAD behavior

The starter `fetch` pipeline handles cases not directly covered by Bun route handlers:

- If a route exists for a path and method is unsupported → `405 Method Not Allowed`.
- If method is `HEAD` and `GET` exists → execute `GET` and return headers-only.

This logic is documented in `assets/src/index.ts`.

## Recommended request mode

Use `loadRoutes` when the project is route-file oriented.  
Only use inline `Bun.serve({ routes: { ... } })` for quick prototypes or very small apps.
