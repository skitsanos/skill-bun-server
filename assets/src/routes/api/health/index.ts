export default async (_req: Request) => {
    // Lightweight health check endpoint intended for uptime probes and Docker HEALTHCHECK.
    // Keep this endpoint fast, deterministic, and dependency-light.
    return Response.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
};
