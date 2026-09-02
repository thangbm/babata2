---
description: Start a new feature spec — writes specs/<feature-name>/requirements.md in EARS format and stops for approval
argument-hint: <feature-name> <description of the feature>
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

Create a new spec for: `$ARGUMENTS`. The first word (or a kebab-case slug you derive from it if it isn't already one) is the feature name; the rest is the description to spec out. If the description is missing or too thin to write real acceptance criteria from, ask before writing anything.

Load the `spec-driven-development` skill first — it defines the approval gate and file layout this command relies on.

## Steps

1. Check whether `specs/<feature-name>/` already exists. If it does, stop and point at it (and `/spec-status`) instead of overwriting — creating is only for a feature with no spec yet.
2. Before writing anything, ground the requirements in the real system: `Glob`/`Grep` `apps/web/src/`, `apps/bff/src/`, and `services/brain/app/` for anything already related to this feature (an existing endpoint, model, or component it extends or conflicts with). A requirement that contradicts what the code already does is worse than no requirement.
3. Write `specs/<feature-name>/requirements.md`:

```markdown
# Requirements — <feature-name>

> Status: **Draft** — awaiting approval

## Introduction

<2-4 sentences: what this feature is, why it's needed, which tier(s) it likely touches.>

## Requirements

### Requirement 1: <short name>

**User Story:** As a <role>, I want <capability>, so that <benefit>.

#### Acceptance Criteria

1. WHEN <trigger> THE <system> SHALL <observable response>
2. IF <error/edge condition> THEN THE <system> SHALL <observable response>

### Requirement 2: <short name>

...
```

   Use EARS syntax for every acceptance criterion — it's what keeps a criterion testable instead of vague:

   | Pattern | Form |
   | --- | --- |
   | Ubiquitous | THE `<system>` SHALL `<response>` |
   | Event-driven | WHEN `<trigger>` THE `<system>` SHALL `<response>` |
   | State-driven | WHILE `<state>` THE `<system>` SHALL `<response>` |
   | Unwanted behavior | IF `<condition>` THEN THE `<system>` SHALL `<response>` |
   | Optional feature | WHERE `<feature is present>` THE `<system>` SHALL `<response>` |

   Number requirements and criteria (`1`, `1.1`, `1.2`, ...) — later phases reference these numbers, so stable IDs matter more than prose polish. Cover the unhappy paths explicitly (bad input, an unreachable upstream, an empty result) — a spec with only the happy path is incomplete.

4. Stop. Show the requirements and ask the user to approve or request changes — do not write `design.md` in the same turn even if you're confident. Per the `spec-driven-development` skill, only flip the status line to `Approved` once the user actually says so, in this reply or a later one.

## Report

State the feature name, the file path you created, and ask explicitly: does this look right, or does something need to change before moving to design?
