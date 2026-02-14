const response = {
    json: <T>(data: T, status = 200) =>
        Response.json(data, { status }),

    error: (message: string, status = 400, details?: any) =>
        Response.json({ error: { message, ...details } }, { status }),

    html: (content: string, status = 200) =>
        new Response(content, {
            status,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }),

    text: (content: string, status = 200) =>
        new Response(content, {
            status,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }),

    redirect: (url: string, status: 301 | 302 | 303 | 307 | 308 = 302) =>
        Response.redirect(url, status),

    noContent: () =>
        new Response(null, { status: 204 }),

    notFound: (message = 'Not Found') =>
        Response.json({ error: { message } }, { status: 404 }),

    unauthorized: (message = 'Unauthorized') =>
        Response.json({ error: { message } }, { status: 401 }),

    forbidden: (message = 'Forbidden') =>
        Response.json({ error: { message } }, { status: 403 }),

    badRequest: (message = 'Bad Request', details?: any) =>
        Response.json({ error: { message, ...details } }, { status: 400 }),

    serverError: (message = 'Internal Server Error') =>
        Response.json({ error: { message } }, { status: 500 }),
};

export default response;
