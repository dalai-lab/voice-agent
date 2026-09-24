# Local Development Guide

This guide explains how to spin up the Voice Agent app locally while connecting to your production server's databases to ensure your local environment matches production exactly.

## Architecture Overview
To save RAM and ensure data consistency, your Mac is configured in a "hybrid" setup:

- **What runs LOCALLY (on your Mac):**
  - **Next.js UI** - You run this natively in your terminal with `npm run dev` (Port 3000)
  - **Python API** - Runs in Docker (Port 8005)
  - *(Note: Local UI, Postgres, Redis, and MinIO are disabled inside Docker via `docker-compose.override.yaml` to save RAM).*

- **What runs on the SERVER (via SSH Tunnel):**
  - **PostgreSQL** (Port 5435) - The main database
  - **Redis** (Port 6379, mapped to local 6380) - The caching layer
  - **Talkar Admin API** (Port 8002) - The billing/customer API
  - **MinIO** (Port 9000, mapped to local 9005) - Object Storage for recordings

---

## Step 1: Start the SSH Tunnel
Before starting Docker, you **must** open a terminal tab and establish an SSH tunnel to the production VPS. This securely forwards your Mac's local ports to the server's internal ports.

Run this command and leave the tab running in the background:
```bash
ssh -i ~/Keys/ssh-key-2026-06-30.key -N -L 0.0.0.0:5435:localhost:5435 -L 0.0.0.0:6380:localhost:6379 -L 0.0.0.0:8002:localhost:8002 -L 0.0.0.0:9005:localhost:9000 ubuntu@80.225.241.81
```

## Step 2: Start Docker Compose
In a separate terminal tab, navigate to the `voice-agent` folder and start the application.

```bash
cd ~/Internship/voice-agent
docker compose up -d
```
*(Docker will start the API, but will skip the UI, Postgres, Redis, and MinIO).*

## Step 3: Start the UI with Hot-Reloading
In a third terminal tab, navigate into the `ui` folder and start the Next.js development server:

```bash
cd ~/Internship/voice-agent/ui
npm run dev
```

## Step 4: Access the App
Everything is now running! 
- **Voice Agent UI:** [http://localhost:3000](http://localhost:3000) (Hot-reloads when you edit code!)
- **Voice Agent API:** [http://localhost:8005](http://localhost:8005)

## Shutdown
When you are done working:
1. Press `Ctrl + C` in the SSH tunnel terminal tab to close the connection.
2. Run `docker compose down` to stop the local containers and free up your Mac's memory.

---

## Production Server
Unlike your Mac's hybrid setup, your production VPS runs **everything** natively in Docker. It does not use the `docker-compose.override.yaml` file. 

- **What runs in PRODUCTION:**
  - **Next.js UI** (Port 3010, proxied by Nginx)
  - **Python API** (Port 8005)
  - **PostgreSQL** (Port 5435) - The actual database
  - **Redis** (Port 6379) - The actual cache
  - **MinIO** - Object Storage
  - **Nginx** - Handles the `https://talkar.in` domain and SSL certificates
  - **Coturn / Cloudflared** - Networking services for audio bridging
  - **Talkar Admin/Billing API** (Port 8002) - Running independently on the server

- **How to update/start Production:**
  If you ever need to apply updates on the server, you don't use `docker compose up`. Instead, you use the built-in production script:
  ```bash
  cd /var/www/voice-agent/voice-agent
  sudo git pull
  sudo ./remote_up.sh
  ```
  *(To force a fresh rebuild on the server, use `sudo ./remote_up.sh --build`)*

---

## Troubleshooting

### "Address already in use" (Port Conflicts)
If your SSH tunnel drops and you get a `bind [0.0.0.0]:5435: Address already in use` error when trying to reconnect, a ghost process is holding the port. To fix this:

1. Stop Docker (this frees up any ports it might be holding):
   ```bash
   docker compose down
   ```
2. Kill any ghost SSH connections:
   ```bash
   pkill -f "ssh -i"
   ```
3. Re-run your SSH tunnel command:
   ```bash
   ssh -i ~/Keys/ssh-key-2026-06-30.key -N -L 0.0.0.0:5435:localhost:5435 -L 0.0.0.0:6380:localhost:6379 -L 0.0.0.0:8002:localhost:8002 -L 0.0.0.0:9005:localhost:9000 ubuntu@80.225.241.81
   ```
4. Start Docker again:
   ```bash
   docker compose up -d
   ```
