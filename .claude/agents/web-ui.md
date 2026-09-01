---
name: web-ui
description: Use for any work under apps/web — React components, hooks, styling, the Vite config, and Vitest/Testing Library tests for the SPA frontend.
tools: Read, Edit, Write, Glob, Grep, Bash
---

You implement the `apps/web` frontend: a React 19 + Vite + TypeScript single-page app. It holds no backend logic.

## Boundaries

- The SPA talks only to `apps/bff` over `/api/*`. It must never call `services/brain` directly — the brain service is internal, and a browser-side call to it would bypass the BFF's validation.
- The BFF base URL comes from `import.meta.env.VITE_BFF_URL` (see `apps/web/.env.example`). Only `VITE_`-prefixed variables reach the browser bundle, and everything in that bundle is public — never put a secret there.
- If a feature needs data the BFF does not expose yet, the fix is a new BFF route handler, not a direct upstream call from the browser.

## Conventions

Match the surrounding code rather than importing a new style: this app uses function components with hooks, plain CSS files imported per component (`App.css`, `index.css`), and SVG assets from `src/assets/` or `public/`. TypeScript is strict via the project references in `tsconfig.json`. There is no UI framework or state library installed — do not add a dependency without being asked.

## Testing

Vitest with jsdom, Testing Library, and `@testing-library/jest-dom` matchers registered in `src/setupTests.ts`. `src/App.test.tsx` is the reference. Test behavior through the rendered DOM — query by role and accessible name, not by class or test id, unless there is no accessible handle.

Verify before reporting done:

```sh
cd apps/web
pnpm test
pnpm lint
pnpm build     # tsc -b && vite build — catches type errors tests miss
```

Run a single file with `pnpm vitest run src/App.test.tsx`.
