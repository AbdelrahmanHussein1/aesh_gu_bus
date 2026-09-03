# 🐧 Quick-Start Guide: Running Bus Aesh on Ubuntu Linux (VirtualBox)

This guide provides exact copy-paste commands to launch the **Bus Aesh** transport system (Fastify API + PostgreSQL + Redis + Next.js Web App) inside an Ubuntu VirtualBox VM for real production testing.

---

## ⚙️ Step 0: VirtualBox Network Setup (Crucial!)

To access the server running inside Ubuntu from your Windows host browser (or your mobile phone):

### Option A: Bridged Adapter (Easiest — VM gets its own IP on your WiFi/LAN)
1. In VirtualBox, open your VM **Settings** ➔ **Network**.
2. Attached to: Select **Bridged Adapter**.
3. Name: Select your physical Wi-Fi or Ethernet card.
4. Click **OK**.
5. Inside Ubuntu, run `ip a` to see your VM's IP address (e.g., `192.168.1.150`).

### Option B: NAT with Port Forwarding (If using default NAT)
1. In VirtualBox, open VM **Settings** ➔ **Network** ➔ **Advanced** ➔ **Port Forwarding**.
2. Add these rules:
   | Rule Name | Protocol | Host Port | Guest Port |
   | :--- | :--- | :--- | :--- |
   | **Web App** | TCP | `3001` | `3001` |
   | **API** | TCP | `3000` | `3000` |
   | **Postgres** | TCP | `5432` | `5432` |
3. Click **OK**. You will be able to access everything from Windows via `http://localhost:3001`!

---

## 📦 Step 1: Install Docker & Docker Compose on Ubuntu

Open the Ubuntu Terminal and run this **single copy-paste command**:

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 unzip curl git && \
sudo usermod -aG docker $USER && \
newgrp docker
```

*(This installs Docker, grants your user permissions so you don't need `sudo` for docker commands, and refreshes the shell).*

---

## 🚀 Step 2: Extract Project Files

If you copied `bus-aesh-linux-vbox.zip` into Ubuntu:

```bash
# Create directory and extract
mkdir -p ~/aesh_gu_bus
unzip bus-aesh-linux-vbox.zip -d ~/aesh_gu_bus
cd ~/aesh_gu_bus
```

*(Alternatively, you can clone straight from GitHub):*
```bash
git clone https://github.com/AbdelrahmanHussein1/aesh_gu_bus.git ~/aesh_gu_bus
cd ~/aesh_gu_bus
```

---

## ⚡ Step 3: Start the Production Server (1 Command!)

Run the automated starter script:

```bash
bash start.sh
```

### Or run directly with standard Docker Compose:
```bash
docker compose up -d --build
```

### What Happens Automatically:
1. Builds the production multi-stage container.
2. Boots PostgreSQL 16 and Redis 7.
3. **Waits for PostgreSQL to be healthy**.
4. **Applies all Drizzle database migrations**.
5. **Seeds the real database** with:
   - Official Galala Routes (Port Tawfik #29, Nabi Allah #33, El Salam #30, etc.)
   - All 6 Drivers (Mohamed Sobhi, Ashraf Hassan, El Sayed Abdel Gawad, etc.)
   - All 17 Line Supervisors
   - Complete June 2026 Shift Schedule (Morning 1, Morning 2, Return 1, Return 2, Return 3)
6. Launches Fastify API on port `3000`.
7. Launches Next.js Web on port `3001`.

---

## 🔍 Step 4: Verify Server Status

Check that all 3 containers are healthy:
```bash
docker compose ps
```

Test the API health endpoint:
```bash
curl http://localhost:3000/health
# Expected: {"status":"OK","timestamp":"..."}
```

Check live logs anytime:
```bash
docker compose logs -f app
```

---

## 🌐 Step 5: Open and Test in Browser

### From inside the Ubuntu VM:
- **Web App**: Open Firefox inside Ubuntu ➔ [http://localhost:3001](http://localhost:3001)
- **Admin Console**: [http://localhost:3001/admin](http://localhost:3001/admin)

### From your Windows Host:
- If using **Port Forwarding**: Open Chrome on Windows ➔ [http://localhost:3001](http://localhost:3001)
- If using **Bridged Adapter**: Open `http://<UBUNTU_VM_IP>:3001`

---

## 🛑 Useful Docker Commands

| Action | Command |
| :--- | :--- |
| **View real-time logs** | `docker compose logs -f app` |
| **Stop all services** | `docker compose down` |
| **Restart services** | `docker compose restart` |
| **Fresh clean restart (resets DB)** | `docker compose down -v && docker compose up -d --build` |
| **Run manual migration** | `docker compose exec app node apps/api/dist/db/migrate.js` |
| **Run manual seed** | `docker compose exec app node apps/api/dist/db/seed.js` |

---

## 📱 Android APK Setup

- An APK can be built via GitHub Actions:
  1. Go to **Actions** in GitHub: [https://github.com/AbdelrahmanHussein1/aesh_gu_bus/actions](https://github.com/AbdelrahmanHussein1/aesh_gu_bus/actions)
  2. Select **Build Android APK** ➔ Click **Run workflow**.
  3. Download the generated `.apk` artifact directly to your phone.
- Or locally inside `apps/mobile`:
  ```bash
  cd apps/mobile/android
  ./gradlew assembleDebug
  # Output: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
  ```
