#!/usr/bin/env bash
set -e

echo "================================================================"
echo "  🚌 Bus Aesh — 1-Click Production Server Starter (Linux/Ubuntu)"
echo "================================================================"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed."
    echo "👉 Run this command to install Docker on Ubuntu:"
    echo "   sudo apt update && sudo apt install -y docker.io docker-compose-v2"
    echo "   sudo usermod -aG docker \$USER && newgrp docker"
    exit 1
fi

# Check if sudo is required for docker
DOCKER_COMPOSE="docker compose"
if ! docker info > /dev/null 2>&1; then
    if sudo docker info > /dev/null 2>&1; then
        echo "ℹ️  Docker requires elevated privileges. Using sudo..."
        DOCKER_COMPOSE="sudo docker compose"
    else
        echo "❌ Cannot connect to the Docker daemon."
        echo "👉 Ensure Docker service is running: sudo systemctl start docker"
        exit 1
    fi
fi

# 3. Always compose down before doing anything (clean teardown)
echo "🛑 Stopping and cleaning any existing containers..."
$DOCKER_COMPOSE down --remove-orphans 2>/dev/null || true

# 4. Check and pull latest repository updates if running inside git clone
if [ -d ".git" ]; then
    echo "🔄 Checking for latest repository updates from GitHub..."
    git pull origin main 2>/dev/null || echo "ℹ️  Continuing with local files..."
fi

echo "🚀 Building fresh Docker image (no cache)..."
$DOCKER_COMPOSE build --no-cache app
echo "🚀 Starting all services..."
$DOCKER_COMPOSE up -d

echo "⏳ Waiting for services to initialize..."
sleep 5

echo "📋 Checking container status:"
$DOCKER_COMPOSE ps

echo ""
echo "================================================================"
echo "  🎉 Bus Aesh Stack is LIVE and Running!"
echo "================================================================"
echo "  🌐 Local Web Portal (Passenger / Admin / Supervisor):"
echo "     👉 http://localhost:3001"
echo ""
echo "  ⚡ Fastify API Backend:"
echo "     👉 http://localhost:3000"
echo "     👉 Health check: http://localhost:3000/health"
echo ""
echo "  📱 If testing from your Windows host (outside VirtualBox):"
echo "     Use your VirtualBox VM IP address, for example: http://<VM_IP>:3001"
echo ""
# Wait briefly and extract Cloudflare Quick Tunnel URL if available
sleep 3
CF_URL=$($DOCKER_COMPOSE logs cloudflared 2>&1 | grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]*\.trycloudflare\.com' | head -n 1 || true)
if [ -n "$CF_URL" ]; then
    echo "  🌍 Global Online Public HTTPS URL (Accessible from Any Phone, 4G/5G, or PC):"
    echo "     👉 $CF_URL"
    echo ""
fi
echo "================================================================"
echo ""
echo "To view live logs, run: $DOCKER_COMPOSE logs -f app"

