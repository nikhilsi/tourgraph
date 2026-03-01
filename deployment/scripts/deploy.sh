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

# 2. Install dependencies (ci = clean, deterministic, rebuilds native bindings)
echo "--- Installing dependencies ---"
npm ci

# 3. Build Next.js
echo "--- Building Next.js ---"
npm run build

# 4. Restart or start PM2
echo "--- Restarting PM2 ---"
if pm2 describe tourgraph > /dev/null 2>&1; then
    pm2 reload "$ECOSYSTEM"
else
    pm2 start "$ECOSYSTEM"
fi

# 5. Save PM2 process list (survives reboot)
pm2 save

echo ""
echo "============================================"
echo "  Deploy complete!"
echo "============================================"
pm2 status
echo ""
echo "Verify: curl -I https://tourgraph.ai"
echo "Logs:   pm2 logs tourgraph --lines 20"
echo ""
