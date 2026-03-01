#!/usr/bin/env bash
set -euo pipefail

DOMAIN="tourgraph.ai"

echo "============================================"
echo "  Setting up SSL for $DOMAIN"
echo "============================================"

# Prompt for email
read -rp "Email for Let's Encrypt notifications: " EMAIL

# Install certbot
apt install -y certbot python3-certbot-nginx

# Obtain certificate (covers apex and www)
certbot certonly --webroot -w /var/www/certbot \
    -d "$DOMAIN" -d "www.$DOMAIN" \
    --email "$EMAIL" --agree-tos --no-eff-email

# Swap pre-SSL config for full SSL config
echo "--- Installing full SSL Nginx config ---"
cp /opt/app/deployment/nginx/tourgraph.conf /etc/nginx/sites-available/tourgraph
nginx -t && systemctl reload nginx

# Enable auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer

# Verify
certbot renew --dry-run

echo ""
echo "============================================"
echo "  SSL setup complete!"
echo "============================================"
echo "  Certificate installed for $DOMAIN and www.$DOMAIN"
echo "  Auto-renewal configured via systemd timer"
echo ""
echo "  Verify: curl -I https://$DOMAIN"
echo ""
