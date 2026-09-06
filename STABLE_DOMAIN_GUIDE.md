# 🌐 Complete Guide: 100% Free Permanent Stable Domain for Bus Aesh

By default, running docker compose up starts a **Cloudflare Quick Tunnel**, which generates a random temporary URL (e.g. https://random-words.trycloudflare.com) that changes upon restarting.

To make your URL **100% permanent, fixed, and completely free forever**, choose either of the two official methods below:

---

## Method 1: Cloudflare Zero Trust Named Tunnel (Recommended — 100% Free & Stable)

Cloudflare Zero Trust provides free named tunnels with unlimited bandwidth and zero expiration.

### Step 1: Open Cloudflare Zero Trust (Free Forever)
1. Go to [one.dash.cloudflare.com](https://one.dash.cloudflare.com/) and sign in with your free Cloudflare account.
2. In the sidebar, navigate to **Networks** ➔ **Tunnels**.
3. Click **Add a tunnel** (or Create Tunnel).
4. Select **Cloudflared** as the connector and click **Next**.
5. Give your tunnel a name, for example: galala-bus.

### Step 2: Copy the Tunnel Token
Cloudflare will display an installation screen with a command containing a token:
`ash
cloudflared.exe service install eyJhIjoiYmMy...
`
Copy only the token string (the part starting with eyJh...).

### Step 3: Configure the Public Hostname in Cloudflare
1. In the Tunnel settings, go to the **Public Hostname** tab.
2. Click **Add a public hostname**.
3. Choose your domain/subdomain (e.g. us.yourdomain.com).
4. Under **Service**:
   - Type: HTTP
   - URL: pp:3001 (or localhost:3001)
5. Click **Save hostname**.

### Step 4: Add Token to Bus Aesh .env
In your esh_gu_bus folder on Ubuntu/Linux:
`ash
echo CLOUDFLARE_TUNNEL_TOKEN=your_token_here >> .env
`

Now, whenever you run ash start.sh or docker compose up -d, Cloudflare connects directly to your permanent domain! It will **never change** again.

---

## Method 2: Fixed Subdomain via Localtunnel (Zero Signup Required — 100% Free)

If you don't have a Cloudflare domain and want a fixed free URL without signing up anywhere:

1. Install localtunnel on your Linux VM / machine:
   `ash
   sudo apt install -y npm
   sudo npm install -g localtunnel
   `
2. Start your permanent custom subdomain:
   `ash
   lt --port 3001 --subdomain gu-bus-aesh-station
   `
3. Your permanent URL will be:
   `
   https://gu-bus-aesh-station.loca.lt
   `
   *(You can replace gu-bus-aesh-station with any unique name you prefer).*

---

## Summary of Environment Variables

| Variable | Description | Example |
|---|---|---|
| CLOUDFLARE_TUNNEL_TOKEN | Your permanent Cloudflare Zero Trust token | eyJhIjoi... |
| SMTP_USER | Microsoft 365 / Outlook email for OTP delivery | dmin@gu.edu.eg |
| SMTP_PASS | Microsoft 365 Outlook app password | pp_password |
| SMTP_HOST | SMTP server host (default: smtp.office365.com) | smtp.office365.com |
| SMTP_PORT | SMTP server port (default: 587) | 587 |
