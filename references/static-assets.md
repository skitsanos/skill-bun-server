# Static Assets

`staticAssets` is implemented in `assets/src/utils/staticAssets.ts` and returns an async request handler that serves files from disk.

- Default directory: `public/assets`
- Default URL prefix: `/assets`
- Default cache header: `public, max-age=31536000, immutable`
- Path traversal safety checks are enforced (`..`, malformed encodings, separator characters in segments).

## Signature

```ts
staticAssets({
  assetsPath?: string;
  urlPrefix?: string;
  cacheControl?: string;
}): (req: Request) => Promise<Response>
```

```ts
import staticAssets from '@/utils/staticAssets';

const assetHandler = staticAssets({
  assetsPath: 'public/assets',
  urlPrefix: '/assets',
  cacheControl: 'public, max-age=31536000',
});
```

## Fetch integration

Static assets are wired in `fetch` because only `/assets/*` should be intercepted and everything else should continue through normal route handling.

```ts
import { loadRoutes, matchRoute, resolveRoute } from '@/utils/loadRoutes';

const routes = await loadRoutes('routes');

Bun.serve({
  port: 3000,
  routes,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    if (pathname.startsWith('/assets/')) {
      const staticResponse = await assetHandler(req);
      if (staticResponse.status !== 404) return staticResponse;
    }

    const resolved = resolveRoute(routes, req);
    if (resolved) return resolved.handler(resolved.request);

    const match = matchRoute(routes, pathname);
    if (match && req.method === 'HEAD' && match.handlers.GET) {
      const response = await match.handlers.GET(new Request(req.url, { method: 'GET', headers: req.headers }));
      return new Response(null, { status: response.status, headers: response.headers });
    }

    if (match) {
      const methods = Object.keys(match.handlers).map((m) => m.toUpperCase());
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: methods.join(', ') } });
    }

    return new Response('Not Found', { status: 404 });
  },
});
```

## MIME + headers produced

- `Content-Type` from extension map
- `Content-Length`
- `Cache-Control`
- `Accept-Ranges: bytes`

Missing, malformed, or unsafe paths return:

- `404` for unknown/forbidden files
- `400` for malformed encoded path segments

## CDN behavior

Keep asset URLs absolute to your CDN when `CDN_URL` is set, but continue to serve from `/assets/*` in development.

```ts
const CDN_URL = process.env.CDN_URL || '';
// Example:
// <img src={`${CDN_URL}/assets/images/logo.png`} />
```

## Directory layout

```
public/
└── assets/
    ├── js/
    ├── css/
    └── images/
```
