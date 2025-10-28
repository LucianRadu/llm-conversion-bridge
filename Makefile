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

# Variables
FASTLY_CLI := fastly
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
	@echo "  serve              - Run locally with Fastly server (127.0.0.1:7676) with auto-cleanup"
	@echo "  serve-only         - Run locally without killing existing processes"
	@echo "  deploy             - Deploy to Fastly Compute service"
	@echo "  tail-logs          - Tail logs from deployed service"
	@echo "  clean              - Clean build artifacts"
	@echo "  check-env          - Check environment variables and tool versions"
	@echo "  create-action      - Create new action scaffolding (use: make create-action NAME=myAction [WIDGET=true])"
	@echo "  generate-actions   - Generate MCP actions index file"
	@echo "  generate-aem-widgets - Generate MCP AEM Widgets index file"
	@echo "  generate-all       - Generate both MCP actions and MCP AEM Widgets index files"
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
build: test
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
	@echo "  - Package: pkg/llm-conversion-bridge.tar.gz"
	@echo ""

.PHONY: build-ts
build-ts: test generate-all
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
	@pkill -f "fastly compute serve" 2>/dev/null || true
	@sleep 1

# Local server (with cleanup)
.PHONY: serve
serve: kill-fastly
	@echo "Starting local Fastly Compute server..."
	$(FASTLY_CLI) compute serve --verbose

# Local server (legacy - without cleanup)
.PHONY: serve-only
serve-only:
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
	@echo "AEM Compute API Endpoint: $(API_ENDPOINT)"
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
		npm run generate-aem-widgets; \
	fi

.PHONY: generate-actions
generate-actions:
	@echo ""
	@echo "================================================================================"
	@echo " Generating Actions Index"
	@echo "================================================================================"
	@echo ""
	npm run generate-actions

.PHONY: generate-aem-widgets
generate-aem-widgets:
	@echo ""
	@echo "================================================================================"
	@echo " Generating AEM Widgets Index"
	@echo "================================================================================"
	@echo ""
	@echo "Deleting old AEM Widgets index file..."
	@rm -f server/src/actions/index-widgets.ts
	npm run generate-aem-widgets

.PHONY: generate-all
generate-all: generate-actions generate-aem-widgets 