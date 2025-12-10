#!/bin/bash

#
# ADOBE CONFIDENTIAL
# ___________________
# Copyright 2025 Adobe
# All Rights Reserved.
# NOTICE: All information contained herein is, and remains
# the property of Adobe and its suppliers, if any. The intellectual
# and technical concepts contained herein are proprietary to Adobe
# and its suppliers and are protected by all applicable intellectual
# property laws, including trade secret and copyright laws.
# Dissemination of this information or reproduction of this material
# is strictly forbidden unless prior written permission is obtained
# from Adobe.
#

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Symbols
CHECK="✓"
CROSS="✗"
WARN="⚠"
INFO="ℹ"

# ============================================================================
# Load environment variables from .env file ONLY
# ============================================================================
if [ -f ".env" ]; then
    echo -e "${CYAN}${INFO} Loading environment variables from .env file...${NC}"
    # Clear any existing LCB-related env vars to ensure we only use .env values
    # IMPORTANT: This list must be kept in sync with variables defined in .env
    # If you add a new variable to .env, add it to this unset list as well
    unset AEM_COMPUTE_SERVICE AEM_COMPUTE_TOKEN EDS_BRANCH EDS_REPO EDS_OWNER TOOL_PLANNER_ENDPOINT LCB_UI_FRONTEND_PORT LCB_UI_BACKEND_PORT LCB_SERVER_PORT
    # Export all variables from .env (skip comments and empty lines)
    set -a
    source .env
    set +a
    echo -e "${GREEN}${CHECK}${NC} Environment variables loaded from .env\n"
else
    echo -e "${RED}${CROSS} CRITICAL ERROR: .env file not found!${NC}\n"
    echo -e "${YELLOW}The .env file is REQUIRED to run LCB.${NC}"
    echo -e "${YELLOW}Please create a .env file following the .env.example template:${NC}\n"
    echo -e "  ${CYAN}cp .env.example .env${NC}\n"
    echo -e "${YELLOW}Then edit .env and set your values.${NC}\n"
    exit 1
fi

echo -e "\n${BOLD}${CYAN}================================================${NC}"
echo -e "${BOLD}${CYAN}   LCB Startup Script${NC}"
echo -e "${BOLD}${CYAN}   LLM Conversion Bridge${NC}"
echo -e "${BOLD}${CYAN}================================================${NC}\n"

# ============================================================================
# MANDATORY: Validate AEM_COMPUTE_SERVICE environment variable
# ============================================================================
echo -e "${BOLD}${BLUE}Validating AEM_COMPUTE_SERVICE...${NC}\n"

if [ -z "$AEM_COMPUTE_SERVICE" ]; then
    echo -e "${RED}${CROSS} CRITICAL ERROR: AEM_COMPUTE_SERVICE is not set!${NC}\n"
    echo -e "${YELLOW}The AEM_COMPUTE_SERVICE environment variable is REQUIRED.${NC}"
    echo -e "${YELLOW}Please add it to your .env file with the following format:${NC}\n"
    echo -e "  ${CYAN}AEM_COMPUTE_SERVICE=p<project>-e<env>-<service-name>${NC}\n"
    echo -e "${YELLOW}Example:${NC}"
    echo -e "  ${CYAN}AEM_COMPUTE_SERVICE=p169116-e1811065-lcb-boilerplate${NC}\n"
    exit 1
fi

# Validate format: p<project>-e<env>-<service-name>
if ! echo "$AEM_COMPUTE_SERVICE" | grep -qE '^p[0-9]+-e[0-9]+-[a-zA-Z0-9_-]+$'; then
    echo -e "${RED}${CROSS} CRITICAL ERROR: AEM_COMPUTE_SERVICE has invalid format!${NC}\n"
    echo -e "${YELLOW}Current value: ${RED}$AEM_COMPUTE_SERVICE${NC}\n"
    echo -e "${YELLOW}Expected format: ${CYAN}p<project>-e<env>-<service-name>${NC}\n"
    echo -e "${YELLOW}Example:${NC}"
    echo -e "  ${CYAN}AEM_COMPUTE_SERVICE=p169116-e1811065-lcb-boilerplate${NC}\n"
    echo -e "${YELLOW}Pattern requirements:${NC}"
    echo -e "  • Must start with 'p' followed by numbers"
    echo -e "  • Must have '-e' followed by numbers"
    echo -e "  • Must end with '-<service-name>' (letters, numbers, underscore, hyphen)\n"
    exit 1
fi

echo -e "${GREEN}${CHECK}${NC} AEM_COMPUTE_SERVICE is valid: ${CYAN}$AEM_COMPUTE_SERVICE${NC}\n"

# Step 1: Run environment check
echo -e "${BOLD}${BLUE}Step 1: Checking environment...${NC}\n"
./check-env.sh
CHECK_EXIT_CODE=$?

if [ $CHECK_EXIT_CODE -eq 1 ]; then
    echo -e "\n${RED}${CROSS} Environment check failed. Please fix the errors above.${NC}\n"
    exit 1
fi

echo -e "\n${GREEN}${CHECK} Environment check passed!${NC}\n"

# Step 2: Check and handle running processes
echo -e "${BOLD}${BLUE}Step 2: Checking for running processes...${NC}\n"

PROCESSES_RUNNING=false

# Check for lcb-ui backend
if lsof -Pi :${LCB_UI_BACKEND_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}${WARN}${NC} lcb-ui backend is already running on port ${LCB_UI_BACKEND_PORT}"
    PROCESSES_RUNNING=true
fi

# Check for lcb-ui frontend
if lsof -Pi :${LCB_UI_FRONTEND_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}${WARN}${NC} lcb-ui frontend is already running on port ${LCB_UI_FRONTEND_PORT}"
    PROCESSES_RUNNING=true
fi

if [ "$PROCESSES_RUNNING" = true ]; then
    echo -e "\n${YELLOW}lcb-ui processes are already running.${NC}"
    echo -e "${CYAN}Would you like to:${NC}"
    echo -e "  ${BOLD}1)${NC} Kill existing processes and restart"
    echo -e "  ${BOLD}2)${NC} Skip (assume lcb-ui is already running)"
    echo -e "  ${BOLD}3)${NC} Exit"
    echo -e ""
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            echo -e "\n${YELLOW}Killing existing lcb-ui processes...${NC}"
            
            # Kill lcb-ui backend
            if lsof -Pi :${LCB_UI_BACKEND_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
                lsof -ti:${LCB_UI_BACKEND_PORT} | xargs kill -9 2>/dev/null
                echo -e "${GREEN}${CHECK}${NC} Killed lcb-ui backend"
            fi
            
            # Kill lcb-ui frontend
            if lsof -Pi :${LCB_UI_FRONTEND_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
                lsof -ti:${LCB_UI_FRONTEND_PORT} | xargs kill -9 2>/dev/null
                echo -e "${GREEN}${CHECK}${NC} Killed lcb-ui frontend"
            fi
            
            echo -e "\n${GREEN}${CHECK}${NC} All processes killed. Waiting 2 seconds...\n"
            sleep 2
            ;;
        2)
            echo -e "\n${CYAN}${INFO}${NC} Skipping startup. lcb-ui is already running.\n"
            echo -e "${BOLD}Access:${NC}"
            echo -e "  ${CYAN}• lcb-ui:${NC} https://localhost:${LCB_UI_FRONTEND_PORT}\n"
            echo -e "${BOLD}${YELLOW}Note:${NC} ${YELLOW}If lcb-server is not running, start it from the UI (LCBs page)${NC}\n"
            exit 0
            ;;
        3)
            echo -e "\n${CYAN}Exiting...${NC}\n"
            exit 0
            ;;
        *)
            echo -e "\n${RED}Invalid choice. Exiting...${NC}\n"
            exit 1
            ;;
    esac
fi

# Step 3: Install dependencies
echo -e "${BOLD}${BLUE}Step 3: Installing dependencies...${NC}\n"

# Function to check if npm install is needed
need_npm_install() {
    local dir=$1

    # Check if node_modules exists
    if [ ! -d "$dir/node_modules" ]; then
        return 0  # Need install (directory missing)
    fi

    # Check if package.json is newer than node_modules
    if [ "$dir/package.json" -nt "$dir/node_modules" ]; then
        return 0  # Need install (package.json updated)
    fi

    # Check if package-lock.json is newer than node_modules
    if [ -f "$dir/package-lock.json" ] && [ "$dir/package-lock.json" -nt "$dir/node_modules" ]; then
        return 0  # Need install (lock file updated)
    fi

    return 1  # No install needed
}

# Check lcb-server dependencies
if need_npm_install "lcb-server"; then
    if [ -d "lcb-server/node_modules" ]; then
        echo -e "${YELLOW}${WARN}${NC} lcb-server dependencies are outdated. Running npm install..."
    else
        echo -e "${YELLOW}${WARN}${NC} lcb-server dependencies not installed. Running npm install..."
    fi
    cd lcb-server
    npm install
    if [ $? -ne 0 ]; then
        echo -e "\n${RED}${CROSS} Failed to install lcb-server dependencies${NC}\n"
        exit 1
    fi
    echo -e "${GREEN}${CHECK}${NC} lcb-server dependencies installed\n"
    cd ..
else
    echo -e "${GREEN}${CHECK}${NC} lcb-server dependencies are up to date"
fi

# Check lcb-ui dependencies
if need_npm_install "lcb-ui"; then
    if [ -d "lcb-ui/node_modules" ]; then
        echo -e "${YELLOW}${WARN}${NC} lcb-ui dependencies are outdated. Running npm install..."
    else
        echo -e "${YELLOW}${WARN}${NC} lcb-ui dependencies not installed. Running npm install..."
    fi
    cd lcb-ui
    npm install
    if [ $? -ne 0 ]; then
        echo -e "\n${RED}${CROSS} Failed to install lcb-ui dependencies${NC}\n"
        exit 1
    fi
    echo -e "${GREEN}${CHECK}${NC} lcb-ui dependencies installed\n"
    cd ..
else
    echo -e "${GREEN}${CHECK}${NC} lcb-ui dependencies are up to date"
fi

# Step 3.5: Clean database
echo -e "\n${BOLD}${BLUE}Step 3.5: Cleaning database...${NC}\n"
if [ -f "lcb-ui/db.json" ]; then
    echo -e "${YELLOW}${WARN}${NC} Removing existing db.json..."
    rm -f lcb-ui/db.json
    echo -e "${GREEN}${CHECK}${NC} Database deleted (will be recreated on startup)\n"
else
    echo -e "${GREEN}${CHECK}${NC} No existing database found\n"
fi

# Extract service name from AEM_COMPUTE_SERVICE (e.g., p169116-e1811065-lcb-boilerplate -> lcb-boilerplate)
SERVICE_NAME=$(echo "$AEM_COMPUTE_SERVICE" | sed 's/^p[0-9]*-e[0-9]*-//')
if [ -z "$SERVICE_NAME" ]; then
    echo -e "${RED}${CROSS} Failed to extract service name from AEM_COMPUTE_SERVICE${NC}"
    exit 1
fi
LCB_SERVER_URL="http://localhost:${LCB_SERVER_PORT}/${SERVICE_NAME}"

# Log file paths
LCB_SERVER_LOG="/tmp/lcb-server.log"
LCB_UI_LOG="/tmp/lcb-ui.log"

# Helper function for graceful process termination
# Tries SIGTERM first, waits 1 second, then escalates to SIGKILL if needed
graceful_kill() {
    local pid=$1
    local name=$2
    kill $pid 2>/dev/null
    sleep 1
    if kill -0 $pid 2>/dev/null; then
        echo -e "${YELLOW}${INFO}${NC} $name did not terminate gracefully, forcing kill..."
        kill -9 $pid 2>/dev/null
    fi
}

# Trap Ctrl+C to cleanup
trap cleanup INT

cleanup() {
    echo -e "\n\n${YELLOW}Shutting down all processes...${NC}"

    # Kill the tail process first (log tailing) - simple process, no children
    if [ ! -z "$TAIL_PID" ]; then
        echo -e "${CYAN}${INFO}${NC} Stopping log tail..."
        kill -9 $TAIL_PID 2>/dev/null
    fi

    # Gracefully stop lcb-server (spawns Fastly/viceroy child processes)
    if [ ! -z "$LCB_SERVER_PID" ]; then
        echo -e "${CYAN}${INFO}${NC} Stopping lcb-server..."
        graceful_kill $LCB_SERVER_PID "lcb-server"
    fi

    # Gracefully stop lcb-ui (npm spawns child processes)
    if [ ! -z "$UI_PID" ]; then
        echo -e "${CYAN}${INFO}${NC} Stopping lcb-ui..."
        graceful_kill $UI_PID "lcb-ui"
    fi

    # Kill any remaining processes on all ports (fallback cleanup)
    echo -e "${CYAN}${INFO}${NC} Cleaning up remaining processes..."
    lsof -ti:${LCB_UI_BACKEND_PORT} | xargs kill -9 2>/dev/null
    lsof -ti:${LCB_UI_FRONTEND_PORT} | xargs kill -9 2>/dev/null
    lsof -ti:${LCB_SERVER_PORT} | xargs kill -9 2>/dev/null
    pkill -9 -f "fastly compute serve" 2>/dev/null || true
    pkill -9 viceroy 2>/dev/null || true

    echo -e "${GREEN}${CHECK}${NC} All processes stopped\n"
    exit 0
}

# ============================================================================
# Step 4: Start both services in parallel
# ============================================================================
echo -e "\n${BOLD}${BLUE}Step 4: Starting services in parallel...${NC}\n"

# Clear previous log files
> "$LCB_SERVER_LOG"
> "$LCB_UI_LOG"

# Start lcb-server FIRST (takes longer to build: TypeScript + tests + WASM)
echo -e "${CYAN}${INFO}${NC} Starting lcb-server (building TypeScript + WASM)..."
cd lcb-server
(make generate-env && make build-ts && make serve) > "$LCB_SERVER_LOG" 2>&1 &
LCB_SERVER_PID=$!
cd ..

# Start lcb-ui (React + Hono backend)
echo -e "${CYAN}${INFO}${NC} Starting lcb-ui (React + Hono)..."
cd lcb-ui
npm run dev > "$LCB_UI_LOG" 2>&1 &
UI_PID=$!
cd ..

echo -e ""
echo -e "${CYAN}${INFO}${NC} Log files:"
echo -e "    lcb-server: ${CYAN}$LCB_SERVER_LOG${NC}"
echo -e "    lcb-ui:     ${CYAN}$LCB_UI_LOG${NC}"
echo -e ""

# ============================================================================
# Step 5: Wait for both services to be ready
# ============================================================================
echo -e "${BOLD}${BLUE}Step 5: Waiting for services...${NC}\n"

LCB_SERVER_READY=false
LCB_UI_READY=false
MAX_WAIT=60

# Spinner characters
SPINNER_CHARS='/-\|'
SPINNER_IDX=0

echo -e "${CYAN}${INFO}${NC} Polling lcb-server on ${LCB_SERVER_URL}..."
echo -e "${CYAN}${INFO}${NC} Polling lcb-ui on https://localhost:${LCB_UI_FRONTEND_PORT}..."
echo -e ""

for i in $(seq 1 $MAX_WAIT); do
    # Build pending services string
    PENDING=""
    if [ "$LCB_SERVER_READY" = false ]; then
        PENDING="lcb-server"
    fi
    if [ "$LCB_UI_READY" = false ]; then
        if [ -n "$PENDING" ]; then
            PENDING="$PENDING, lcb-ui"
        else
            PENDING="lcb-ui"
        fi
    fi

    # Get current spinner character
    SPINNER_CHAR="${SPINNER_CHARS:$SPINNER_IDX:1}"
    SPINNER_IDX=$(( (SPINNER_IDX + 1) % ${#SPINNER_CHARS} ))

    # Show spinner with status (overwrite same line)
    printf "\r%b%s%b Waiting... (%ds) [%b%s%b: pending]\033[K" "${YELLOW}" "${SPINNER_CHAR}" "${NC}" "$i" "${CYAN}" "${PENDING}" "${NC}"

    # Check lcb-server
    if [ "$LCB_SERVER_READY" = false ]; then
        if curl -s "$LCB_SERVER_URL" >/dev/null 2>&1; then
            # Clear spinner line and print success
            printf "\r\033[K"
            echo -e "${GREEN}${CHECK}${NC} lcb-server is ready! (${i}s)"
            LCB_SERVER_READY=true
        fi
    fi

    # Check lcb-ui (port ${LCB_UI_FRONTEND_PORT} - HTTPS with self-signed cert)
    if [ "$LCB_UI_READY" = false ]; then
        if curl -sk https://localhost:${LCB_UI_FRONTEND_PORT} >/dev/null 2>&1; then
            # Clear spinner line and print success
            printf "\r\033[K"
            echo -e "${GREEN}${CHECK}${NC} lcb-ui is ready! (${i}s)"
            LCB_UI_READY=true
        fi
    fi

    # Both ready? Exit loop
    if [ "$LCB_SERVER_READY" = true ] && [ "$LCB_UI_READY" = true ]; then
        break
    fi

    # Check if processes are still running
    if ! kill -0 $LCB_SERVER_PID 2>/dev/null && [ "$LCB_SERVER_READY" = false ]; then
        printf "\r\033[K"
        echo -e "${RED}${CROSS} lcb-server process died! Check log: $LCB_SERVER_LOG${NC}"
        echo -e "${YELLOW}Last 10 lines of log:${NC}"
        tail -10 "$LCB_SERVER_LOG"
        cleanup
    fi

    if ! kill -0 $UI_PID 2>/dev/null && [ "$LCB_UI_READY" = false ]; then
        printf "\r\033[K"
        echo -e "${RED}${CROSS} lcb-ui process died! Check log: $LCB_UI_LOG${NC}"
        echo -e "${YELLOW}Last 10 lines of log:${NC}"
        tail -10 "$LCB_UI_LOG"
        cleanup
    fi

    sleep 1
done

# Clear any remaining spinner
printf "\r\033[K"

# Check if both services are ready
if [ "$LCB_SERVER_READY" = false ] || [ "$LCB_UI_READY" = false ]; then
    echo -e "${RED}${CROSS} Timeout waiting for services!${NC}"
    if [ "$LCB_SERVER_READY" = false ]; then
        echo -e "${RED}  • lcb-server not ready (check $LCB_SERVER_LOG)${NC}"
    fi
    if [ "$LCB_UI_READY" = false ]; then
        echo -e "${RED}  • lcb-ui not ready (check $LCB_UI_LOG)${NC}"
    fi
    cleanup
fi

# ============================================================================
# Step 6: All services ready - open browser
# ============================================================================
echo -e "\n${BOLD}${CYAN}================================================${NC}"
echo -e "${BOLD}${CYAN}   All services are running!${NC}"
echo -e "${BOLD}${CYAN}================================================${NC}\n"
echo -e "${BOLD}Access:${NC}"
echo -e "  ${CYAN}• lcb-ui:${NC}     https://localhost:${LCB_UI_FRONTEND_PORT}"
echo -e "  ${CYAN}• lcb-server:${NC} ${LCB_SERVER_URL}\n"
echo -e "${BOLD}Logs:${NC}"
echo -e "  ${CYAN}• lcb-server:${NC} $LCB_SERVER_LOG"
echo -e "  ${CYAN}• lcb-ui:${NC}     $LCB_UI_LOG\n"
echo -e "${YELLOW}Press Ctrl+C to stop all processes${NC}\n"

# Open browser
echo -e "${CYAN}${INFO}${NC} Opening browser at https://localhost:${LCB_UI_FRONTEND_PORT}/lcbs\n"
if [[ "$OSTYPE" == "darwin"* ]]; then
    open https://localhost:${LCB_UI_FRONTEND_PORT}/lcbs
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open https://localhost:${LCB_UI_FRONTEND_PORT}/lcbs 2>/dev/null
fi

echo -e "${BOLD}${CYAN}================================================${NC}"
echo -e "${BOLD}${CYAN}   Tailing lcb-ui log (Ctrl+C to stop all)${NC}"
echo -e "${BOLD}${CYAN}================================================${NC}\n"

# Tail lcb-ui log for runtime visibility
tail -f "$LCB_UI_LOG" &
TAIL_PID=$!

# Wait for the background processes
wait $UI_PID $LCB_SERVER_PID 2>/dev/null

# Kill tail if still running
kill $TAIL_PID 2>/dev/null

