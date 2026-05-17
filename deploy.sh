#!/usr/bin/env bash
# ─── ERP smart deploy ────────────────────────────────────────────
# Pulls latest code from GitHub, runs ONLY the steps that the
# changed files actually need.
#
# Usage:
#   ./deploy.sh            full deploy (safe, every step runs)
#   ./deploy.sh --quick    smart: skips composer / npm-ci / next-build
#                          when their inputs haven't changed
#                          (backend-only fix ≈ 15s, frontend ≈ 2min)
#
# Detection rules (vs previous HEAD before pulling):
#   composer.json|lock changed     → composer install
#   backend/{app,config,routes}/   → cache:clear + (php-fpm hot, no restart)
#   backend/database/migrations/   → php artisan migrate
#   frontend/package*.json         → npm ci  + next build  + pm2 restart
#   any other frontend/ file       → next build + pm2 restart
#   no relevant change             → just confirm & exit
set -e

REPO_DIR=/var/www/erp
BACKEND=$REPO_DIR/backend
FRONTEND=$REPO_DIR/frontend
MODE="${1:-full}"   # 'full' (default) or '--quick'

echo "════════════════════════════════════════════════════════════"
echo " ERP Deploy [${MODE}] — $(date)"
echo "════════════════════════════════════════════════════════════"

cd "$REPO_DIR"

# ── Step 1 ── git pull ────────────────────────────────────────────
echo ""
echo "▶ git pull"
PREV_HEAD=$(git rev-parse HEAD 2>/dev/null || echo "")
git fetch origin main
NEW_HEAD=$(git rev-parse origin/main)
echo "   Local HEAD:  ${PREV_HEAD}"
echo "   Remote HEAD: ${NEW_HEAD}"

if [ "$PREV_HEAD" = "$NEW_HEAD" ]; then
  echo "   Already up to date."
  if [ "$MODE" = "--quick" ]; then
    echo "✅ Nothing to deploy: $(date)"
    exit 0
  fi
fi

git merge --ff-only origin/main || {
  echo "❌ Local has changes not on GitHub. Commit/push or stash first."
  exit 1
}

# ── Decide what to do (only relevant in --quick) ──────────────────
RUN_COMPOSER=true
RUN_MIGRATE=true
RUN_CACHE_CLEAR=true
RUN_NPM_CI=true
RUN_BUILD=true
RUN_PM2=true

if [ "$MODE" = "--quick" ] && [ -n "$PREV_HEAD" ]; then
  CHANGED=$(git diff --name-only "$PREV_HEAD" "$NEW_HEAD")
  echo ""
  echo "▶ Changed files:"
  echo "$CHANGED" | sed 's/^/   /'

  has_change() { echo "$CHANGED" | grep -E "$1" -q; }

  RUN_COMPOSER=false
  RUN_MIGRATE=false
  RUN_CACHE_CLEAR=false
  RUN_NPM_CI=false
  RUN_BUILD=false
  RUN_PM2=false

  has_change '^backend/composer\.(json|lock)$'        && RUN_COMPOSER=true
  has_change '^backend/database/migrations/'          && RUN_MIGRATE=true
  has_change '^backend/(app|config|routes|bootstrap)/' && RUN_CACHE_CLEAR=true
  # Migrations / new controllers / route changes also need cache clear
  $RUN_MIGRATE && RUN_CACHE_CLEAR=true
  $RUN_COMPOSER && RUN_CACHE_CLEAR=true

  has_change '^frontend/(package\.json|package-lock\.json)$' && RUN_NPM_CI=true
  has_change '^frontend/'                                     && RUN_BUILD=true
  # If anything frontend-side rebuilt, PM2 needs to pick up new chunks
  $RUN_BUILD && RUN_PM2=true

  echo ""
  echo "▶ Plan (quick mode):"
  echo "   composer install : $RUN_COMPOSER"
  echo "   php artisan migrate: $RUN_MIGRATE"
  echo "   php artisan cache:clear: $RUN_CACHE_CLEAR"
  echo "   npm ci           : $RUN_NPM_CI"
  echo "   next build       : $RUN_BUILD"
  echo "   pm2 restart      : $RUN_PM2"
fi

# ── Composer ──────────────────────────────────────────────────────
if $RUN_COMPOSER; then
  echo ""
  echo "▶ composer install (production)"
  cd "$BACKEND"
  composer install --no-dev --optimize-autoloader --no-interaction 2>&1 | tail -5
fi

# ── Migrate ───────────────────────────────────────────────────────
if $RUN_MIGRATE; then
  echo ""
  echo "▶ php artisan migrate"
  cd "$BACKEND"
  php artisan migrate --force 2>&1 | tail -10
fi

# ── Cache clear ───────────────────────────────────────────────────
if $RUN_CACHE_CLEAR; then
  echo ""
  echo "▶ php artisan cache:clear"
  cd "$BACKEND"
  php artisan config:clear
  php artisan route:clear
  php artisan view:clear || true
fi

# ── npm ci ────────────────────────────────────────────────────────
if $RUN_NPM_CI; then
  echo ""
  echo "▶ npm ci"
  cd "$FRONTEND"
  npm ci --silent 2>&1 | tail -5
fi

# ── next build ────────────────────────────────────────────────────
if $RUN_BUILD; then
  echo ""
  echo "▶ next build"
  cd "$FRONTEND"
  npm run build 2>&1 | tail -10
fi

# ── PM2 restart ───────────────────────────────────────────────────
if $RUN_PM2; then
  echo ""
  echo "▶ pm2 restart erp-frontend"
  pm2 restart erp-frontend
  pm2 save
fi

echo ""
echo "✅ Deploy complete: $(date)"
