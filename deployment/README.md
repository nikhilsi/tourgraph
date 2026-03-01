# TourGraph Deployment Guide

**Target:** DigitalOcean Droplet (Ubuntu 24.04, $6/mo)
**Stack:** Nginx + PM2 + Next.js 16 + SQLite
**Domain:** tourgraph.ai

---

## Architecture

```
Internet → Nginx (:443 SSL, :80 → redirect)
              ↓ proxy_pass http://127.0.0.1:3000
           PM2 → next start (fork mode, single process)
              ↓
           /opt/app/data/tourgraph.db (SQLite, WAL mode)
```

No Docker. Single process managed by PM2. SQLite database deployed via SCP.

---

## Prerequisites

- DigitalOcean account
- SSH key added to your account
- Domain tourgraph.ai with DNS access
- Local machine has the SQLite database in `data/tourgraph.db`

---

## First-Time Deployment

### 1. Create Droplet

DigitalOcean dashboard:
- Image: Ubuntu 24.04 LTS
- Plan: Basic, Regular SSD, $6/mo (1GB RAM, 1 vCPU, 25GB SSD)
- Region: sfo3
- Authentication: SSH key
- Note the IP address: `<DROPLET_IP>`

### 2. Configure DNS (do immediately)

At your DNS provider, update tourgraph.ai records:
- A record: `@` → `<DROPLET_IP>` (TTL: 300)
- A record: `www` → `<DROPLET_IP>` (TTL: 300)
- Delete any conflicting CNAME records (e.g., GitHub Pages)

DNS propagation can take minutes to hours. Start it now, verify later.

### 3. Server Setup

```bash
ssh root@<DROPLET_IP>
git clone https://github.com/nikhilsi/tourgraph.git /opt/app
bash /opt/app/deployment/scripts/setup.sh
bash /opt/app/deployment/scripts/setup-firewall.sh
```

### 4. Configure Environment

```bash
# On the server
cp /opt/app/deployment/.env.production.example /opt/app/.env.production.local
nano /opt/app/.env.production.local
# Fill in: VIATOR_API_KEY, ANTHROPIC_API_KEY
```

### 5. Deploy Database (from local machine)

```bash
# From project root on your local machine
bash deployment/scripts/deploy-db.sh <DROPLET_IP>
```

### 6. Deploy Application

```bash
ssh root@<DROPLET_IP> "cd /opt/app && bash deployment/scripts/deploy.sh"
```

### 7. Verify HTTP

```bash
curl -I http://tourgraph.ai
# Should return 200 (or proxy to Next.js)
```

If this fails, DNS hasn't propagated yet. Check with: `dig tourgraph.ai`

### 8. Set Up SSL

```bash
ssh root@<DROPLET_IP> "bash /opt/app/deployment/scripts/setup-ssl.sh"
```

### 9. Verify HTTPS

```bash
curl -I https://tourgraph.ai          # 200
curl -I http://tourgraph.ai           # 301 → https
curl -I https://www.tourgraph.ai      # 301 → non-www
```

---

## Recurring Deployment (Code Updates)

```bash
# Push code to GitHub first
git push origin main

# Then deploy
ssh root@<DROPLET_IP> "cd /opt/app && bash deployment/scripts/deploy.sh"
```

## Database Updates

After re-indexing locally:

```bash
bash deployment/scripts/deploy-db.sh <DROPLET_IP>
```

This stops the app, uploads the DB, and restarts. ~30 seconds of downtime.

---

## Monitoring

```bash
# Stream logs
bash deployment/scripts/stream-logs.sh <DROPLET_IP>

# On the server
pm2 status                    # Process status
pm2 logs tourgraph --lines 50 # Recent logs
pm2 monit                     # Live monitoring
free -m                       # Memory usage
df -h                         # Disk usage
```

---

## Troubleshooting

**App won't start:**
```bash
pm2 logs tourgraph --lines 50   # Check for errors
cat /opt/app/.env.production.local  # Verify env vars
ls -la /opt/app/data/tourgraph.db   # Verify DB exists
```

**502 Bad Gateway:**
```bash
pm2 status          # Is the process running?
pm2 restart tourgraph
nginx -t && systemctl reload nginx
```

**SSL certificate expired:**
```bash
certbot renew --force-renewal
systemctl reload nginx
```

**Out of memory:**
```bash
free -m             # Check memory
pm2 restart tourgraph  # Restart to free memory
# If persistent, upgrade to $12/mo droplet (2GB RAM)
```

**Database update fails:**
```bash
# Ensure no running indexer locally before checkpoint
sqlite3 ./data/tourgraph.db "PRAGMA wal_checkpoint(TRUNCATE);"
# Re-run deploy-db.sh
```

---

## Server Layout

```
/opt/app/
├── deployment/                # This directory
├── src/                       # App source
├── data/
│   └── tourgraph.db          # SQLite database (~160-400MB)
├── logs/
│   ├── pm2-out.log           # App stdout
│   └── pm2-error.log         # App stderr
├── .env.production.local     # API keys (not in git)
├── .next/                    # Build output
├── node_modules/             # Dependencies
└── package.json
```
