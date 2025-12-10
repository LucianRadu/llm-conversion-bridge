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
#  Dissemination of this information or reproduction of this material
# is strictly forbidden unless prior written permission is obtained
# from Adobe.
#

# Load environment variables from parent .env file (single source of truth)
ifneq (,$(wildcard ../.env))
include ../.env
export
endif

# Variables
FASTLY_CLI := fastly
# Use full AEM_COMPUTE_SERVICE as Fastly service ID (e.g., p<project>-e<env>-<service-name>)
# This is the complete Fastly service identifier
SERVICE_ID := $(AEM_COMPUTE_SERVICE)
# AEM Compute API endpoint (can be overridden if needed)
FASTLY_API_ENDPOINT := https://api-fastly.adobeaemcloud.com/

# Default target
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  setup              - Install dependencies and setup development environment"
	@echo "  build              - Run tests and build Fastly Compute package (deployable .tar.gz)"
	@echo "  build-ts           - Run tests and build TypeScript only (for development)"
	@echo "  test               - Run tests only"
	@echo "  dev                - Start development server"
	@echo "  serve              - Run locally with Fastly server (localhost:$(LCB_SERVER_PORT)) with auto-cleanup"
	@echo "  serve-only         - Run locally without killing existing processes"
	@echo "  deploy             - Deploy to Fastly Compute service"
	@echo "  tail-logs          - Tail logs from deployed service"
	@echo "  clean              - Clean build artifacts"
	@echo "  check-env          - Check environment variables and tool versions"
	@echo "  create-action      - Create new action scaffolding (use: make create-action NAME=myAction [WIDGET=true])"
	@echo "  generate-actions   - Generate MCP actions index file"
	@echo "  generate-eds-widgets - Generate MCP EDS Widgets index file"
	@echo "  generate-widget-templates - Generate widget template.html files from widget-schema.json"
	@echo "  generate-all       - Generate both MCP actions and MCP EDS Widgets index files"
	@echo "  generate-new-actions - Generate new actions from UI database (widgetless only)"
	@echo "  generate-eds-widgets-from-db - Generate EDS widget actions from UI database"
	@echo "  delete-actions-from-db - Delete actions marked for deletion in UI database"
	@echo ""
	@echo "Quick deployment (environment variables already set):"
	@echo "  make deploy"
	@echo "  make tail-logs"

# Setup development environment
.PHONY: setup
setup:
	@echo "Setting up development environment..."
	npm install
	@if ! command -v fastly >/dev/null 2>&1; then \
		echo "Installing Fastly CLI..."; \
		npm install -g @fastly/cli; \
	fi
	@echo "Setup complete!"

# Build targets (leverage npm scripts)
.PHONY: build
build: generate-all test
	@echo ""
	@echo "================================================================================"
	@echo " Building Fastly Compute Package"
	@echo "================================================================================"
	@echo ""
	npm run build:fastly
	@echo ""
	@echo "================================================================================"
	@echo " Running Fastly Compute Build"
	@echo "================================================================================"
	@echo ""
	$(FASTLY_CLI) compute build
	@echo ""
	@echo "================================================================================"
	@echo " Build Complete"
	@echo "================================================================================"
	@echo ""
	@echo "✓ Build artifacts ready:"
	@echo "  - WASM binary: bin/main.wasm"
	@echo "  - Package: pkg/lcb-server.tar.gz"
	@echo ""

.PHONY: build-ts
build-ts: generate-all test
	npm run build

# Test target (leverage npm scripts)
.PHONY: test
test:
	@echo ""
	@echo "================================================================================"
	@echo " Running Tests"
	@echo "================================================================================"
	@echo ""
	npm test

# Development target (leverage npm scripts)
.PHONY: dev
dev:
	npm run dev

# Kill any existing Fastly processes
.PHONY: kill-fastly
kill-fastly:
	@echo "Killing any existing Fastly processes..."
	@pkill -9 -f "fastly compute serve" 2>/dev/null || true
	@pkill -9 viceroy 2>/dev/null || true
	@lsof -ti:$(LCB_SERVER_PORT) | xargs kill -9 2>/dev/null || true
	@sleep 1

# Local server (with cleanup)
.PHONY: serve
serve: kill-fastly
	@./scripts/sync-env-to-toml.sh
	@echo "Starting local Fastly Compute server..."
	$(FASTLY_CLI) compute serve --verbose

# Local server (legacy - without cleanup)
.PHONY: serve-only
serve-only:
	@./scripts/sync-env-to-toml.sh
	@echo "Starting local Fastly Compute server (no cleanup)..."
	$(FASTLY_CLI) compute serve --verbose

# Deployment
.PHONY: deploy
deploy:
	@if [ -z "$(SERVICE_ID)" ]; then \
		echo "Error: AEM_COMPUTE_SERVICE environment variable must be set"; \
		exit 1; \
	fi
	@if [ -z "$${AEM_COMPUTE_TOKEN}" ]; then \
		echo "Error: AEM_COMPUTE_TOKEN environment variable must be set"; \
		exit 1; \
	fi
	@echo ""
	@echo "================================================================================"
	@echo " Deploying to Fastly Compute@Edge"
	@echo "================================================================================"
	@echo ""
	@echo "Service ID: $(SERVICE_ID)"
	@echo "API Endpoint: $(FASTLY_API_ENDPOINT)"
	@echo ""
	@export FASTLY_API_ENDPOINT="$(FASTLY_API_ENDPOINT)" && $(FASTLY_CLI) compute deploy --service-id="$(SERVICE_ID)" --token="$${AEM_COMPUTE_TOKEN}" --verbose

# Log tailing
.PHONY: tail-logs
tail-logs:
	@if [ -z "$(SERVICE_ID)" ]; then \
		echo "Error: AEM_COMPUTE_SERVICE environment variable must be set"; \
		exit 1; \
	fi
	@if [ -z "$${AEM_COMPUTE_TOKEN}" ]; then \
		echo "Error: AEM_COMPUTE_TOKEN environment variable must be set"; \
		exit 1; \
	fi
	@echo "Tailing logs for Fastly service: $(SERVICE_ID)"
	@export FASTLY_API_ENDPOINT="$(FASTLY_API_ENDPOINT)" && $(FASTLY_CLI) log-tail --service-id="$(SERVICE_ID)" --token="$${AEM_COMPUTE_TOKEN}" --verbose

# Clean up build artifacts
.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	rm -rf bin/
	rm -rf pkg/
	npm run generate-all

# Development workflow shortcuts
.PHONY: start
start: build dev

# Check environment
.PHONY: check-env
check-env:
	@echo "Environment check:"
	@echo "AEM Compute Service ID: $(SERVICE_ID)"
	@echo "AEM Compute API Endpoint: $(FASTLY_API_ENDPOINT)"
	@if [ -n "$${AEM_COMPUTE_TOKEN}" ]; then echo "AEM Compute Token: Set (hidden)"; else echo "AEM Compute Token: Not set"; fi
	@echo "Node version: $$(node --version)"
	@echo "NPM version: $$(npm --version)"
	@if command -v fastly >/dev/null 2>&1; then \
		echo "Fastly CLI: $$(fastly version)"; \
	else \
		echo "Fastly CLI: Not installed"; \
	fi

.PHONY: create-action
create-action:
	@if [ -z "$(NAME)" ]; then \
		echo "Error: NAME parameter is required"; \
		echo "Usage: make create-action NAME=myAction [WIDGET=true]"; \
		exit 1; \
	fi
	@echo ""
	@echo "================================================================================"
	@echo " Creating Action: $(NAME)"
	@echo "================================================================================"
	@echo ""
	@if [ "$(WIDGET)" = "true" ]; then \
		node scripts/generate-action.js $(NAME) --widget; \
	else \
		node scripts/generate-action.js $(NAME); \
	fi
	@echo ""
	@echo "Regenerating action index..."
	@npm run generate-actions
	@if [ "$(WIDGET)" = "true" ]; then \
		echo "Regenerating widget index..."; \
		npm run generate-eds-widgets; \
	fi

.PHONY: generate-actions
generate-actions:
	@echo ""
	@echo "================================================================================"
	@echo " Generating Actions Index"
	@echo "================================================================================"
	@echo ""
	npm run generate-actions

.PHONY: generate-eds-widgets
generate-eds-widgets:
	@echo ""
	@echo "================================================================================"
	@echo " Generating EDS Widgets Index"
	@echo "================================================================================"
	@echo ""
	@echo "Deleting old EDS Widgets index file..."
	@rm -f server/src/actions/index-widgets.ts
	npm run generate-eds-widgets

.PHONY: generate-all
generate-all: generate-env generate-actions generate-eds-widgets

# Generate env constants from .env
.PHONY: generate-env
generate-env:
	@node scripts/generate-env-constants.cjs

.PHONY: generate-widget-templates
generate-widget-templates:
	@echo ""
	@echo "================================================================================"
	@echo " Generating Widget Templates from widget-schema.json"
	@echo "================================================================================"
	@echo ""
	node scripts/generate-widget-templates.js

.PHONY: generate-new-actions
generate-new-actions:
	@echo ""
	@echo "================================================================================"
	@echo " Generating New Actions from UI Database"
	@echo "================================================================================"
	@echo ""
	node scripts/generate-actions-from-db.js

.PHONY: generate-eds-widgets-from-db
generate-eds-widgets-from-db:
	@echo ""
	@echo "================================================================================"
	@echo " Generating EDS Widget Actions from UI Database"
	@echo "================================================================================"
	@echo ""
	node scripts/generate-eds-widgets-from-db.js

.PHONY: delete-actions-from-db
delete-actions-from-db:
	@echo ""
	@echo "================================================================================"
	@echo " Deleting Actions Marked for Deletion"
	@echo "================================================================================"
	@echo ""
	node scripts/delete-actions-from-db.js 