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

## 2. Parallel-agent safety

- Codex and Claude Code may work at the same time only on different tasks.
- Each task must use its own branch and isolated worktree or working directory.
- Do not modify another agent's branch, worktree, or task files.
- Avoid editing the same shared files in parallel when possible.
- If two active tasks need changes to the same file or database area, stop and report the conflict before continuing.
- Do not merge or cherry-pick another active task unless explicitly instructed.

## 3. Database and Supabase safety

- Only one active task may modify the same database area at a time.
- Never modify an existing committed migration.
- Every schema change must use a new migration file.
- Never reset or run destructive commands against a remote or production database.
- Never weaken RLS or authorization rules just to make a task work.
- Do not apply remote migrations unless explicitly instructed.
- If another active task may touch the same tables, RPCs, policies, or migrations, stop and report the conflict.

## 4. Required validation

Before declaring a task complete, run:

```bash
pnpm lint
pnpm build
git diff --check
git status
```

Also inspect:

```bash
git diff
```

Do not claim a check passed unless it was actually executed successfully.

## 5. Secrets and environment files

- Never commit `.env`, `.env.local`, API keys, passwords, access tokens, or Supabase service-role keys.
- Only documented templates such as `.env.example` may be committed.
- Never print secrets in logs, documentation, commits, pull requests, or screenshots.
- If a required secret is not already securely available in the environment, stop and request operator action.

## 6. Task scope

- Implement only the requirements of the current task.
- Do not add unrelated features or refactor unrelated areas.
- Reuse existing project patterns, helpers, components, and types where possible.
- Do not silently fix unrelated issues; report them separately.
- If the task conflicts with the real repository or database schema, stop and explain the conflict instead of guessing.

## 7. Package manager and dependencies

- Use `pnpm` for this repository.
- Do not replace pnpm with npm, yarn, or bun.
- Do not add dependencies unless the current task requires them.
- Do not upgrade framework or package versions as part of an unrelated task.
- Keep dependency changes minimal and task-specific.

## 8. Task completion

At the end of every task:

- Summarize what was implemented.
- List the files changed.
- Mention any database or migration changes.
- Report the results of `pnpm lint`, `pnpm build`, and `git diff --check`.
- State clearly what manual QA is still required.
- Do not start another task automatically.
- Do not merge into `main`; leave the task ready for pull request review.
