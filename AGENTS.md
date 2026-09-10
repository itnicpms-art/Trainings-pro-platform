<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Trainings PRO / NICPMS Academy — Agent Development Rules

These rules apply to every coding agent working in this repository, including Codex and Claude Code.

## 1. Git and branch workflow

- Never work directly on `main`.
- Never push commits directly to `main`.
- Each active task must use its own dedicated branch and isolated worktree or working directory.
- Work only on the branch assigned to the current task.
- Do not switch to another agent's branch.
- Do not modify another agent's worktree or working directory.
- Do not merge branches into `main`.
- Do not rebase, reset, force-push, or rewrite another task's history.
- Never use `git push --force` or `git push --force-with-lease`.
- Do not delete branches belonging to another active task.
- Pull requests must target `main`.
- Completed tasks are merged through pull requests using squash merge.
- Do not bypass repository protection rules.

Branch naming convention:

- Codex: `codex/task-XXX-description`
- Claude Code: `claude/task-XXX-description`
- Maintenance/configuration: `chore/description`
- Bug fixes: `codex/fix-description` or `claude/fix-description`

Before starting implementation, always run:

```bash
git branch --show-current
git status
```
