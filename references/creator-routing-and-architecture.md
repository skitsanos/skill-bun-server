# Routing and architecture conventions

- Ask the user which routing mode to use when building handlers.
- Prefer `loadRoutes` and keep handlers under `src/routes/`.
- For non-route modes, clearly ask for explicit `Bun.serve()` routing.
- Default API exchange format should be JSON (`application/json`), except file uploads.
- Keep the app modular: small files and focused utilities in `src/utils`.
