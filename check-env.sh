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

# Counters
ERRORS=0
WARNINGS=0

# Extract versions from package.json files
LCB_SERVER_NAME=$(grep '"name"' lcb-server/package.json | head -1 | sed 's/.*"name": "\(.*\)".*/\1/')
LCB_SERVER_VERSION=$(grep '"version"' lcb-server/package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
LCB_UI_NAME=$(grep '"name"' lcb-ui/package.json | head -1 | sed 's/.*"name": "\(.*\)".*/\1/')
LCB_UI_VERSION=$(grep '"version"' lcb-ui/package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')

echo -e "\n${BOLD}${CYAN}================================================${NC}"
echo -e "${BOLD}${CYAN}   LCB Environment Check${NC}"
echo -e "${BOLD}${CYAN}   ${LCB_SERVER_NAME} v${LCB_SERVER_VERSION}${NC}"
echo -e "${BOLD}${CYAN}   ${LCB_UI_NAME} v${LCB_UI_VERSION}${NC}"
echo -e "${BOLD}${CYAN}================================================${NC}\n"

# Function to check major version
check_major_version() {
    local tool=$1
    local required_major=$2
    local current=$3
    local current_major=$(echo "$current" | cut -d. -f1)
    
    if [ "$current_major" = "$required_major" ]; then
        echo -e "${GREEN}${CHECK}${NC} ${tool}: ${BOLD}${current}${NC} ${GREEN}(compatible with ${required_major}.x)${NC}"
        return 0
    else
        echo -e "${RED}${CROSS}${NC} ${tool}: ${BOLD}${current}${NC} ${RED}(required: ${required_major}.x)${NC}"
        ((ERRORS++))
        return 1
    fi
}

# Function to check command exists
check_command() {
    local cmd=$1
    local name=$2
    
    if command -v "$cmd" &> /dev/null; then
        return 0
    else
        echo -e "${RED}${CROSS}${NC} ${name}: ${RED}NOT FOUND${NC}"
        ((ERRORS++))
        return 1
    fi
}

# Function to check environment variable
check_env_var() {
    local var_name=$1
    local required=$2
    
    if [ -n "${!var_name}" ]; then
        # Don't mask AEM_COMPUTE_SERVICE as it's not a secret
        if [ "$var_name" = "AEM_COMPUTE_SERVICE" ]; then
            echo -e "${GREEN}${CHECK}${NC} ${var_name}: ${GREEN}SET${NC} ${CYAN}(${!var_name})${NC}"
        else
            local masked_value="${!var_name:0:4}****${!var_name: -4}"
            echo -e "${GREEN}${CHECK}${NC} ${var_name}: ${GREEN}SET${NC} ${CYAN}(${masked_value})${NC}"
        fi
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}${CROSS}${NC} ${var_name}: ${RED}NOT SET${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}${WARN}${NC} ${var_name}: ${YELLOW}NOT SET (optional for local development)${NC}"
            ((WARNINGS++))
        fi
        return 1
    fi
}

# Function to check file/directory exists
check_path() {
    local path=$1
    local name=$2
    local type=$3
    
    if [ -e "$path" ]; then
        echo -e "${GREEN}${CHECK}${NC} ${name}: ${GREEN}EXISTS${NC} ${CYAN}(${path})${NC}"
        return 0
    else
        echo -e "${RED}${CROSS}${NC} ${name}: ${RED}NOT FOUND${NC} ${CYAN}(${path})${NC}"
        ((ERRORS++))
        return 1
    fi
}

# ============================================================================
# 1. System Requirements
# ============================================================================
echo -e "${BOLD}${BLUE}1. System Requirements${NC}\n"

# Check Node.js
if check_command "node" "Node.js"; then
    NODE_VERSION=$(node --version | sed 's/v//')
    check_major_version "Node.js" "20" "$NODE_VERSION"
fi

# Check npm
if check_command "npm" "npm"; then
    NPM_VERSION=$(npm --version)
    check_major_version "npm" "10" "$NPM_VERSION"
fi

# Check Fastly CLI
if check_command "fastly" "Fastly CLI"; then
    FASTLY_VERSION=$(fastly version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    if [ -n "$FASTLY_VERSION" ]; then
        FASTLY_MAJOR=$(echo "$FASTLY_VERSION" | cut -d. -f1)
        if [ "$FASTLY_MAJOR" -ge "11" ]; then
            echo -e "${GREEN}${CHECK}${NC} Fastly CLI: ${BOLD}${FASTLY_VERSION}${NC} ${GREEN}(11.x or higher, required for deployment)${NC}"
        else
            echo -e "${YELLOW}${WARN}${NC} Fastly CLI: ${BOLD}${FASTLY_VERSION}${NC} ${YELLOW}(recommended: 11.x or higher)${NC}"
            ((WARNINGS++))
        fi
    else
        echo -e "${YELLOW}${WARN}${NC} Fastly CLI: ${YELLOW}Version could not be determined${NC}"
        ((WARNINGS++))
    fi
fi

# ============================================================================
# 2. Environment Variables
# ============================================================================
echo -e "\n${BOLD}${BLUE}2. Environment Variables${NC}\n"

check_env_var "AEM_COMPUTE_SERVICE" "true"
check_env_var "AEM_COMPUTE_TOKEN" "false"

# Validate AEM_COMPUTE_SERVICE format
if [ -n "$AEM_COMPUTE_SERVICE" ]; then
    if echo "$AEM_COMPUTE_SERVICE" | grep -qE '^p[0-9]+-e[0-9]+-[a-zA-Z0-9_-]+$'; then
        echo -e "${GREEN}${CHECK}${NC} AEM_COMPUTE_SERVICE format: ${GREEN}VALID${NC} ${CYAN}(p<project>-e<env>-<service-name>)${NC}"
    else
        echo -e "${RED}${CROSS}${NC} AEM_COMPUTE_SERVICE format: ${RED}INVALID${NC}"
        echo -e "   ${YELLOW}Current value: ${RED}$AEM_COMPUTE_SERVICE${NC}"
        echo -e "   ${YELLOW}Expected format: ${CYAN}p<project>-e<env>-<service-name>${NC}"
        echo -e "   ${YELLOW}Example: ${CYAN}p169116-e1811065-lcb-boilerplate${NC}"
        ((ERRORS++))
    fi
fi

echo -e "\n${CYAN}${INFO} Note: Environment variables requirements:${NC}"
echo -e "   ${CYAN}• AEM_COMPUTE_SERVICE: ${BOLD}REQUIRED${NC}${CYAN} (for all operations)${NC}"
echo -e "   ${CYAN}• AEM_COMPUTE_TOKEN: Optional (only for Fastly deployment)${NC}"
echo -e "   ${CYAN}• Set them in .env file at project root${NC}"

# ============================================================================
# 3. Project Structure
# ============================================================================
echo -e "\n${BOLD}${BLUE}3. Project Structure${NC}\n"

# Check lcb-server
check_path "lcb-server" "lcb-server directory" "directory"
check_path "lcb-server/Makefile" "lcb-server Makefile" "file"
check_path "lcb-server/package.json" "lcb-server package.json" "file"
check_path "lcb-server/server/src" "lcb-server source directory" "directory"
check_path "lcb-server/fastly.toml" "lcb-server Fastly config" "file"

# Check lcb-ui
echo ""
check_path "lcb-ui" "lcb-ui directory" "directory"
check_path "lcb-ui/package.json" "lcb-ui package.json" "file"
check_path "lcb-ui/client" "lcb-ui client directory" "directory"
check_path "lcb-ui/server" "lcb-ui server directory" "directory"

# ============================================================================
# 4. Dependencies Check
# ============================================================================
echo -e "\n${BOLD}${BLUE}4. Dependencies${NC}\n"

# Check lcb-server node_modules
if [ -d "lcb-server/node_modules" ]; then
    echo -e "${GREEN}${CHECK}${NC} lcb-server dependencies: ${GREEN}INSTALLED${NC}"
else
    echo -e "${YELLOW}${WARN}${NC} lcb-server dependencies: ${YELLOW}NOT INSTALLED${NC}"
    echo -e "   ${CYAN}Run: cd lcb-server && npm install${NC}"
    ((WARNINGS++))
fi

# Check lcb-ui node_modules
if [ -d "lcb-ui/node_modules" ]; then
    echo -e "${GREEN}${CHECK}${NC} lcb-ui dependencies: ${GREEN}INSTALLED${NC}"
else
    echo -e "${YELLOW}${WARN}${NC} lcb-ui dependencies: ${YELLOW}NOT INSTALLED${NC}"
    echo -e "   ${CYAN}Run: cd lcb-ui && npm install${NC}"
    ((WARNINGS++))
fi

# Check lcb-ui client node_modules
if [ -d "lcb-ui/client/node_modules" ]; then
    echo -e "${GREEN}${CHECK}${NC} lcb-ui client dependencies: ${GREEN}INSTALLED${NC}"
else
    echo -e "${YELLOW}${WARN}${NC} lcb-ui client dependencies: ${YELLOW}NOT INSTALLED${NC}"
    echo -e "   ${CYAN}Run: cd lcb-ui && npm install${NC}"
    ((WARNINGS++))
fi

# Check lcb-ui server node_modules
if [ -d "lcb-ui/server/node_modules" ]; then
    echo -e "${GREEN}${CHECK}${NC} lcb-ui server dependencies: ${GREEN}INSTALLED${NC}"
else
    echo -e "${YELLOW}${WARN}${NC} lcb-ui server dependencies: ${YELLOW}NOT INSTALLED${NC}"
    echo -e "   ${CYAN}Run: cd lcb-ui && npm install${NC}"
    ((WARNINGS++))
fi

# ============================================================================
# 5. Database Files
# ============================================================================
echo -e "\n${BOLD}${BLUE}5. Database Files${NC}\n"

if [ -f "lcb-ui/db.json" ]; then
    echo -e "${GREEN}${CHECK}${NC} lcb-ui database: ${GREEN}EXISTS${NC} ${CYAN}(db.json)${NC}"
else
    echo -e "${CYAN}${INFO}${NC} lcb-ui database: ${CYAN}Will be auto-created on first run${NC}"
fi

# ============================================================================
# 6. Port Availability (optional check)
# ============================================================================
echo -e "\n${BOLD}${BLUE}6. Port Availability${NC}\n"

check_port() {
    local port=$1
    local service=$2
    
    if command -v lsof &> /dev/null; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${YELLOW}${WARN}${NC} Port ${port} (${service}): ${YELLOW}IN USE${NC}"
            ((WARNINGS++))
            return 1
        else
            echo -e "${GREEN}${CHECK}${NC} Port ${port} (${service}): ${GREEN}AVAILABLE${NC}"
            return 0
        fi
    else
        echo -e "${CYAN}${INFO}${NC} Port ${port} (${service}): ${CYAN}Cannot check (lsof not available)${NC}"
        return 0
    fi
}

check_port 3000 "lcb-ui backend"
check_port 4545 "lcb-ui frontend"
check_port 7676 "lcb-server"

# ============================================================================
# Summary
# ============================================================================
echo -e "\n${BOLD}${CYAN}================================================${NC}"
echo -e "${BOLD}${CYAN}   Summary${NC}"
echo -e "${BOLD}${CYAN}================================================${NC}\n"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${BOLD}${GREEN}${CHECK} ALL CHECKS PASSED!${NC}"
    echo -e "\n${GREEN}Your environment is ready to run LCB.${NC}\n"
    echo -e "${BOLD}Quick Start:${NC}"
    echo -e "  ${CYAN}# Terminal 1 - Start LCB Server${NC}"
    echo -e "  cd lcb-server && make serve\n"
    echo -e "  ${CYAN}# Terminal 2 - Start LCB UI${NC}"
    echo -e "  cd lcb-ui && npm run dev\n"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${BOLD}${YELLOW}${WARN} ${WARNINGS} WARNING(S) FOUND${NC}"
    echo -e "\n${YELLOW}Your environment has some warnings but should work.${NC}"
    echo -e "${YELLOW}Review the warnings above for optimization.${NC}\n"
    exit 0
else
    echo -e "${BOLD}${RED}${CROSS} ${ERRORS} ERROR(S) FOUND${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${BOLD}${YELLOW}${WARN} ${WARNINGS} WARNING(S) FOUND${NC}"
    fi
    echo -e "\n${RED}Please fix the errors above before running LCB.${NC}\n"
    
    # Provide helpful hints
    echo -e "${BOLD}Installation Hints:${NC}"
    if ! command -v node &> /dev/null; then
        echo -e "  ${CYAN}• Node.js:${NC} https://nodejs.org/ or use nvm"
    fi
    if ! command -v fastly &> /dev/null; then
        echo -e "  ${CYAN}• Fastly CLI:${NC} brew install fastly/tap/fastly"
    fi
    if [ $ERRORS -gt 0 ]; then
        echo -e "  ${CYAN}• Missing dependencies:${NC} cd [project] && npm install"
    fi
    echo ""
    exit 1
fi

