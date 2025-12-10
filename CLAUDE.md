# LCB - LLM Conversion Bridge

## Documentation Index

Quick links to all project documentation:

| Document | Location | Purpose |
|----------|----------|---------|
| **System Architecture** | [CLAUDE.md](CLAUDE.md) (this file) | Complete system overview covering both lcb-server and lcb-ui |
| **Server Quick Start** | [lcb-server/README.md](lcb-server/README.md) | Server installation, setup, and CLI commands |
| **UI Architecture** | [lcb-ui/CLAUDE.md](lcb-ui/CLAUDE.md) | Detailed UI architecture, component structure, and implementation patterns |
| **UI Quick Start** | [lcb-ui/README.md](lcb-ui/README.md) | UI installation, setup, testing, and troubleshooting |

## Project Overview

**LCB** (LLM Conversion Bridge) is a dual-component system for building, deploying, and managing Model Context Protocol (MCP) servers on Fastly Compute@Edge with ChatGPT Apps support. The system consists of:

1. **lcb-server**: The MCP server implementation (deployable to Fastly Compute@Edge)
2. **lcb-ui**: A web-based management interface for deploying and managing the MCP server

## Architecture

```
lcb/
├── lcb-server/          # MCP Server (Fastly Compute@Edge target)
│   ├── server/src/      # TypeScript MCP server implementation
│   ├── dist/            # Compiled TypeScript output
│   ├── bin/             # WASM binary (main.wasm)
│   ├── pkg/             # Deployable .tar.gz package
│   ├── Makefile         # Build and deployment commands
│   └── fastly.toml      # Fastly Compute configuration
│
└── lcb-ui/              # Management UI (React + Hono)
    ├── client/          # React frontend (Vite, port ${LCB_UI_FRONTEND_PORT})
    ├── server/          # Hono backend API (port ${LCB_UI_BACKEND_PORT})
    ├── shared/          # Shared TypeScript types
    └── db.json          # lowdb database for persistence
```

## lcb-server: MCP Server

### Purpose
Production-ready MCP server built with ChatGPT Apps support, designed to run on Fastly Compute@Edge. Provides MCP actions (tools) and AEM Widgets for integration with Adobe Experience Manager.

### Technology Stack
- **Runtime**: Fastly Compute@Edge (JavaScript/WASM)
- **Language**: TypeScript (Node.js v20.19.3)
- **MCP SDK**: @modelcontextprotocol/sdk v1.20.2
- **Framework**: Express (local dev), Fastly JS-Compute (production)
- **Build Tools**: TypeScript compiler, Fastly CLI v11.3.0
- **Test Framework**: Jest

### Key Features
- **MCP Server Implementation**: Full implementation of Model Context Protocol server
- **Action System**: Pluggable action architecture with auto-indexing
  - Each action: versioned, publishable, with optional AEM Widget support
- **AEM Widget Support**: HTML widgets served as MCP resources
- **Session Management**: TTL-based session handling for active sessions
- **IMS Authentication**: Adobe IMS integration for AEM API access
- **Content AI**: Natural language search integration with AEM
- **Structured Logging**: Custom FastlyLogger with Fastly-compatible format
- **Type Safety**: Zod schemas for validation, zod-to-json-schema for MCP schema generation

### Local Development
```bash
cd lcb-server
make setup              # Install dependencies
make build              # Run tests + build WASM package
make serve              # Start local server (localhost:${LCB_SERVER_PORT})
```

**Local MCP Endpoint**: `http://localhost:${LCB_SERVER_PORT}/<service-name>` (extracted from `AEM_COMPUTE_SERVICE` in `.env`)

### Build Output
- **TypeScript compiled**: `dist/` directory
- **WASM binary**: `bin/main.wasm`
- **Deployable package**: `pkg/lcb-server.tar.gz`

### Deployment to Fastly
```bash
cd lcb-server
make deploy             # Deploy to Fastly Compute@Edge
make tail-logs          # View deployment logs
```

**Environment Variables Required**:
- `AEM_COMPUTE_TOKEN`: Fastly API token
- `AEM_COMPUTE_SERVICE`: Fastly Service ID

### Action Development
Actions are TypeScript modules in `server/src/actions/`:
- Each action: `name`, `version`, `isPublished`, `hasAemWidget`, `definition`, `handler`
- Auto-indexed by `make generate-all` command
- Scaffolding: `make create-action NAME=myAction [WIDGET=true]`

### Configuration Files
- **fastly.toml**: Fastly Compute configuration (manifest_version 3, backends, env vars)
- **Makefile**: Build targets, deployment commands
- **tsconfig.json**: TypeScript configuration
- **jest.config.cjs**: Test configuration

### MCP Transport
**StreamableHTTP Transport** for Fastly Compute@Edge:
- Path: `/${AEM_COMPUTE_SERVICE}` (configurable in `server/src/constants/mcp.ts`)
- Session management via `Mcp-Session-Id` header
- Streaming support with EdgeRateLimit implementation
- Request timeout: 120 seconds
- JSON-RPC 2.0 compliant

## lcb-ui: Management Interface

### Purpose
Standalone web application for **deploying and managing the lcb-server MCP server**. Provides visual interface for:
- Managing MCP server configurations
- Triggering deployments to Fastly Compute@Edge
- Browsing and executing MCP actions
- Managing AEM Widgets
- Viewing deployment logs and status
- **Current limitation**: Deployment only via CLI (UI triggers CLI commands)

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite (port ${LCB_UI_FRONTEND_PORT})
- **Backend**: Hono + Node.js (port ${LCB_UI_BACKEND_PORT})
- **UI Library**: Adobe React Spectrum (complete design system)
- **Database**: lowdb (file-based JSON database, `db.json`)
- **Storage**: LocalForage (IndexedDB/localStorage fallback)
- **Validation**: Zod
- **State**: React hooks + custom hooks (useServerState, useConnectedServer)

### Key Features
- **Server Management**: Add, edit, delete, connect to MCP servers
  - Managed servers (Local/Remote): Auto-created, cannot be deleted
  - Start/Stop local servers with real-time health checks
  - External servers: User-created, fully manageable
- **Actions Page**: Browse and execute MCP actions from connected server
  - **Create Action Wizard**: 5-step wizard for creating new actions
    - Step 1: Action details, description, annotations, has EDS widget, input parameters (2-column layout)
    - Step 2: Action OpenAI Metadata (for widget actions)
    - Step 3: Widget Resource Metadata (for widget actions)
    - Step 4: **Template URLs (MANDATORY for widget actions)**
      - Script URL: URL to aem-embed.js script (required)
      - Widget Embed URL: URL to widget content (required)
    - Step 5: Files Preview
    - Duplicate parameter name validation
    - Folder name validation for action names (no spaces allowed)
    - Real-time validation with toast notifications
  - **Edit Actions**: Full action editor with annotations support
  - **Annotations Support**: destructiveHint, openWorldHint, readOnlyHint
  - **Input Parameters**: Dynamic schema editor with string validators (min/max length)
  - **Draft System**: Changes tracked until deployment
  - **Revert Functionality**: Restore uncommitted changes
  - **Action Deletion System**: 
    - Widgetless actions: File tree preview (schema.json, index.ts)
    - EDS actions: Complete file tree with widget files + associated resource warning
    - Soft delete with DELETED badge and restore capability
    - Associated widget resources automatically marked for deletion
    - Physical deletion on deployment with database cleanup
  - **Badge System**: NOT DEPLOYED (yellow), UPDATED (blue), DELETED (red)
  - **Widget Icon Display**: ViewDetail icon shown for actions with associated widgets
- **Flows Page**: Visual flow builder for customer journey flows (custom FDS)
- **Environments Page**: Manage deployment environments
  - Managed environments (Local Development, Fastly Production): Cannot be deleted
  - Custom environments: User-created, fully manageable
  - Resizable panels for environments list and deployment output
  - Auto-scroll deployment output to latest line
- **Deployment Execution**:
  - Full deployment pipeline with comprehensive action lifecycle management:
    - Generate new action files (folder structure, schema.json, index.ts, widget files if applicable)
    - Delete marked actions with associated widget resources (URI pattern matching)
    - Write draft action schemas for modified actions
    - Write widget resource drafts to widget-schema.json files
    - **Generate widget templates**: Automatically regenerate template.html from widget-schema.json
  - Real-time deployment output with ANSI color rendering
  - Deployment status tracking (running, success, failed)
  - Kill running deployments
  - Deployment history with full console output
  - Automatic server reconnection after deployment
  - Database cleanup: Removes all deleted action and resource entries
- **Changelog System**: Track uncommitted changes during session
  - Auto-cleared after successful deployment
- **Toast Notifications**: User feedback for all operations
- **Authentication System**: Adobe IMS integration for secure authentication
  - **Tool Planner Dialog**: Multi-step wizard requiring authentication
    - Step 0: Authentication screen (Adobe IMS sign-in)
    - Auto-advances to Step 1 after successful authentication
    - Steps 1-3: Tool planning wizard
  - **IMS Service**: Singleton service managing Adobe IMS Thin library
    - Token persistence with encryption (XOR cipher + base64)
    - Automatic token loading on page refresh
    - Token expiration handling with automatic cleanup
    - OAuth redirect flow support
  - **Mock Authentication**: Development testing mode
    - Toggle in DEBUG section (above Sandbox)
    - Generates realistic mock tokens (24-hour expiration)
    - Warning dialog when real authentication exists
    - Automatically cleared on logout
  - **Authentication UI Components**:
    - Check AuthN: View authentication status and token details
    - Logout: Complete cleanup of all tokens and redirect to /lcbs
    - Mock mode indicator in Check AuthN dialog
  - **Security Features**:
    - Encrypted token storage (not plain text)
    - HTTPS requirement (auto-generated self-signed cert for dev)
    - Session management with auth context preservation
    - Complete cleanup on logout (localStorage + sessionStorage)

### Architecture Details

#### Frontend (Client)
**Port**: 4545
**Framework**: React 18 with React Router

**Pages**:
- `/lcb-servers`: Server management interface
- `/actions`: Browse and execute MCP actions
- `/flows`: Visual flow builder (custom FDS)
- `/deploy`: Environment and deployment management

**Components**:
- Sidebar, LcbServerCard, SelectedLcbServerHeader
- Dialog components: AddLcbServerDialog, EditLcbServerDialog, AddActionDialog, EditActionDialog
- **CreateActionWizard**: 3-step wizard for creating actions with full validation
- **EditActionDialog**: Action editor with annotations, input parameters, validators
- FlowCanvas: Custom Flow Design System (d3-zoom, d3-drag)
- ToastContainer, ChangelogDialog, UncommittedChangesWarning, ReviewDraftsModal

**Services**:
- `api.ts`: REST API client for backend
- `changelog.ts`: Change tracking service
- `toast.ts`: Toast notification service

**Utilities**:
- `errorHandler.ts`: Standardized error handling with ErrorMessages/SuccessMessages constants

**Constants**:
- `storage.ts`: localStorage/sessionStorage keys
- `ui.ts`: UI constants (delays, durations, thresholds)
- `events.ts`: Custom event names for cross-component communication

#### Backend (Server)
**Port**: 3000
**Framework**: Hono (lightweight Node.js framework)

**API Routes**:
- `/api/servers`: MCP server CRUD + connect/disconnect
- `/api/actions/:serverId`: Actions management (discovered/custom, drafts)
- `/api/actions/:serverId/schema/:actionName`: Save/publish action schemas
- `/api/actions/:serverId/drafts`: Deploy drafts, clear drafts
- `/api/flows/:serverId`: Customer flows management
- `/api/changelog/:sessionId`: Session changelog tracking
- `/api/resources`: Widget resources
- `/api/tools`: Tool execution
- `/api/environments/:serverId`: Environment CRUD
- `/api/deployments/:environmentId`: Deployment history
- `/api/bash/execute`: Execute bash commands (background support)
- `/api/bash/kill/:sessionId`: Kill running bash processes
- `/api/health/check`: Server health check (CORS proxy)

**Services**:
- `storage.ts`: lowdb wrapper with CRUD operations
- `mcpClientManager.ts`: MCP client connection management
- `sourceServerInitializer.ts`: Auto-creates managed servers and environments
- `schemaWriter.ts`: Writes action schemas with Zod validation

### Database Schema (db.json)
```json
{
  "servers": [...],              // MCP server configurations
  "actions": {                   // Per-server action storage
    "server-id": {
      "discovered": [...],       // Actions from connected MCP server
      "custom": [...]            // Manually created actions
    }
  },
  "flows": {                     // Per-server customer flows
    "server-id": [...]
  },
  "changelogs": {                // Per-session change tracking
    "session-id": [...]
  },
  "deployments": {               // Deployment history
    "environment-id": [...]
  },
  "environments": [...]          // Deployment environments
}
```

### Deployment Workflow

**Current Implementation**:
1. User selects an environment and clicks "Deploy" in EnvironmentsPage
2. System stops any running local servers (`make kill-fastly`)
3. **Generates new action files**: Creates folder structure and files for newly created actions
   - Executes `make generate-new-actions` (calls `scripts/generate-actions-from-db.js`)
   - Creates `schema.json` with annotations and input schema
   - Creates `index.ts` with template handler
   - Skips actions that are both new and deleted
4. **Deletes marked actions**: Removes action folders for deleted actions
   - Executes `make delete-actions-from-db` (calls `scripts/delete-actions-from-db.js`)
   - Recursively deletes action folder (including widget if present)
   - Updates database to remove deleted actions
5. Writes draft action schemas to `schema.json` files for modified actions
6. **Writes widget resource drafts** to `widget-schema.json` files
7. **Generates widget templates**: Executes `make generate-widget-templates`
   - Reads `widget-schema.json` files from all widget actions
   - Extracts `script_url` and `widget_embed_url` from `_meta['openai:widget_meta']`
   - Generates `template.html` files with correct script tags and aem-embed elements
8. Executes `make build` (runs tests, generates actions index, builds WASM)
9. Starts server with `make serve` in background
10. Polls for server readiness via health check
11. Clears drafts, changelog, and deployment flags from database
12. Automatically reconnects to server with fresh MCP session
13. Deployment output streamed in real-time with ANSI color support
14. Full deployment history saved with timestamps and session IDs

### Local Development
```bash
cd lcb-ui
npm install           # Install workspace dependencies
npm run dev          # Run both client and server concurrently
```

**URLs**:
- Client: https://localhost:${LCB_UI_FRONTEND_PORT} (HTTPS with self-signed certificate)
- Server: http://localhost:${LCB_UI_BACKEND_PORT}
- API: https://localhost:${LCB_UI_FRONTEND_PORT}/api/* (proxied to server)

### MCP Integration
**Transport**: HTTP with StreamableHTTPClientTransport
**Connection Flow**:
1. Connect to MCP server → Capture session ID
2. Load tools/resources from MCP server
3. Display in UI for browsing and execution
4. Session ID displayed in header (uppercase label, monospace value)

**Server Configuration Schema**:
```typescript
interface MCPServer {
  id: string;
  name: string;
  description?: string;
  url: string;
  transport: 'stdio' | 'http' | 'sse';
  status?: 'connected' | 'disconnected' | 'connecting';
  lastConnectedAt?: string;
  sessionId?: string;
  command?: string;
  env?: Record<string, string>;
  serverType?: 'local-managed' | 'remote-managed' | 'remote-external';
  sourceProjectPath?: string;           // For managed servers
  processState?: 'started' | 'stopped' | 'starting' | 'stopping';
  processSessionId?: string;            // For local-managed servers
}

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;
  deployed?: boolean;                   // false for newly created actions
  hasEdsWidget?: boolean;              // true if action has EDS widget
  deleted?: boolean;                    // true if marked for deletion
  draft?: boolean;                      // true if modified (not new)
  annotations?: {
    destructiveHint?: boolean;         // Indicates destructive operations
    openWorldHint?: boolean;           // Indicates external API calls
    readOnlyHint?: boolean;            // Indicates read-only operations
  };
}

interface Environment {
  id: string;
  name: string;
  description: string;
  type: 'remote' | 'local';
  managed?: boolean;                    // System-created, cannot be deleted
  aemServiceId?: string;                // For remote type
  aemServiceToken?: string;             // For remote type
}
```

## Development Workflow

### End-to-End Development Flow

1. **Develop Actions** (in lcb-server):
   ```bash
   cd lcb-server
   make create-action NAME=myAction WIDGET=true
   # Edit server/src/actions/myAction/index.ts
   make test
   make build
   make serve
   # Test locally at http://localhost:${LCB_SERVER_PORT}/<service-name> (from .env)
   ```

2. **Test with MCP Inspector**:
   ```bash
   npx @modelcontextprotocol/inspector
   # Connect to: http://localhost:${LCB_SERVER_PORT}/<service-name> (from .env)
   ```

3. **Create/Edit Actions via lcb-ui**:
   ```bash
   cd lcb-ui
   npm run dev
   # Open https://localhost:${LCB_UI_FRONTEND_PORT}
   # Start local server from LCBs page
   # Connect to server
   # Actions page:
   #   - Create new actions with Create Action Wizard (3-step)
   #     - Add annotations (destructiveHint, openWorldHint, readOnlyHint)
   #     - Define input parameters with validators
   #   - Edit existing actions with full editor
   #   - Delete actions (soft delete with restore)
   #   - All changes tracked as uncommitted (NOT DEPLOYED, UPDATED, DELETED badges)
   # Navigate to Deploy page
   # Select environment and click "Deploy"
   # System automatically:
   #   - Generates new action files (folder structure + schema.json + index.ts)
   #   - Deletes marked actions
   #   - Writes modified action schemas to files
   #   - Runs make build + make serve
   #   - Clears drafts, changelog, and deployment flags
   #   - Reconnects with fresh session
   ```

4. **Deploy to Fastly** (production):
   ```bash
   cd lcb-server
   export AEM_COMPUTE_TOKEN=<your_token>
   export AEM_COMPUTE_SERVICE=<your_service_id>
   make deploy
   make tail-logs
   ```

## Deployment Architecture

### Current State
- **Local Deployments**: Full automation via lcb-ui
  - Draft system for action changes
  - Automated build and server restart
  - Health checks and auto-reconnection
  - Deployment history with full output
- **Fastly Deployments**: CLI-based via `make deploy`
  - Requires Fastly API token and service ID
  - Direct deployment to Compute@Edge
  - Log tailing support

### Managed vs Custom Resources
- **Managed Servers**: Auto-created Local and Remote servers (cannot be deleted)
- **Managed Environments**: Local Development and Fastly Production (cannot be deleted)
- **Custom Resources**: User-created servers and environments (fully manageable)

## Key Technical Patterns

### lcb-server Patterns

**Action Architecture**:
- Each action is a TypeScript module with standardized structure
- Auto-indexed by `scripts/generate-actions-index.js`
- Versioning: Semantic versioning per action
- Publication control: `isPublished` flag
- Widget support: `hasAemWidget` flag + widget/index.ts file

**Widget System**:
- Widgets are HTML files served as MCP resources
- URI format: `ui://eds-widget/<action-name>.html`
- MIME type: `text/html+skybridge`
- Auto-indexed by `scripts/generate-eds-widgets-index.js`
- Registered via `server.registerResource()`

**Session Management**:
- SessionManager singleton with 30-minute TTL (1800 seconds)
- Session ID passed via `Mcp-Session-Id` header
- Automatic cleanup of expired sessions via Fastly SimpleCache
- Session state tracked per request with sliding window TTL

**Error Handling**:
- Custom FastlyLogger with Fastly-compatible format
- Tool execution wrapped with logging decorators
- Error codes: JSON-RPC 2.0 compliant
- Request timeout handling (30s default)

### lcb-ui Patterns

**Centralized Constants**:
- `constants/storage.ts`: All storage keys
- `constants/ui.ts`: UI timing constants
- `constants/events.ts`: Custom event names

**Custom Hooks**:
- `useServerState`: Server selection and connection state
- `useConnectedServer`: Access to connected server info
- `useDeploymentPolling`: Deployment status polling

**Error Handling**:
- `errorHandler.ts`: Centralized error handling
- `ErrorMessages`: Type-safe error message constants
- `SuccessMessages`: Type-safe success message factories
- `handleError()`, `handleApiError()`: Standardized handlers

**State Management**:
- React hooks for local state
- Custom hooks for shared state
- LocalForage for persistence
- lowdb (server-side) for structured data

**UI/UX Patterns**:
- Compact spacing: `padding="size-300"`, `gap="size-150"`
- Grid layouts: `gridTemplateColumns: '1fr 2fr'`
- Sticky headers for scrollable lists
- Auto-selection with border flash animation
- Resizable panels with CSS `resize: 'both'`

## File Naming Conventions

### lcb-server
- Action folders: lowercase with hyphens (e.g., `content-search/`)
- Action files: `index.ts` in action folder
- Widget files: `widget/index.ts` in action folder
- Constants: `constants/mcp.ts`, `constants/index.ts`
- Utils: `utils/logger.ts`, `utils/tool-logging.ts`

### lcb-ui
- Components: PascalCase (e.g., `LcbServerCard.tsx`)
- Pages: PascalCase with "Page" suffix (e.g., `ActionsPage.tsx`)
- Hooks: camelCase with "use" prefix (e.g., `useServerState.ts`)
- Services: camelCase (e.g., `api.ts`, `changelog.ts`)
- Constants: camelCase (e.g., `storage.ts`, `events.ts`)

## Environment Variables

### Single Source of Truth: `.env` File

**CRITICAL**: The `.env` file in the project root is the **SINGLE SOURCE OF TRUTH** for all configuration.

**Format**: `p<project>-e<env>-<service-name>`
**Example**: `AEM_COMPUTE_SERVICE=p169116-e1811065-lcb-boilerplate`

### How MCP Transport Path is Derived

1. **`.env` file** contains: `AEM_COMPUTE_SERVICE=p169116-e1811065-lcb-boilerplate`
2. **Build time** (Makefile loads `.env`):
   - `make build` → `make generate-env` → `scripts/generate-env-constants.cjs`
   - Generates `server/src/constants/env-constants.ts` with hardcoded value
   - Gets compiled into WASM binary
3. **Runtime** (server handles requests):
   - `getMCP_TRANSPORT_PATH()` reads `BUILD_TIME_ENV.AEM_COMPUTE_SERVICE`
   - Extracts service name: `p169116-e1811065-lcb-boilerplate` → `/lcb-boilerplate`
   - Server listens on: `http://localhost:${LCB_SERVER_PORT}/lcb-boilerplate`

**Why this approach?**
- Viceroy (Fastly local server) doesn't support runtime `env()` calls
- Build-time injection ensures value is available in WASM
- Production Fastly Compute@Edge uses `fastly.toml [env]` section
- `.env` remains the single source for both environments

### lcb-server
- `AEM_COMPUTE_SERVICE`: **REQUIRED** - Complete Fastly service ID (format: `p<project>-e<env>-<service-name>`)
  - This is the full service identifier used for `fastly compute deploy --service-id=...`
  - MCP endpoint path is automatically extracted from this value
  - Used by Makefile for deployment and local development
- `AEM_COMPUTE_TOKEN`: Fastly API token (required for deployment only)
- `PUBLISH_BASE_URL`: AEM publish URL (set in fastly.toml, e.g., `https://publish-p169116-e1811065.adobeaemcloud.com`)
- `IMS_FASTLY_BACKEND`: IMS backend name (set in fastly.toml)

### lcb-ui
- `AEM_COMPUTE_SERVICE`: Same as lcb-server (used to populate managed server URLs)
- `AEM_COMPUTE_TOKEN`: Same as lcb-server (used to populate remote environment token)
- `LCB_SERVER_PATH`: Path to lcb-server directory (defaults to `../lcb-server`)

### Configuration Files
- `.env`: **SINGLE SOURCE OF TRUTH** - Project root environment file (git-ignored)
- `.env.example`: Template with all environment variables and documentation
- `fastly.toml`: Fastly Compute configuration (can be synced from `.env` via `scripts/sync-env-to-toml.sh`)

## Testing

### lcb-server
```bash
cd lcb-server
make test                 # Run Jest tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npm run test:integration  # Integration tests with Fastly local server
```

### lcb-ui
```bash
cd lcb-ui
# Testing documentation in lcb-ui/CLAUDE.md
# Playwright tests available for UI validation
```

## Documentation References

### lcb-server
- `README.md`: Main documentation
- `CONTENT_AI_ONBOARDING.md`: Content AI setup guide
- `CHATGPT_APPS_TUTORIAL_AEM_SITES.md`: ChatGPT Apps tutorial
- `server/src/actions/README.md`: Action development guide
- `server/src/widgets/README.md`: Widget development guide
- `scripts/README.md`: Script utilities documentation

### lcb-ui
- `CLAUDE.md`: Comprehensive UI documentation (900+ lines)
- `README.md`: Quick start and feature guide

## Important Notes

- **Optional Authentication**: Adobe IMS integration available for Tool Planner; basic UI access requires no auth
- **HTTPS Required for UI**: Frontend uses HTTPS with self-signed certificate (required for Adobe IMS OAuth)
- **React Spectrum Only**: Do not add duplicate UI libraries (zustand, react-query)
- **MCP Compliance**: Both projects follow Model Context Protocol specification
- **TypeScript Strict**: Only lcb-ui uses strict mode; lcb-server has `strict: false` (production improvement needed)
- **Session-Based**: Both projects track sessions for state management
- **Production Ready Patterns**: Centralized constants, error handling, custom hooks implemented
- **EDS Action Deletion**: `delete-actions-from-db.js` uses URI pattern matching to find and delete associated widget resources (extracts action name from `ui://eds-widget/{actionName}.html` pattern)

## Project Goals

### Completed
- ✅ Build MCP server for Fastly Compute@Edge
- ✅ Support ChatGPT Apps with AEM Widgets
- ✅ Create management UI for local development
- ✅ Full local deployment automation
- ✅ Draft system for action changes
- ✅ Deployment history and tracking
- ✅ Managed server and environment system
- ✅ Real-time deployment output with ANSI colors
- ✅ Automatic server reconnection after deployment
- ✅ Action validation (min/max length for strings, duplicate names, folder names, no spaces in names)
- ✅ **Create Action Wizard**: 5-step wizard with full validation and mandatory Template URLs
- ✅ **Edit Widget Resource Dialog**: 3-tab interface with mandatory Template URLs
- ✅ **Annotations Support**: destructiveHint, openWorldHint, readOnlyHint
- ✅ **Action Deletion System**: Soft delete with restore capability (widgetless and EDS actions with associated resource cleanup)
- ✅ **Local Deployment for New Actions**: Auto-generate folder structure and files
- ✅ **Widget Template Generation**: Automatic template.html generation from widget-schema.json
- ✅ **Badge System**: NOT DEPLOYED, UPDATED, DELETED status indicators
- ✅ **API Client**: executeBashCommand method for deployment script execution

### Future Enhancements
- 🔄 Direct API deployment to Fastly (no CLI dependency)
- 🔄 Deployment rollback capabilities
- 🔄 Performance monitoring and analytics
- 🔄 Advanced action discovery and generation
- 🔄 Widget marketplace and sharing
- 🔄 Multi-user collaboration features

## Getting Started

### Prerequisites
- **Node.js**: v20.x (tested with v20.19.3)
- **npm**: v10.x (tested with v10.8.2)
- **Fastly CLI**: v11.x or higher (for lcb-server deployment)

### Environment Check

Before getting started, run the environment check script to verify your system meets all requirements:

```bash
./check-env.sh
```

This will check:
- ✅ System requirements (Node.js, npm, Fastly CLI versions)
- ✅ Environment variables (AEM_COMPUTE_TOKEN, AEM_COMPUTE_SERVICE)
- ✅ Project structure (directories and files)
- ✅ Dependencies installation status
- ✅ Database files
- ✅ Port availability (3000, 4545, 7676)

### Quick Start with run.sh

The easiest way to start both lcb-server and lcb-ui:

```bash
./run.sh
```

This script will:
1. Run environment checks automatically
2. Detect and optionally kill any existing processes
3. Start lcb-server in the background
4. Start lcb-ui in the foreground
5. Handle graceful shutdown with Ctrl+C

**Access URLs:**
- lcb-ui: https://localhost:${LCB_UI_FRONTEND_PORT} (HTTPS with self-signed cert)
- lcb-server: http://localhost:${LCB_SERVER_PORT}/<service-name> (from `.env`)

### Manual Setup

If you prefer to start services manually in separate terminals:

```bash
# Terminal 1: Setup and start lcb-server
cd lcb-server
make setup
make build
make serve

# Terminal 2: Setup and start lcb-ui
cd lcb-ui
npm install
npm run dev
```

### MCP Inspector Testing
```bash
npx @modelcontextprotocol/inspector
# Connect to: http://localhost:${LCB_SERVER_PORT}/<service-name> (from .env)
```

## Project Components

### 1. LCB Server (`/lcb-server`)
**Production-ready MCP server for Fastly Compute@Edge**

The MCP server implementation that runs on Fastly Compute@Edge. It provides:
- Model Context Protocol (MCP) compliant server
- Pluggable action system (tools)
- AEM Widget support for ChatGPT Apps
- Session management with TTL
- IMS authentication for AEM APIs
- Natural language content search

**Quick Start:**
```bash
cd lcb-server
make setup
make serve
# MCP endpoint: http://localhost:${LCB_SERVER_PORT}/<service-name> (from .env)
```

**Documentation:** See [lcb-server/README.md](lcb-server/README.md) for detailed server documentation

### 2. LCB UI (`/lcb-ui`)
**Web-based management interface for MCP servers**

A React + Hono web application for:
- Managing MCP server connections
- Browsing and executing MCP tools/actions
- Managing resources and deployments
- Building visual flows
- Triggering CI/CD deployments

**Quick Start:**
```bash
cd lcb-ui
npm install
npm run dev
# Frontend: https://localhost:${LCB_UI_FRONTEND_PORT}
# Backend: http://localhost:${LCB_UI_BACKEND_PORT}
```

**Documentation:** See [lcb-ui/CLAUDE.md](lcb-ui/CLAUDE.md) and [lcb-ui/README.md](lcb-ui/README.md)

## Getting Started

### Prerequisites
- **Node.js**: v20.x (tested with v20.19.3)
- **npm**: v10.x (tested with v10.8.2)
- **Fastly CLI**: v11.x or higher (for lcb-server deployment only)

### Complete Setup

**Terminal 1: Start LCB Server**
```bash
cd lcb-server
make setup
make serve
```

**Terminal 2: Start LCB UI**
```bash
cd lcb-ui
npm install
npm run dev
```

**Access:**
- MCP Server: `http://localhost:${LCB_SERVER_PORT}/<service-name>` (from `.env`)
- UI Frontend: `https://localhost:${LCB_UI_FRONTEND_PORT}` (HTTPS with self-signed cert)
- UI Backend: `http://localhost:${LCB_UI_BACKEND_PORT}`

## Architecture Overview

**LCB** (LLM Conversion Bridge) is a dual-component system:

1. **lcb-server**: Production-grade MCP server
   - Runs on Fastly Compute@Edge
   - Implements Model Context Protocol
   - Provides tools/actions and widgets
   - Handles AEM integration

2. **lcb-ui**: Management interface
   - React SPA with Vite
   - Hono backend API
   - lowdb file-based database
   - Manages server connections and deployments

## Technology Stack

### lcb-server
- Runtime: Fastly Compute@Edge (JavaScript/WASM)
- Language: TypeScript (Node.js v20.19.3)
- Build: Fastly CLI, TypeScript compiler
- MCP SDK: @modelcontextprotocol/sdk v1.20.2

### lcb-ui
- Frontend: React 18 + TypeScript + Vite
- Backend: Hono (lightweight Node.js framework)
- UI: Adobe React Spectrum
- Database: lowdb (auto-created `db.json`)
- State: React hooks, LocalForage, custom hooks

## Key Features

### lcb-server
- ✅ Full MCP server implementation
- ✅ Pluggable action system
- ✅ AEM Widget support
- ✅ Session management
- ✅ IMS authentication
- ✅ Content AI integration

### lcb-ui
- ✅ Server connection management
- ✅ Tool/action discovery and execution
- ✅ **Create Action Wizard** with 3-step workflow and full validation
- ✅ **Edit Actions** with annotations and input parameter management
- ✅ **Action deletion system** with soft delete and restore
- ✅ Resource browsing and management
- ✅ Visual flow builder
- ✅ Deployment environment management
- ✅ Real-time deployment tracking
- ✅ **Local deployment automation** for new/modified/deleted actions

## Deployment

### lcb-server Deployment
```bash
cd lcb-server
export AEM_COMPUTE_TOKEN=<your_token>
export AEM_COMPUTE_SERVICE=<your_service_id>
make deploy
make tail-logs
```

### Local Deployment via lcb-ui
```bash
cd lcb-ui
npm run dev
# Open https://localhost:${LCB_UI_FRONTEND_PORT}
# Start server from LCBs page
# Connect to server
# Create/Edit/Delete actions (tracked as uncommitted changes)
# Deploy from Deploy page:
#   - Generates new action files with full folder structure
#   - Deletes marked actions
#   - Updates modified action schemas
#   - Auto-builds and restarts server
#   - Clears all uncommitted changes
```

## Documentation

- **[CLAUDE.md](CLAUDE.md)** (this file): Complete system architecture covering both lcb-server and lcb-ui
- **[lcb-server/README.md](lcb-server/README.md)**: Server quick start and CLI commands
- **[lcb-ui/CLAUDE.md](lcb-ui/CLAUDE.md)**: Detailed UI architecture, patterns, and implementation
- **[lcb-ui/README.md](lcb-ui/README.md)**: UI quick start, features, and troubleshooting

## Summary

**LCB** is a comprehensive system for building and deploying MCP servers on Fastly Compute@Edge with a web-based management interface. The **lcb-server** implements the Model Context Protocol with action and widget support, while **lcb-ui** provides a visual interface for managing connections, executing tools, and coordinating deployments. Both components are production-ready and follow best practices for security, error handling, and maintainability.
