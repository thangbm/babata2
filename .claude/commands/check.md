---
description: Run lint, tests, and typecheck across every app touched by the current diff
argument-hint: "[web|bff|brain|all]  (default: apps with changes)"
allowed-tools: Bash, Read, Glob, Grep, Edit
---

Run the verification suite and fix what breaks.

## Scope

Argument: `$1`. If it names `web`, `bff`, or `brain`, check only that app. If it is `all` or the app has to be inferred, run `git status --short` and check every app with changes; if the tree is clean, check all three.

## Per-app commands

**apps/web**

```sh
cd apps/web && pnpm lint && pnpm test && pnpm build
```

`pnpm build` runs `tsc -b` first, so it is the typecheck too — do not skip it.

**apps/bff**

```sh
cd apps/bff && pnpm lint && pnpm test
```

**services/brain** — activate the venv first (`./.venv/Scripts/activate` on Windows, `source .venv/bin/activate` elsewhere):

```sh
cd services/brain && ruff check . && pytest
```

## Rules

- Run each app's suite even if an earlier one fails — collect the full picture before fixing anything.
- Fix real failures, then re-run only the suite that failed. Do not weaken or skip a test to make it pass; if a test looks wrong, say so and stop.
- Never `git add`, commit, or push from this command.

## Report

One line per app: the app, what ran, pass or fail. If anything failed, quote the actual failing output — not a paraphrase — and state what you changed. If you left something unfixed, say which and why.
