export interface CorsOptions {
    origin?: string | string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
    maxAge?: number;
}

const defaultOptions: CorsOptions = {
    // Open by default for local development. Review this before production use.
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86400,
};

/**
 * Resolve the Access-Control-Allow-Origin value.
 * The CORS spec only allows a single origin or '*', not a comma-separated list.
 * When multiple origins are configured, match against the request Origin header.
 */
const resolveOrigin = (
    configured: string | string[] | undefined,
    requestOrigin: string | null,
): string => {
    if (!configured) return '*';
    if (typeof configured === 'string') return configured;
    if (requestOrigin && configured.includes(requestOrigin)) return requestOrigin;
    return configured[0] ?? '*';
};

export const corsHeaders = (
    options: CorsOptions = {},
    requestOrigin?: string | null,
): Record<string, string> => {
    const opts = { ...defaultOptions, ...options };
    const origin = resolveOrigin(opts.origin, requestOrigin ?? null);

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': opts.methods!.join(', '),
        'Access-Control-Allow-Headers': opts.headers!.join(', '),
        'Access-Control-Max-Age': String(opts.maxAge),
        ...(origin !== '*' && { Vary: 'Origin' }),
        ...(opts.credentials && { 'Access-Control-Allow-Credentials': 'true' }),
    };
};

export const corsResponse = (
    options: CorsOptions = {},
    requestOrigin?: string | null,
) =>
    new Response(null, {
        status: 204,
        headers: corsHeaders(options, requestOrigin),
    });

export default corsResponse;
