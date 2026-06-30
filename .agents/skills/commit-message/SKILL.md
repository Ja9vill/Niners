---
name: commit-message
description: Generate detailed conventional commit messages based on staged or unstaged git changes. Trigger with /commitmessage.
---

# commit-message

Triggers on: **/commitmessage**, **generate commit message**, **write commit message**, **commit message**

## Workflow

### 1. Check what's changed

First, inspect the current state:

```powershell
git status --short
git diff --cached --stat    # staged changes
git diff --stat             # unstaged changes
```

**Decision logic:**

| State | Action |
|-------|--------|
| Staged changes exist | Use `git diff --cached` for analysis |
| No staged changes, unstaged exist | Ask user: "Stage all with `git add -A`?" or show unstaged diff |
| No changes at all | Report "nothing to commit" and exit |

### 2. Analyze the diff

Read `git diff --cached` (or `git diff` if unstaged) to understand:

- **Which files changed** — categorize by directory/feature area
- **What type of change** — use this lookup:

| Pattern | Type |
|---------|------|
| `src/components/` changes | Component updates |
| `src/pages/` or route files | Page/route changes |
| `src/lib/`, `src/utils/` | Utility/library |
| `server.ts`, `src/api/` | Server/API changes |
| `*.test.*`, `__tests__/` | Test changes |
| `package.json`, config files | Chore/deps |
| `*.md`, `docs/` | Documentation |
| `.github/`, deploy scripts | CI/CD |

- **Determine the type prefix:**

| Type | When to use |
|------|------------|
| `feat` | New feature, new component, new page |
| `fix` | Bug fix, error handling, edge case |
| `chore` | Config, deps, build, tooling |
| `refactor` | Code restructure without feature/fix |
| `docs` | Documentation, README, comments |
| `test` | Tests only |
| `style` | CSS, styling, UI polish (no logic change) |

- **Identify a scope** — the primary area affected (e.g. `calendar`, `roster`, `auth`, `reports`, `deploy`)

### 3. Generate the commit message

Format:

```
type(scope): Short description (max 72 chars)

- Specific detail about change #1
- Specific detail about change #2 (refs file.ts:42)
- BREAKING: if applicable, note breaking changes
```

**Rules:**
- First line: max 72 characters, no period
- Body: bullet points starting with `-`
- Reference specific functions/files when relevant (e.g. `CalendarTab.tsx:120`)
- If multiple unrelated changes exist, suggest splitting into separate commits
- If a breaking change, add `BREAKING:` line in body

### 4. Output examples

**Single-file fix:**
```
fix(calendar): validate time range before submission

- Added guard in CalendarTab.tsx:412 to reject end_time before start_time
- Prevents Firestore write with invalid time ranges
```

**Multi-file feature:**
```
feat(roster): add CSV export for host list

- Added exportToCsv() in utils/export.ts
- Wired download button in Roster.tsx:88
- Uses papaparse for serialization
```

**Chore:**
```
chore(deps): upgrade vite to v6.2.3

- Updated package.json and package-lock.json
- No breaking changes in public API
```

### 5. Present and execute

1. Display the generated message
2. Ask user: "Commit with this message? (y/N)"
3. If confirmed: `git commit -m "<message>"`
4. If rejected: ask what to change and regenerate

## Exit criteria

A valid conventional commit message is either copied to clipboard or used to commit staged changes.
