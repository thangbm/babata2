---
name: react-development
description: React 19 patterns and best practices for writing or reviewing components, hooks, and state logic in apps/web (or any React code in this repo). Use whenever adding a component, hook, form, or data-fetching logic — not just when something looks broken.
---

# React development (React 19, Vite SPA)

`apps/web` is a plain Vite + React 19 + TypeScript SPA — no framework router, no Server Components, no React Compiler configured (`apps/web/vite.config.ts` only runs `@vitejs/plugin-react`; `apps/web/eslint.config.js` has no `eslint-plugin-react-compiler`). Everything below assumes that context: recommendations that only make sense under Next.js/RSC are called out as such and skipped otherwise. For this app's ownership boundaries (BFF-only calls, testing setup, file conventions) see the `web-ui` agent — this skill is the coding-pattern reference it and any component work should follow.

## Component structure

- Function components only. Props typed with an `interface` or `type`, never `React.FC` — it adds an implicit `children` and fights generics for no benefit.
- Keep components small enough that their JSX reads without scrolling; split out a subcomponent when a block of markup needs its own name to explain itself, not on a line-count rule.
- Derive values during render instead of storing them in state. If a value can be computed from props or existing state, computing it is fewer bugs than a second `useState` that can drift out of sync — see "Effects" below for the same principle applied to `useEffect`.

## React 19 features — use these, not the old workarounds

- **`ref` as a normal prop.** Function components accept `ref` directly now; `forwardRef` is unnecessary for new code (it's deprecated as of 19, still works, but don't reach for it).
- **Context as a provider.** Render `<MyContext value={...}>` directly — `<MyContext.Provider value={...}>` is legacy syntax, still supported, but write new context around the plain form.
- **`use(promise)` / `use(context)`.** `use` reads a context or unwraps a promise conditionally (inside an `if`, after an early return) — something hooks can never do. Use it for reading context conditionally or for consuming a promise handed down from a parent inside `<Suspense>`. It does not replace `useEffect`-based fetching on its own; something upstream still has to produce the promise (a router loader, a query library, or a cache you control) — don't call a fetch function inline in render on every pass expecting `use` to dedupe it for you.
- **Actions for form/mutation state.** `useActionState(action, initialState)` replaces the hand-rolled "call async function, track pending/error state in three separate `useState`s" pattern for anything that submits data. `useFormStatus` reads the pending state of an ancestor `<form>` from a child component without prop drilling. `useOptimistic` shows an optimistic value while a submission is in flight and reverts on failure. Reach for these for forms and mutations; don't keep writing manual `isSubmitting`/`error`/`data` triads for a plain form submit.
- **Metadata tags in render.** `<title>`, `<meta>`, `<link>` can be rendered directly from any component; React hoists them to `<head>`. No `react-helmet`-style library needed for a component-local `<title>`.
- **Cleanup functions from refs.** A ref callback may return a cleanup function, called when the element unmounts or the ref changes — parallel to effect cleanup, useful for ref-based subscriptions/observers without an effect at all.

## Hooks

- Obey the two rules (top level only, only from components/hooks) — the `react-hooks` ESLint plugin (already wired into `apps/web/eslint.config.js`) enforces this; do not disable its rule to unblock a diff.
- Extract a custom hook when the same stateful logic (subscription, derived state, imperative escape hatch) is needed in more than one component, or when a component's body is dominated by wiring that has nothing to do with what it renders. Name it `useX`; return a small, deliberate shape (a tuple for a get/set pair, an object for anything larger).
- Prefer `useReducer` over a cluster of related `useState` calls once updates start depending on each other (one setter's new value needs another's current value) — a reducer makes the transition explicit and testable in isolation from any component.

## Effects — the part most misused

`useEffect` is for synchronizing with something outside React (the DOM, a subscription, a non-React widget, browser APIs) — not a general-purpose "run this after render" hook. Before writing one, check whether it is actually needed:

- **Computing a value from props/state** → don't use an effect; compute it during render. An effect that calls `setState` from data already available during render causes an extra render for nothing.
- **Resetting state when a prop changes** → prefer a `key` prop that remounts the component over an effect that watches the prop and calls `setState`.
- **Responding to a user event** (a click, a submission) → put the logic in the event handler, not in an effect that fires on a state change the handler just made. An effect can't tell *why* the state changed, so it reacts to every cause including ones you didn't intend.
- **Fetching data on mount** → this is a legitimate effect use in a plain SPA with no framework loader, but needs a cleanup/ignore flag to avoid a race when the component re-fetches before the first request resolves (or before it unmounts):

  ```tsx
  useEffect(() => {
    let ignore = false
    fetchThing(id).then((data) => {
      if (!ignore) setData(data)
    })
    return () => {
      ignore = true
    }
  }, [id])
  ```

  If this pattern is showing up in more than one or two components, that's the signal to introduce a small fetching abstraction (a hook wrapping the pattern, or a query library) rather than copy it further.
- Always return a cleanup function for anything that subscribes, listens, or opens (event listeners, timers, observers, sockets) — an effect without matching cleanup is a leak the moment the component using it mounts more than once (React 19's Strict Mode still mounts effects twice in development specifically to surface this).

## Performance

- Don't reach for `useMemo`/`useCallback`/`React.memo` by default — they add code and a dependency array to get wrong. Add them when profiling (React DevTools Profiler) shows an actual expensive render or when a value/callback's referential identity matters for a child wrapped in `memo` or a `useEffect` dependency array.
- The [React Compiler](https://react.dev/learn/react-compiler) automates most of that memoization at build time and is the recommended direction for new React 19 projects, but it is not wired into this repo yet (no `eslint-plugin-react-compiler`, no Babel/Vite plugin configured) — don't assume it's running. If the team decides to adopt it, that's a `vite.config.ts` + ESLint plugin change to propose explicitly, not something to rely on silently.
- Prefer moving state down (colocating it in the smallest component that needs it) over hoisting it up "just in case" — state lifted higher than necessary re-renders more of the tree on every update.

## TypeScript

- Type props with a named `interface ComponentNameProps`. Prefer a discriminated union over multiple optional fields when a component has mutually exclusive variants (e.g. `{ variant: 'link'; href: string } | { variant: 'button'; onClick: () => void }`) — it makes invalid combinations unrepresentable instead of merely undocumented.
- Type event handlers with React's own event types (`React.ChangeEvent<HTMLInputElement>`, `React.FormEvent<HTMLFormElement>`) rather than `any` or a hand-rolled shape.
- Avoid `React.FC`; type `children` explicitly as `React.ReactNode` when a component accepts it.

## Accessibility

- Use semantic elements (`button`, `nav`, `label`, `ul`/`li`) before reaching for `div`/`span` + ARIA — a native element gets keyboard and screen-reader behavior for free that an ARIA-decorated `div` has to reimplement correctly.
- Every interactive element needs a visible or accessible name (text content, `aria-label`, or an associated `<label>`) — this is also what makes the "Testing" guidance below possible, since Testing Library queries by accessible role and name.
- Manage focus explicitly for anything that changes what's on screen without a navigation (opening a modal, showing an error banner) — don't leave focus stranded on a now-hidden element.

## Testing

Match the `web-ui` agent's existing convention: Vitest + Testing Library, querying by role and accessible name rather than test IDs or class names, since that's what proves the accessibility guidance above is actually true rather than assumed. Test what the user can observe (rendered text, an element's presence, a callback firing on interaction) — not a component's internal state or its implementation detail of which hook holds what.

## Anti-patterns to flag in review

- An effect whose only job is to call `setState` from a value already computable during render.
- Props drilled through three or more components untouched — a sign the state belongs in context or the intermediate components shouldn't need to know about it at all.
- Array index used as a list `key` for a list that can reorder, filter, or have items inserted — use a stable id from the data instead; an index key causes React to misattribute state across items when the list changes shape.
- `useEffect` with a missing or suppressed dependency (an inline `// eslint-disable-next-line react-hooks/exhaustive-deps`) — this almost always hides a real bug (a stale closure) rather than a false positive; fix the dependency or restructure the effect instead of silencing the lint rule.
