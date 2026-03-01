#!/usr/bin/env bash
set -euo pipefail

echo "============================================"
echo "  Setting up firewall and fail2ban"
echo "============================================"

# Install fail2ban
apt install -y fail2ban

# Configure fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 3600
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Configure UFW
echo "--- Configuring UFW ---"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "============================================"
echo "  Firewall setup complete!"
echo "============================================"
ufw status verbose
echo ""
fail2ban-client status
