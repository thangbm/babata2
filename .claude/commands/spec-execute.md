---
description: Implement the next (or a specific) task from an approved specs/<feature-name>/tasks.md, verify it, and check it off
argument-hint: <feature-name> [task-number]
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

Execute one task from `specs/$ARGUMENTS`. Load the `spec-driven-development` skill first.

## Steps

1. Parse `$ARGUMENTS` as `<feature-name> [task-number]`. Read `specs/<feature-name>/tasks.md`; if it's missing, point at `/spec-tasks`. If its status line is not `Approved`, stop and ask (approve now, in this reply, and continue only if the user does).
2. Pick the task: the one matching `task-number` if given, otherwise the first unchecked (`- [ ]`) task in file order. If every task is already checked, say so and stop — nothing to execute.
3. Read that task's cited requirement IDs from `requirements.md` and the relevant section(s) of `design.md` — a task implemented from its one-line description alone, without the design context behind it, tends to drift from what was actually approved.
4. Implement it, using this task's `(tier: ...)` tag to decide who does the work:
   - Single tier (`brain`, `bff`, or `web`) — delegate to the matching subagent (`brain-agent`, `bff-route`, `web-ui`) per the `spec-driven-development` skill's mapping, or do it yourself following that subagent's file if delegating doesn't fit the situation.
   - Multiple tiers — implement `brain` first, then `bff`, then `web`, following the `request-contract` skill if this is a payload shape change, exactly as `design.md`'s data-contracts section should have already flagged.
5. Verify only the tier(s) touched, using that tier's real commands (same as `/check`'s per-app commands) — not a partial or skipped check:
   - `bff`: `cd apps/bff && pnpm test && pnpm lint`
   - `brain`: `cd services/brain && pytest && ruff check .` (activate the venv first)
   - `web`: `cd apps/web && pnpm test && pnpm lint && pnpm build`
6. Only if verification passes, edit `tasks.md` to check the box (`- [x]`) for this task. If it fails, leave the box unchecked, fix the real failure, and re-verify — do not check a box for a task whose verification is failing or was skipped.
7. Stop after this one task. Do not automatically continue to the next task, even if it looks trivial — the user may want to review this change first. Run again (or ask to "execute all remaining tasks") to continue.

## Report

Name the task you executed, the files you changed, and the exact verification output (pass or fail) — not a paraphrase. State whether the box is now checked. If you stopped partway (missing approval, a design gap, a failing test you couldn't fix), say exactly where and why.
