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

export const corsHeaders = (options: CorsOptions = {}): Record<string, string> => {
    const opts = { ...defaultOptions, ...options };

    const origin = Array.isArray(opts.origin) ? opts.origin.join(', ') : opts.origin;

    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': opts.methods!.join(', '),
        'Access-Control-Allow-Headers': opts.headers!.join(', '),
        'Access-Control-Max-Age': String(opts.maxAge),
        ...(opts.credentials && { 'Access-Control-Allow-Credentials': 'true' }),
    };
};

export const corsResponse = (options: CorsOptions = {}) =>
    new Response(null, {
        status: 204,
        headers: corsHeaders(options),
    });

export default corsResponse;
