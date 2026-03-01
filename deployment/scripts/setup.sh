#!/usr/bin/env bash
set -euo pipefail

echo "============================================"
echo "  TourGraph Server Setup"
echo "============================================"

# 1. System updates
echo "--- Updating system packages ---"
apt update && apt upgrade -y

# 2. Install build-essential (required for better-sqlite3 native compilation)
echo "--- Installing build tools ---"
apt install -y build-essential python3 git curl sqlite3

# 3. Install Node.js 20 LTS via NodeSource
echo "--- Installing Node.js 20 ---"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "Node.js $(node --version)"
echo "npm $(npm --version)"

# 4. Install PM2 globally
echo "--- Installing PM2 ---"
npm install -g pm2
pm2 startup systemd -u root --hp /root
echo "PM2 installed and configured for systemd startup"

# 5. Install Nginx
echo "--- Installing Nginx ---"
apt install -y nginx
systemctl enable nginx

# 6. Create application directories
echo "--- Creating directories ---"
mkdir -p /opt/app/data
mkdir -p /opt/app/logs
mkdir -p /var/www/certbot

# 7. Create 1GB swap file (prevents OOM during npm ci + native compilation)
echo "--- Creating swap file ---"
if [ ! -f /swapfile ]; then
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "1GB swap file created"
else
    echo "Swap file already exists, skipping"
fi

# 8. Set up Nginx with pre-SSL config (HTTP only, for initial setup + certbot)
echo "--- Configuring Nginx (pre-SSL) ---"
rm -f /etc/nginx/sites-enabled/default
cp /opt/app/deployment/nginx/tourgraph-pre-ssl.conf /etc/nginx/sites-available/tourgraph
ln -sf /etc/nginx/sites-available/tourgraph /etc/nginx/sites-enabled/tourgraph
nginx -t && systemctl reload nginx

echo ""
echo "============================================"
echo "  Setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. bash /opt/app/deployment/scripts/setup-firewall.sh"
echo "  2. Copy .env.production.example to /opt/app/.env.production.local and fill in API keys"
echo "  3. From local machine: bash deployment/scripts/deploy-db.sh <DROPLET_IP>"
echo "  4. bash /opt/app/deployment/scripts/deploy.sh"
echo "  5. After DNS propagates: bash /opt/app/deployment/scripts/setup-ssl.sh"
echo ""
