#!/usr/bin/env bash
set -euo pipefail

# Deploys SQLite database from local machine to production server.
# Run from the project root: bash deployment/scripts/deploy-db.sh <DROPLET_IP>

DROPLET_IP="${1:?Usage: deploy-db.sh <DROPLET_IP>}"
LOCAL_DB="./data/tourgraph.db"
REMOTE_DIR="/opt/app/data"
REMOTE_DB="$REMOTE_DIR/tourgraph.db"

echo "============================================"
echo "  Deploy TourGraph Database to $DROPLET_IP"
echo "============================================"

# Verify local DB exists
if [ ! -f "$LOCAL_DB" ]; then
    echo "ERROR: Local database not found at $LOCAL_DB"
    echo "Run this script from the project root directory."
    exit 1
fi

# Show database size
DB_SIZE=$(du -sh "$LOCAL_DB" | cut -f1)
echo "Local database: $LOCAL_DB ($DB_SIZE)"

# Checkpoint WAL — merges journal into .db for a consistent copy
echo "--- Checkpointing WAL ---"
sqlite3 "$LOCAL_DB" "PRAGMA wal_checkpoint(TRUNCATE);"
echo "WAL checkpointed"

# Ensure remote directory exists
ssh "root@$DROPLET_IP" "mkdir -p $REMOTE_DIR"

# Stop the app before replacing the database (prevents SQLITE_BUSY)
echo "--- Stopping app ---"
ssh "root@$DROPLET_IP" "pm2 stop tourgraph 2>/dev/null || true"

# Upload the database file
echo "--- Uploading database ($DB_SIZE) ---"
scp "$LOCAL_DB" "root@$DROPLET_IP:$REMOTE_DB"

# Remove stale WAL/SHM files on server (orphaned from previous DB)
ssh "root@$DROPLET_IP" "rm -f ${REMOTE_DB}-wal ${REMOTE_DB}-shm"

# Restart the app
echo "--- Restarting app ---"
ssh "root@$DROPLET_IP" "pm2 start tourgraph 2>/dev/null || cd /opt/app && pm2 start deployment/ecosystem.config.cjs"

echo ""
echo "============================================"
echo "  Database deploy complete!"
echo "============================================"
echo "Uploaded: $DB_SIZE to $DROPLET_IP:$REMOTE_DB"
echo ""
