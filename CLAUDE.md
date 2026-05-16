# ERP System — Claude Working Rules

This is the **carlanisa/erp-system** project (Laravel 13.7 backend + Next.js 14 frontend).
Live: https://erp.earntodiemodapk.com — VPS: `185.182.8.4` — Repo: `git@github.com:carlanisa/erp-system.git`

## 🌳 Branch Workflow (MANDATORY for every session)

The user runs **multiple Claude sessions in parallel** on this same project (one per module — Inventory, Projects, CRM, etc). To prevent silent overwrites between sessions, **every Claude session MUST work on its own feature branch**.

### At session start — run these 3 commands FIRST, before anything else:

```bash
cd "/Users/waqas/ACCOUNTING SYSTEM"
git checkout main
git pull origin main
# Pick a descriptive branch name based on what THIS session is about.
# Format: feature/<area>-<short-description>
# Examples:
#   feature/inventory-stock-alerts
#   feature/projects-recurring-tasks
#   feature/crm-bulk-email
#   fix/payroll-rounding-bug
git checkout -b feature/<area>-<short-description>
```

If the user has not yet told you what the session is about, **ask them**: *"Is session ka kya kaam hay? Branch banaa loon (e.g. feature/inventory-xyz)?"*

### During the session
- All edits go on the feature branch
- Make commits as you complete logical chunks: `git add . && git commit -m "what + why"`
- Push the branch periodically so the user can see progress on GitHub:
  ```bash
  git push -u origin feature/<branch-name>
  ```

### At session end — merge back to main
After verifying the work is complete and tested:
```bash
git checkout main
git pull origin main                       # always pull latest first (another session may have merged)
git merge --no-ff feature/<branch-name>    # merge with merge commit (history clarity)
git push origin main
# Optional cleanup:
git branch -d feature/<branch-name>
git push origin --delete feature/<branch-name>
```

If `git merge` reports a conflict — **STOP and tell the user**. Do not resolve unilaterally for any file the session didn't author. Show them the conflicting files and the two versions, then let them decide.

### Deploy to production
After merging to main:
```bash
ssh root@185.182.8.4 "cd /var/www/erp && ./deploy.sh"
```
Server pulls main, runs migrations, rebuilds frontend, restarts PM2. ~2-3 min.

## 🚨 NEVER do these (will break parallel-session work)
- ❌ Never `git push --force` or `--force-with-lease` to main
- ❌ Never commit directly on `main` — always feature branch then merge
- ❌ Never `git checkout -- <file>` or `git reset --hard` without showing the user first what would be lost
- ❌ Never commit `.env`, `.env.local`, API keys, or anything from `/storage/logs`, `/vendor`, `/node_modules`, `/.next` (already in `.gitignore`)
- ❌ Never edit files in `/var/www/erp` on the server directly — server is GitHub-tracked, changes there get wiped on next `./deploy.sh`

## 📐 Project conventions
- **Backend stack**: Laravel 13.7 + PostgreSQL + Sanctum auth. Pattern: Model → Migration → Controller (with `ApiResponse` trait) → Routes
- **Frontend stack**: Next.js 14.2 App Router + Tailwind + Zustand. Route groups: `(auth)`, `(erp)`, `(store)`
- **DB migrations**: chronological naming `2026_05_XX_XXXXXX_*.php`. Before creating a new migration, check the latest timestamp on disk (and on `origin/main`) so you don't clash with parallel sessions.
- **Anthropic AI**: shared service `app/Services/ProductAiAutofill.php` pattern. Key in `services.anthropic.api_key`. Server has no key set yet — fallbacks engage.
- **Language**: All UI text in **English-only** across the entire ERP (POS + admin + AI shell strings + notifications). The AI's runtime replies in the user's chosen language is data, not UI text — that's allowed.

## 📁 Module ownership (rough guide for parallel sessions)
| Area | Folders |
|---|---|
| Inventory | `app/Models/Inventory/`, `Controllers/Api/Inventory/`, `app/(erp)/inventory/` |
| Sales / POS | `app/Models/Sales/`, `Controllers/Api/Sales/`, `app/(erp)/sales/` |
| Suppliers | `app/Models/Suppliers/`, `Controllers/Api/Suppliers/`, `app/(erp)/suppliers/` |
| CRM | `app/Models/CRM/`, `Controllers/Api/CRM/`, `app/(erp)/crm/` |
| HRM | `app/Models/HRM/`, `Controllers/Api/HRM/`, `app/(erp)/hrm/` |
| Accounting | `app/Models/Accounting/`, `Controllers/Api/Accounting/`, `app/(erp)/accounting/` |
| Projects & Tasks | `app/Models/Projects/`, `Controllers/Api/Projects/`, `app/(erp)/projects/`, `app/(erp)/tasks/` |
| AI Helper | `app/Models/AI/`, `app/Services/AI/`, `app/(erp)/ai-chat/` |
| Storefront | `app/(store)/` |

**Shared infrastructure files** (touch carefully — high conflict risk):
- `backend/routes/api.php` — every module adds routes here
- `frontend/components/layout/Sidebar.tsx` — every module adds a nav entry
- `backend/composer.json`, `frontend/package.json` — dependency changes
- `backend/.env.example`, `frontend/.env.example` — env templates (production `.env` is NEVER in git)

When editing these shared files, prefer to **append** rather than rewrite, and pull `origin/main` immediately before pushing to catch any concurrent additions.

## 🤝 If you smell a conflict
Before doing anything destructive, run `git status` and `git log origin/main..HEAD --oneline`. If you see commits on `origin/main` that your branch doesn't have, or unexpected modified files, **pause and ask the user** what happened. Another session may have pushed.
