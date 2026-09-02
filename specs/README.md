# Specs

Each subfolder here is one feature spec, written before its code: `requirements.md` (what and why, in EARS-format acceptance criteria), `design.md` (how, per tier), then `tasks.md` (a checklist of discrete coding tasks). Each document needs explicit approval before the next is written, and `tasks.md` needs approval before anything in it is implemented.

Driven by slash commands — see the `spec-driven-development` skill and `.claude/README.md` for the full workflow:

```
/spec-create <feature-name> <description>   # requirements.md
/spec-design <feature-name>                  # design.md
/spec-tasks <feature-name>                    # tasks.md
/spec-execute <feature-name> [task-number]     # implement one task at a time
/spec-status [feature-name]                    # where every spec stands
```

A spec folder is meant to be readable on its own, months later, without the conversation that produced it — that's why each document exists as a separate, complete file rather than as chat history.
