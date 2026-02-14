import { serve } from 'bun';
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

    if (!envPort && process.env.NODE_ENV !== 'production') {
        console.log('PORT env variable not set, using default 3000');
    }

    if (!Number.isFinite(PORT) || PORT <= 0 || PORT > 65535) {
        console.warn(`Invalid PORT "${envPort}", falling back to 3000`);
    }

    const publicAssetsDir = resolve(process.cwd(), 'public', 'assets');
    await Bun.$`mkdir -p ${publicAssetsDir} ${resolve(publicAssetsDir, 'js')} ${resolve(publicAssetsDir, 'css')} ${resolve(publicAssetsDir, 'images')}`;

    // Static assets handler
    const assetHandler = staticAssets({
        assetsPath: 'public/assets',
    });

    const addCors = (response: Response) => {
        const headers = new Headers(response.headers);
        const cors = corsHeaders();
        for (const [key, value] of Object.entries(cors)) {
            headers.set(key, value);
        }
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    };

    serve({
        port: VALID_PORT,
        development: !IS_PRODUCTION,

        routes,

        async fetch(req) {
            // Handle CORS preflight
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
            if (resolved) {
                return addCors(await resolved.handler(resolved.request));
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
                        })
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
                    })
                );
            }

            // 404 fallback
            return addCors(new Response('Not Found', { status: 404 }));
        }
    });

    console.log(`Server running at http://localhost:${VALID_PORT}`);
}

startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
