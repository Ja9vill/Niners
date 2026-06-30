---
name: coding-guide
description: Analyze your current directory state and recommend the next best step. Checks git status, branch health, lint, build, and worktrees. Trigger with /guide.
---

# coding-guide

Triggers on: **/guide**, **what should I do next**, **where am I**, **status check**, **what now**, **guide me**, **next step**

## Workflow

### Phase 1: Gather state

Run all of these to capture the full picture:

```powershell
Write-Host "=== GIT STATUS ==="
git status --short

Write-Host "`n=== STAGED DIFF ==="
git diff --cached --stat

Write-Host "`n=== UNSTAGED DIFF ==="
git diff --stat

Write-Host "`n=== BRANCH ==="
git branch --show-current

Write-Host "`n=== AHEAD/BEHIND ==="
git rev-list --left-right --count "origin/main...HEAD"

Write-Host "`n=== RECENT COMMITS (local branch) ==="
git log --oneline -5

Write-Host "`n=== WORKTREES ==="
git worktree list

Write-Host "`n=== DIST STATE ==="
if (Test-Path "dist/index.html") { Write-Host "dist/ exists (previous build)" } else { Write-Host "dist/ missing (needs build)" }

Write-Host "`n=== RECENT DEPLOY TAGS ==="
git tag -l "deploy/*" --sort=-creatordate | Select-Object -First 3
```

### Phase 2: Analyze state

Use the gathered data to determine the current phase:

**Phase A — Dirty working tree (uncommitted changes)**

| Condition | Priority | Action |
|-----------|----------|--------|
| Unstaged changes exist | 1 | `git add <files>` or `git add -A` |
| Staged changes exist | 2 | `git commit` (use `/commitmessage` skill) |
| Stashable scratch work | Alternative | `git stash` to save for later |

**Phase B — Branch health**

| Condition | Priority | Action |
|-----------|----------|--------|
| On `main` with uncommitted changes | 1 | Create new branch: `git checkout -b feat/description` |
| On `main` with no changes | Info | "You're clean on main — ready for new work or deploy" |
| Branch is behind main | 1 | `git rebase origin/main` or `git merge origin/main` |
| Branch is ahead of main | Info | "Branch has X unpushed commits — consider pushing or PR" |
| Feature branch not pushed | 2 | `git push -u origin <branch>` |

**Phase C — Verification**

| Check | How | If fails |
|-------|-----|---------|
| TypeScript | `npm run lint` (exit code) | Fix errors before proceeding |
| Tests | `npm run test` (exit code) | Fix failing tests |
| Build | `npm run build` (exit code) | Fix build errors |

**Phase D — Ship readiness**

All of these must pass before deploy:
- [ ] Clean `git status` (no uncommitted changes)
- [ ] On `main` branch
- [ ] `main` is up to date with origin
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] `deploy/` tag will be auto-created by deploy-all.ps1

### Phase 3: Display dashboard

Render a clear summary like:

```
═══════════════════════════════════════════
  CODING GUIDE
═══════════════════════════════════════════
  Branch:      feat/calendar-page
  Status:      3 files modified
  Ahead/behind: +5 / -2 behind main
  Lint:        ✔ passed
  Test:        ✖ not run
  Build:       ✖ needs rebuild (dist/ outdated)
  Worktrees:   3 active (main, feat/public-pages, feat/dev-setup)
  Last deploy: deploy/2026-06-30-1422
───────────────────────────────────────────
  NEXT STEP:
  → git rebase origin/main  (2 commits behind)
  → then npm run test
  → then npm run build
───────────────────────────────────────────
```

### Phase 4: Recommended actions

List actions in priority order:

1. **Fix type errors** — if lint fails, resolve before anything else
2. **Commit or stash** — if dirty workspace, clean it
3. **Sync with main** — if behind, rebase/merge
4. **Run tests** — if changes might break existing behavior
5. **Build** — if dist/ is stale or source changed
6. **Push** — if branch is ahead but not pushed
7. **Merge & deploy** — if feature is complete and verified

For each recommendation, provide the exact command to run.

### Phase 5: Ongoing recommendations

If everything is clean:

| State | Recommend |
|-------|-----------|
| Clean, on main | Start a new feature: `git checkout -b feat/<name>` |
| Branch with work in progress | Continue working, commit often |
| Branch complete, verified | Merge to main and deploy |
| Deploy needed | Run `deploy-all.ps1` |

## Exit criteria

A clear, prioritized list of next actions is displayed with exact commands. The user knows exactly what to do next.
