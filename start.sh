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

echo "🚀 Building and starting Docker services..."
docker compose up -d --build

echo "⏳ Waiting for services to initialize..."
sleep 5

echo "📋 Checking container status:"
docker compose ps

echo ""
echo "================================================================"
echo "  🎉 Bus Aesh Stack is LIVE and Running!"
echo "================================================================"
echo "  🌐 Web Portal (Passenger / Admin / Supervisor):"
echo "     👉 http://localhost:3001"
echo ""
echo "  ⚡ Fastify API Backend:"
echo "     👉 http://localhost:3000"
echo "     👉 Health check: http://localhost:3000/health"
echo ""
echo "  📱 If testing from your Windows host (outside VirtualBox):"
echo "     Use your VirtualBox VM IP address, for example: http://<VM_IP>:3001"
echo "     Find your VM IP by running: ip a"
echo "================================================================"
echo ""
echo "To view live logs, run: docker compose logs -f app"
