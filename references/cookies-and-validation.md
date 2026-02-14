# Cookies and Request Validation

## Cookies (Bun 1.3+)

Bun's native cookie API is available on the request object inside `Bun.serve()` route handlers.

```typescript
Bun.serve({
  routes: {
    '/login': (req) => {
      req.cookies.set('session', 'abc123', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
      });
      return Response.json({ success: true });
    },

    '/profile': (req) => {
      const session = req.cookies.get('session');
      if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      return Response.json({ session });
    },

    '/logout': (req) => {
      req.cookies.delete('session');
      return Response.json({ success: true });
    },
  }
});
```

## Request Validation with Zod

The starter template includes `zod` as a dependency. Use it for request body validation:

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

export default async (req: Request) => {
  const body = await req.json();
  const result = UserSchema.safeParse(body);

  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  return Response.json({ user: result.data }, { status: 201 });
};
```

For reusable validation, extract schemas into `src/schemas/`:

```
src/schemas/
├── user.ts
├── post.ts
└── index.ts   # re-exports
```
