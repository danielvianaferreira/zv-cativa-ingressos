#!/bin/bash
# scripts/deploy.sh — Atualiza o código no servidor EC2 e reinicia PM2
# Uso: bash scripts/deploy.sh

set -e

EC2_IP="18.228.90.247"
EC2_USER="ubuntu"
KEY="$HOME/.ssh/zv-cativa-key.pem"
APP_DIR="/var/www/app"

echo "→ Fazendo deploy para $EC2_IP"

ssh -i "$KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << 'REMOTE'
  set -e
  cd /var/www/app
  git pull origin main
  npm install --omit=dev
  pm2 restart zv-cativa
  echo "✅ Deploy concluído: $(date)"
REMOTE
