---
description: Show the phase, approval state, and task progress of one or all specs
argument-hint: "[feature-name]  (default: all specs)"
allowed-tools: Read, Glob, Grep, Bash
---

Report spec status. Read-only.

## Steps

1. `Glob` `specs/*/` for feature folders. If `$ARGUMENTS` names one, report only that one in detail; otherwise report a summary table for all of them (if there are none yet, say so and point at `/spec-create`).
2. For each spec folder, check which of `requirements.md`, `design.md`, `tasks.md` exist, and each existing file's status line (`Draft` vs `Approved (date)`).
3. If `tasks.md` exists, count checked (`- [x]`) vs total tasks.

## Report

**Summary (all specs):** one row per feature — name, furthest phase reached, that phase's approval state, task progress (`3/8` — omit if no `tasks.md` yet).

**Detail (one feature):** the same, plus which specific document (if any) is `Draft` and therefore blocking the next phase, and — if `tasks.md` exists and is approved — the next unchecked task's number and one-line description, i.e. exactly what `/spec-execute <feature-name>` would pick up next.
