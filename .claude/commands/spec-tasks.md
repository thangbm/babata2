---
description: Write specs/<feature-name>/tasks.md from an approved design.md, and stop for approval
argument-hint: <feature-name>
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

Write the task list for `specs/$ARGUMENTS/`. Load the `spec-driven-development` skill first.

## Steps

1. Read `specs/$ARGUMENTS/design.md`. If it's missing, point at `/spec-design`. If its status line is not `Approved`, stop and ask (approve now, in this reply, and continue only if the user does).
2. Also read `specs/$ARGUMENTS/requirements.md` — tasks cite requirement IDs, not design section names.
3. Write `specs/$ARGUMENTS/tasks.md` as a flat, numbered checklist:

```markdown
# Tasks — <feature-name>

> Status: **Draft** — awaiting approval

- [ ] 1. <one discrete, independently-testable coding action> (tier: brain) — Requirements: 1.1, 1.2
  - <a line or two of implementation detail if it's not obvious from the design>
- [ ] 2. <...> (tier: bff) — Requirements: 1.1
- [ ] 3. <...> (tier: web) — Requirements: 2.1
```

   Rules for good tasks:
   - Each task is small enough to implement and verify in one sitting, and touches exactly one tier — tag it `(tier: brain|bff|web)`. A task that genuinely needs more than one tier gets a compound tag `(tier: brain, bff)` and is understood to be implemented brain-first, per the `spec-driven-development` skill's tier ordering — prefer splitting it into single-tier tasks instead, when the split is natural.
   - Order tasks so dependencies come first: a `brain` change before the `bff` task that forwards its new field, a new component before the task that wires it into a page.
   - Every task cites at least one requirement ID from `requirements.md`. A task with no requirement behind it is scope creep — cut it or ask the user whether it belongs in this spec at all.
   - Include the test-writing for a task inside that same task, not as a separate trailing task — the tier subagents already treat tests as part of the change, not an afterthought.
   - Do not invent file paths or APIs that contradict what `design.md` said; if writing tasks reveals a gap in the design, stop and say so instead of quietly improvising.

4. Stop. Show the task list and ask for approval or changes — do not start `/spec-execute` in the same turn.

## Report

State the task count, how many distinct tiers are involved, and ask explicitly whether the list is approved.
