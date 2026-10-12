#!/usr/bin/env bash
# ==============================================================================
# Islamic Reels Creator & Bulk Publisher — Unified Shutdown Script
# Gracefully stops all project services, frees ports 5173, 5174, 3001, and cleans up.
# ==============================================================================

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
echo -e "${CYAN}${BOLD}   Islamic Reels & Bulk Publisher — Stopping All Services        ${RESET}"
echo -e "${CYAN}${BOLD}==================================================================${RESET}"
echo ""

PID_FILE="$ROOT_DIR/.server.pid"
BRIDGE_PID_FILE="$ROOT_DIR/.bridge.pid"
STOPPED_COUNT=0

# 1. Stop processes from PID files if they exist
for pf in "$PID_FILE" "$BRIDGE_PID_FILE"; do
  if [ -f "$pf" ]; then
    PID=$(cat "$pf" 2>/dev/null || true)
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
      echo -e "Stopping service process (PID ${MAGENTA}${PID}${RESET})..."
      kill "$PID" 2>/dev/null || true
      STOPPED_COUNT=$((STOPPED_COUNT + 1))
      for _ in {1..6}; do
        if ! kill -0 "$PID" 2>/dev/null; then
          break
        fi
        sleep 0.3
      done
      if kill -0 "$PID" 2>/dev/null; then
        kill -9 "$PID" 2>/dev/null || true
      fi
    fi
    rm -f "$pf"
  fi
done

# 2. Stop any processes listening on ports 5173, 5174, 5175, 3001
PORTS=(5173 5174 5175 3001)
for PORT in "${PORTS[@]}"; do
  PORT_PIDS=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [ -n "$PORT_PIDS" ]; then
    for p in $PORT_PIDS; do
      echo -e "Freeing port ${CYAN}${PORT}${RESET} (PID ${MAGENTA}${p}${RESET})..."
      kill "$p" 2>/dev/null || true
      sleep 0.2
      if kill -0 "$p" 2>/dev/null; then
        kill -9 "$p" 2>/dev/null || true
      fi
      STOPPED_COUNT=$((STOPPED_COUNT + 1))
    done
  fi
done

# 3. Clean any lingering Vite or CloudBridge processes belonging to this directory
for proc_pattern in "vite" "cloudBridge.js"; do
  PIDS=$(pgrep -f "$proc_pattern" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    for p in $PIDS; do
      P_CWD=$(lsof -p "$p" 2>/dev/null | grep cwd | awk '{print $NF}' || true)
      if [ "$P_CWD" = "$ROOT_DIR" ]; then
        echo -e "Terminating lingering process (PID ${MAGENTA}${p}${RESET})..."
        kill -9 "$p" 2>/dev/null || true
        STOPPED_COUNT=$((STOPPED_COUNT + 1))
      fi
    done
  fi
done

echo ""
if [ "$STOPPED_COUNT" -gt 0 ]; then
  echo -e "${GREEN}${BOLD}✔ All Islamic Reels Toolkit services have been stopped successfully!${RESET}"
  echo -e "   Ports 5173, 5174, and 3001 are now completely free."
else
  echo -e "${GREEN}${BOLD}✔ No running services were found. All ports are free.${RESET}"
fi
echo ""
