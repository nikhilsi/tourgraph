#!/usr/bin/env bash
set -euo pipefail

# Streams PM2 logs from the production server.
# Usage: bash deployment/scripts/stream-logs.sh <DROPLET_IP> [lines]

DROPLET_IP="${1:?Usage: stream-logs.sh <DROPLET_IP> [lines]}"
LINES="${2:-100}"

echo "=== Streaming TourGraph logs from $DROPLET_IP ==="
echo "Press Ctrl+C to stop"
echo ""

ssh "root@$DROPLET_IP" "cd /opt/app && pm2 logs tourgraph --lines $LINES"
