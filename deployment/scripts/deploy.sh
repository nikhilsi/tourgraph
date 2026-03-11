#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/app"
ECOSYSTEM="$APP_DIR/deployment/ecosystem.config.cjs"

echo "============================================"
echo "  TourGraph Deploy"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"

cd "$APP_DIR"

# 1. Pull latest code
echo "--- Pulling latest code ---"
git pull origin main

# 2. Clean stale root-level artifacts (pre-web/ migration remnants)
rm -rf "$APP_DIR/node_modules" "$APP_DIR/.next" 2>/dev/null

# 3. Install + build web frontend
echo "--- Building web frontend ---"
cd "$APP_DIR/web"
npm ci
npm run build

# 4. Install + build backend API
echo "--- Building backend API ---"
cd "$APP_DIR/backend"
npm ci
npm run build

cd "$APP_DIR"

# 5. Restart PM2 (both web + api processes)
echo "--- Restarting PM2 ---"
pm2 delete all 2>/dev/null || true
pm2 start "$ECOSYSTEM"

# 6. Save PM2 process list (survives reboot)
pm2 save

echo ""
echo "============================================"
echo "  Deploy complete!"
echo "============================================"
pm2 status
echo ""
echo "Verify: curl -I https://tourgraph.ai"
echo "API:    curl https://tourgraph.ai/api/v1/health"
echo "Logs:   pm2 logs --lines 20"
echo ""
