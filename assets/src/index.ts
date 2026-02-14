import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { loadRoutes, resolveRoute, matchRoute } from '@/utils/loadRoutes';
import staticAssets from '@/utils/staticAssets';
import corsResponse, { corsHeaders } from '@/middleware/cors';

const envPort = process.env.PORT;
const PORT = Number.parseInt(envPort || '3000', 10);
const VALID_PORT =
    Number.isFinite(PORT) && PORT > 0 && PORT <= 65535 ? PORT : 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

async function startServer() {
    // Load file-based routes
    const routes = await loadRoutes('routes');

    if (!envPort && !IS_PRODUCTION) {
        console.log('PORT env variable not set, using default 3000');
    }

    if (!Number.isFinite(PORT) || PORT <= 0 || PORT > 65535) {
        console.warn(`Invalid PORT "${envPort}", falling back to 3000`);
    }

    const publicAssetsDir = resolve(process.cwd(), 'public', 'assets');
    for (const sub of ['js', 'css', 'images']) {
        mkdirSync(resolve(publicAssetsDir, sub), { recursive: true });
    }

    // Static assets handler
    const assetHandler = staticAssets({
        assetsPath: 'public/assets',
    });

    const addCors = (response: Response, requestOrigin: string | null) => {
        const headers = new Headers(response.headers);
        const cors = corsHeaders({}, requestOrigin);
        for (const [key, value] of Object.entries(cors)) {
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

        async fetch(req) {
            const origin = req.headers.get('Origin');

            // Handle CORS preflight
            if (req.method === 'OPTIONS') {
                return corsResponse({}, origin);
            }

            const url = new URL(req.url);
            if (url.pathname.startsWith('/assets/')) {
                const staticResponse = await assetHandler(req);
                if (staticResponse.status !== 404) {
                    return addCors(staticResponse, origin);
                }
            }

            const resolved = resolveRoute(routes, req);
            if (resolved) {
                return addCors(await resolved.handler(resolved.request), origin);
            }

            const routeMatch = matchRoute(routes, url.pathname);
            if (routeMatch) {
                if (req.method === 'HEAD' && routeMatch.handlers.GET) {
                    const response = await routeMatch.handlers.GET(
                        new Request(req.url, { method: 'GET', headers: req.headers })
                    );
                    return addCors(
                        new Response(null, {
                            status: response.status,
                            headers: response.headers,
                        }),
                        origin,
                    );
                }

                const allowedMethods = Object.keys(routeMatch.handlers)
                    .map((m) => m.toUpperCase())
                    .sort();
                if (allowedMethods.includes('GET') && !allowedMethods.includes('HEAD')) {
                    allowedMethods.push('HEAD');
                }

                return addCors(
                    new Response('Method Not Allowed', {
                        status: 405,
                        headers: {
                            Allow: allowedMethods.join(', '),
                        },
                    }),
                    origin,
                );
            }

            // 404 fallback
            return addCors(new Response('Not Found', { status: 404 }), origin);
        }
    });

    console.log(`Server running at http://localhost:${VALID_PORT}`);
}

startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
