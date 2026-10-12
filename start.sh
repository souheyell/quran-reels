#!/usr/bin/env bash
# ==============================================================================
# Islamic Reels Creator & Bulk Publisher — Unified Start Script
# Automatically checks & installs missing dependencies, cleans stale ports,
# launches both the Unified Studio (Vite) and Cloud Bridge, and opens the browser.
# ==============================================================================

set -e

# Change directory to repo root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# ANSI Colors
GREEN="\033[92m"
CYAN="\033[96m"
YELLOW="\033[93m"
MAGENTA="\033[95m"
RED="\033[91m"
BOLD="\033[1m"
RESET="\033[0m"

echo ""
echo -e "${CYAN}${BOLD}==================================================================${RESET}"
echo -e "${CYAN}${BOLD}   🌟 Islamic Reels & Bulk Publisher — Unified Toolkit Launcher 🌟${RESET}"
echo -e "${CYAN}${BOLD}==================================================================${RESET}"
echo ""

# 1. Check Node.js and npm
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}❌ Error: Node.js is not installed or not in your PATH.${RESET}"
  echo -e "Please install Node.js (v18+) from https://nodejs.org/"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo -e "${RED}❌ Error: npm is not installed or not in your PATH.${RESET}"
  exit 1
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "✔ Environment: Node.js ${GREEN}${NODE_VERSION}${RESET} | npm ${GREEN}v${NPM_VERSION}${RESET}"

# 2. Check & Install Missing Dependencies
NEED_INSTALL=false
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}⚡ node_modules not found. Installing missing dependencies...${RESET}"
  NEED_INSTALL=true
elif [ "package.json" -nt "node_modules" ]; then
  echo -e "${YELLOW}⚡ package.json is newer than node_modules. Updating dependencies...${RESET}"
  NEED_INSTALL=true
fi

if [ "$NEED_INSTALL" = true ]; then
  echo -e "${CYAN}📦 Running 'npm install'...${RESET}"
  npm install
  echo -e "${GREEN}✔ Dependencies installed successfully.${RESET}"
else
  echo -e "${GREEN}✔ All dependencies are installed and up to date.${RESET}"
fi

# 3. Clean up stale/dangling server instances
PID_FILE="$ROOT_DIR/.server.pid"
LOG_FILE="$ROOT_DIR/.server.log"
BRIDGE_PID_FILE="$ROOT_DIR/.bridge.pid"
BRIDGE_LOG_FILE="$ROOT_DIR/.bridge.log"

for pf in "$PID_FILE" "$BRIDGE_PID_FILE"; do
  if [ -f "$pf" ]; then
    OLD_PID=$(cat "$pf" 2>/dev/null || true)
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
      echo -e "${YELLOW}Stopping existing process (PID $OLD_PID)...${RESET}"
      kill "$OLD_PID" 2>/dev/null || true
      sleep 0.5
    fi
    rm -f "$pf"
  fi
done

# Clear conflicting processes occupying ports 5173, 5174, 3001
EXISTING_PORTS=$(lsof -ti :5173 -ti :5174 -ti :3001 2>/dev/null || true)
if [ -n "$EXISTING_PORTS" ]; then
  echo -e "${YELLOW}Clearing conflicting processes on ports 5173 / 5174 / 3001...${RESET}"
  for p in $EXISTING_PORTS; do
    kill -9 "$p" 2>/dev/null || true
  done
  sleep 0.5
fi

# 4. Start Cloud Bridge in Background (if available)
if [ -f "server/cloudBridge.js" ]; then
  echo -e "${CYAN}☁️  Starting Cloud Bridge Server on port 3001...${RESET}"
  nohup node server/cloudBridge.js > "$BRIDGE_LOG_FILE" 2>&1 &
  BRIDGE_PID=$!
  disown "$BRIDGE_PID" 2>/dev/null || true
  echo "$BRIDGE_PID" > "$BRIDGE_PID_FILE"
fi

# 5. Start Vite Dev Server in Background
echo -e "${CYAN}🚀 Launching Unified Studio (Creator + Bulk Publisher)...${RESET}"
nohup npm run dev > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
disown "$SERVER_PID" 2>/dev/null || true
echo "$SERVER_PID" > "$PID_FILE"

# 6. Wait for the server to be ready
echo -n "Waiting for services to initialize"
READY=false
TARGET_URL="http://localhost:5173"

for i in {1..30}; do
  if grep -q "Local:" "$LOG_FILE" 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL" 2>/dev/null | grep -q "200"; then
    READY=true
    break
  fi
  if grep -q "localhost:5174" "$LOG_FILE" 2>/dev/null; then
    TARGET_URL="http://localhost:5174"
    READY=true
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo ""
    echo -e "${RED}❌ Server process terminated unexpectedly.${RESET}"
    cat "$LOG_FILE"
    exit 1
  fi
  echo -n "."
  sleep 0.5
done
echo ""

if [ "$READY" = true ]; then
  echo ""
  echo -e "${GREEN}${BOLD}✔ Islamic Reels Complete Toolkit is now LIVE!${RESET}"
  echo -e "   🌐 Unified Studio URL: ${CYAN}${BOLD}${TARGET_URL}/${RESET}"
  echo -e "   ☁️  Cloud Bridge Link:   ${CYAN}http://localhost:3001/${RESET}"
  echo -e "   ⚙️  Studio Process ID:  ${MAGENTA}${SERVER_PID}${RESET}"
  if [ -n "$BRIDGE_PID" ]; then
    echo -e "   ⚙️  Bridge Process ID:  ${MAGENTA}${BRIDGE_PID}${RESET}"
  fi
  echo -e "   📋 Log Files:          .server.log, .bridge.log"
  echo ""
  echo -e "   ⚡ Python CLI Toolkit:  ${BOLD}python3 scripts/bulk_uploader.py --help${RESET}"
  echo -e "   🛑 To stop anytime:     ${BOLD}./shutdown.sh${RESET} (or ${BOLD}./stop.sh${RESET})"
  echo ""

  # Open browser on macOS or Linux
  if command -v open >/dev/null 2>&1; then
    open "$TARGET_URL"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$TARGET_URL"
  fi
else
  echo -e "${YELLOW}Server started (PID $SERVER_PID). Check logs:${RESET} tail -f .server.log"
fi
