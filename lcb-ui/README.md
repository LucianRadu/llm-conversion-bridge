# LCB UI - MCP Server Management Interface

A standalone web application for managing Model Context Protocol (MCP) servers with a visual interface for browsing, executing tools, and managing resources.

## Quick Start

### Prerequisites
- **Node.js**: v20.x (tested with v20.19.3)
- **npm**: v10.x (tested with v10.8.2)

### Check Environment

Run the environment check script from the project root to verify all prerequisites:
```bash
cd .. && ./check-env.sh
```

### Installation & Running

```bash
cd lcb-ui
npm install           # Install workspace dependencies
npm run dev          # Run both client and server concurrently
```

**URLs:**
- Frontend: http://localhost:${LCB_UI_FRONTEND_PORT}
- Backend API: http://localhost:${LCB_UI_BACKEND_PORT}
- API Proxy: http://localhost:${LCB_UI_FRONTEND_PORT}/api/*

## Project Overview

LCB UI is a **Single Page Application (SPA)** with a monorepo workspace structure providing:

**Action Management (Full Lifecycle)**:
- **5-Step Creation Wizard**: Guided action creation with validation, parameters, widgets, mandatory template URLs
- **Edit Actions**: Full editor with annotations (destructiveHint, openWorldHint, readOnlyHint) and input parameters
- **Delete with Restore**: Soft delete system - actions marked for deletion, recoverable before deployment
- **Badge System**: NOT DEPLOYED (yellow), UPDATED (blue), DELETED (red) for visual status tracking

**Widget Resources**:
- **3-Tab Editor**: Basic info, OpenAI metadata, mandatory template URLs (script_url, widget_embed_url)
- **Auto-generation**: template.html generated from widget-schema.json during deployment
- **Associated Cleanup**: Deleting EDS actions automatically deletes widget resources

**Deployment Automation**:
- Generate new actions (folder + files from database)
- Delete marked actions (recursive with associated resources)
- Update modified actions (write draft schemas)
- Generate widget templates (template.html from metadata)
- Build and test with Jest
- Serve with health check polling
- Clear drafts and changelog
- Auto-reconnect with fresh session ID

**Changelog & Tracking**:
- All CRUD operations tracked
- Session-based: Cleared on page refresh or deployment
- UncommittedChangesWarning: Bottom-center dismissable banner
- ChangelogDialog: Full history with old/new values

## Architecture

```
lcb-ui/
├── client/          # React frontend (Vite + TypeScript, port ${LCB_UI_FRONTEND_PORT})
├── server/          # Hono backend API (Node.js + TypeScript, port ${LCB_UI_BACKEND_PORT})
├── shared/          # Shared TypeScript types
├── db.json          # lowdb database (auto-created on first startup)
└── CLAUDE.md        # Comprehensive technical documentation
```

### Technology Stack

**Frontend (Client)**
- React 18 + TypeScript + Vite
- Adobe React Spectrum UI library
- Custom FDS (Flow Design System) with d3-zoom and d3-drag
- LocalForage for browser storage
- Zod for validation

**Backend (Server)**
- Hono (lightweight Node.js framework)
- lowdb for file-based JSON database
- MCP SDK integration
- REST API for data management

**Database**
- lowdb (auto-creates `db.json` on first startup)
- Pre-configured with default "Managed LCB Server (Local)"
- Stores servers, actions, flows, deployments, environments

## Key Features

### 1. Server Management (`/lcb-servers`)
- **Managed Servers**: Auto-created Local and Remote servers (cannot be deleted)
- **External Servers**: User-created servers (fully manageable)
- Start/Stop local servers with real-time health checks
- Connect/disconnect servers
- View connection status and session IDs
- Server sorting and filtering

### 2. Actions Page (`/actions`)

**5-Step Action Creation Wizard**:
- **Step 1**: Action details with 2-column layout
  - Name (folder validation: letters, numbers, underscore, hyphen only)
  - Description (512 character limit)
  - Annotations: destructiveHint, openWorldHint, readOnlyHint
  - Has EDS Widget checkbox
  - Input Parameters panel (scrollable, add/remove fields)
  - Real-time duplicate parameter name detection
- **Step 2**: Action OpenAI Metadata (for widget actions)
  - Output Template (auto-generated, read-only)
  - Widget Accessible (always true for widgets)
  - Invoking Status Text (optional, max 64 chars)
  - Invoked Status Text (optional, max 64 chars)
- **Step 3**: Widget Resource Metadata (for widget actions)
  - Name, Description
  - Widget Description (for ChatGPT)
  - Prefers Border toggle
  - CSP Domains (connect_domains, resource_domains)
  - Widget Domain (sandbox URL)
- **Step 4**: Template URLs (MANDATORY for widget actions)
  - Script URL: URL to aem-embed.js script (required)
  - Widget Embed URL: URL to widget content (required)
  - Validation: Both URLs required for EDS widgets
- **Step 5**: Files Preview
  - Tree view of files to be generated
  - Shows folder structure, schema.json, index.ts, widget files
  - Review before creation

**Edit Actions**:
- Full editor with annotations support
- Input parameters with string validators (minLength, maxLength)
- Draft system: Changes tracked until deployment
- Multi-tab layout (Details & Input Schema, Action OpenAI Metadata)
- Tab validation prevents switching with errors

**Delete Actions**:
- **Widgetless Actions**: File tree preview (schema.json, index.ts)
- **EDS Actions**: Complete file tree + associated resource warning
- **Soft Delete**: Actions marked with DELETED badge, recoverable before deployment
- **Restore**: Click DELETED badge or "Restore Action" button to undo
- **Physical Deletion**: Occurs on deployment with database cleanup

**Badge System**:
- **NOT DEPLOYED** (yellow): Newly created action not yet deployed (`deployed: false`)
- **UPDATED** (blue): Modified action with uncommitted changes (`draft: true`)
- **DELETED** (red): Soft-deleted action pending physical removal (`deleted: true`)

**Additional Features**:
- Browse and execute MCP tools/actions from connected server
- Dynamic form generation from tool schemas
- Action execution with response display
- Execution history with sticky footer
- Widget icon (ViewDetail) shown for actions with associated widgets
- Auto-selection of newly created actions with border flash animation

### 3. Environments & Deployment (`/deploy`)

**Environment Management**:
- **Managed Environments**: Local Development and Fastly Production (cannot be deleted)
- **Custom Environments**: User-created environments (fully manageable)
- Add/Edit environment dialogs with local vs remote type selection
- Search and filter environments
- Environment selection with deployment controls

**8-Phase Deployment Pipeline**:
1. **Stop Running Servers**: `make kill-fastly` - Kill any existing Fastly processes
2. **Generate New Actions**:
   - `make generate-new-actions` - Widgetless actions
   - `make generate-eds-widgets-from-db` - Widget actions
   - Creates folder structure + `schema.json` + `index.ts` + widget files
3. **Delete Marked Actions**:
   - `make delete-actions-from-db` - Recursively delete action folders
   - **URI Pattern Matching**: Automatically find and delete associated widget resources
   - Database cleanup: Remove action and resource entries
4. **Update Modified Actions**:
   - Write draft schemas to `schema.json` files for modified actions
   - Write resource drafts to `widget-schema.json` files
5. **Generate Widget Templates**:
   - `make generate-widget-templates` - Generate `template.html` from widget-schema.json
   - Extracts `script_url` and `widget_embed_url` from `_meta['openai:widget_meta']`
   - Creates HTML with `<script>` tag and `<aem-embed>` element
6. **Build and Serve**:
   - `make build` - Run tests with Jest, generate actions index, build WASM
   - `make serve` - Start local server in background on port ${LCB_SERVER_PORT}
   - Health check polling until server ready (15 attempts, 1 second intervals)
7. **Cleanup**:
   - Clear action drafts from database
   - Mark all actions as deployed (`deployed: true`)
   - Mark all resources as deployed (`deployed: true`)
   - Clear resource drafts from database
   - Clear changelog for session
8. **Reconnect**:
   - Auto-connect to local server at `http://localhost:${LCB_SERVER_PORT}/<service-name>` (from `.env`)
   - Capture new session ID
   - Dispatch `lcb-server-connected` event

**Deployment Features**:
- **Real-time Output**: ANSI color rendering in monospace terminal display
- **Status Tracking**: running (spinner), success, failed, killed, cancelled
- **Kill Deployment**: Stop running deployments with `make kill-fastly`
- **Deployment History**: Full console output saved with timestamps and session IDs
- **Polling**: 2-second interval for status updates (restored after page navigation)
- **Resizable Panels**: Deployment output panel resizable with CSS `resize: 'both'`
- **Auto-scroll**: Output automatically scrolls to latest line

### 5. Conversion Flows (`/conversion-flows`)
- Visual flow builder with custom FDS
- Pan and zoom canvas
- Drag-to-reposition nodes
- Flow visualization and management

### 6. Changelog System

**Tracking Capabilities**:
- Action changes (added, modified, deleted, name/description changes)
- Field changes (added, modified, deleted, type/required changes)
- Resource changes (added, modified, deleted, property changes)
- Flow changes (added, modified, deleted)

**UI Components**:
- **UncommittedChangesWarning**: Fixed bottom-center banner
  - Shows change count (e.g., "2 uncommitted changes")
  - Dismissable with X button (auto-reappears on new changes)
  - Light orange background (#FFF4E6)
  - Z-index: 100 (below toasts)
  - "View Changes" button opens ChangelogDialog
- **ChangelogDialog**: Modal with chronological change list
  - Color-coded entries (green=added, red=deleted, orange=modified)
  - Timestamps in UTC format
  - Old/new value comparison
  - Scrollable list with all changes

**Features**:
- **Session-Based**: Stored in `db.json` under `changelogs[sessionId]`
- **Auto-Cleared**: After successful deployment or page refresh
- **Real-time Logging**: All CRUD operations automatically tracked
- **Session ID Format**: `session_{timestamp}_{random}`

### 7. Authentication System

**Adobe IMS Integration**:
- **Tool Planner**: Multi-step wizard requiring authentication
  - Step 0: Adobe IMS sign-in screen
  - Auto-advances to wizard after successful authentication
  - OAuth redirect flow with token persistence
- **IMS Service**: Manages Adobe IMS Thin library
  - Encrypted token storage (XOR cipher + base64)
  - Automatic token loading on page refresh
  - OAuth redirect support (`/auth/callback`)
  - Token expiration handling
- **Mock Authentication**: Development testing mode
  - Toggle in DEBUG section (above Sandbox)
  - Generates realistic 24-hour mock tokens
  - Warning dialog when real authentication exists
  - Automatic cleanup on logout

**DEBUG Section Features**:
- **Check AuthN**: View authentication status and token details
  - Shows token expiration, time remaining, user ID, session ID
  - Plain text JWT display (monospace, scrollable)
  - Mock mode indicator with warning when active
- **Logout**: Complete authentication cleanup
  - Clears all tokens (real and mock)
  - Clears auth context and mock mode state
  - Redirects to `/lcbs` page
  - Disabled when not authenticated

**Security**:
- **Encrypted Storage**: Tokens encrypted before saving to localStorage
- **HTTPS**: Auto-generated self-signed cert for localhost (required by IMS)
- **Complete Cleanup**: All tokens removed on logout
- **OAuth Flow**: Secure redirect-based authentication

**Files**:
- `services/ims.ts` - IMS service (singleton)
- `utils/encryption.ts` - Token encryption utilities
- `constants/ims.ts` - IMS configuration
- `types/ims.d.ts` - TypeScript declarations
- `components/ToolPlannerDialog.tsx` - Wizard with auth
- `pages/AuthCallbackPage.tsx` - OAuth callback handler

## Database Auto-Initialization

The `db.json` file is automatically created on first startup with:
- **Managed LCB Server (Local)**: Pre-configured to connect to `http://localhost:${LCB_SERVER_PORT}/<service-name>` (from `.env`)
  - Example: `http://localhost:${LCB_SERVER_PORT}/lcb-boilerplate` if `AEM_COMPUTE_SERVICE=p169116-e1811065-lcb-boilerplate`
- **Managed LCB Server (Remote)**: Pre-configured for Fastly Compute@Edge deployment
- **Managed Environments**: 
  - Local Development (for local testing)
  - Fastly Production (for remote deployment)
- **Empty Collections**: Actions, flows, and changelogs ready to use

No manual setup required - the app is ready to use immediately!

## Database Schema (db.json)

### Complete Structure

```typescript
interface Database {
  servers: MCPServer[];                          // All configured MCP servers
  actions: {                                     // Per-server action storage
    [serverId: string]: {
      discovered: MCPTool[];                     // Actions from connected MCP server
      custom: MCPTool[];                         // Actions from "Create Action" wizard
    };
  };
  widgetResources: {                             // Widget resources per server
    [serverId: string]: MCPResource[];
  };
  flows: {                                       // Customer flows per server
    [serverId: string]: CustomerFlow[];
  };
  environments: {                                // Deployment environments per server
    [serverId: string]: Environment[];
  };
  deployments: {                                 // Deployment history per environment
    [environmentId: string]: Deployment[];
  };
  changelogs: {                                  // Session-based change tracking
    [sessionId: string]: ChangelogEntry[];
  };
}
```

### Collection Details

**servers** (Array of MCPServer):
```typescript
{
  id: string;
  name: string;
  description?: string;
  url: string;
  transport: 'stdio' | 'http' | 'sse';
  status?: 'connected' | 'disconnected' | 'connecting';
  lastConnectedAt?: string;               // ISO timestamp
  sessionId?: string;                      // MCP session ID (HTTP transport)
  serverType?: 'local-managed' | 'remote-managed' | 'remote-external';
  sourceProjectPath?: string;             // For managed servers (e.g., '../lcb-server')
  processState?: 'started' | 'stopped' | 'starting' | 'stopping';
  processSessionId?: string;              // For local-managed servers
}
```

**actions** (Per-server with deployment flags):
```typescript
{
  name: string;
  description?: string;
  inputSchema?: any;                      // JSON Schema for input validation
  deployed: boolean;                     // false = NOT DEPLOYED badge
  draft?: boolean;                       // true = UPDATED badge
  deleted?: boolean;                     // true = DELETED badge
  hasEdsWidget?: boolean;                // true if action has widget resource
  annotations?: {
    destructiveHint?: boolean;          // Indicates destructive operations
    openWorldHint?: boolean;            // Indicates external API calls
    readOnlyHint?: boolean;             // Indicates read-only operations
  };
  _meta?: {                              // OpenAI metadata for widget actions
    'openai/outputTemplate'?: string;   // e.g., 'ui://eds-widget/{name}-widget.html'
    'openai/widgetAccessible'?: boolean;
    'openai/toolInvocation/invoking'?: string;
    'openai/toolInvocation/invoked'?: string;
    'openai/resultCanProduceWidget'?: boolean;
  };
}
```

**widgetResources** (Per-server with OpenAI metadata):
```typescript
{
  uri: string;                           // e.g., 'ui://eds-widget/{actionName}-widget.html'
  name: string;
  description: string;
  mimeType: string;                      // 'text/html+skybridge'
  actionName: string;                    // Associated action name
  deployed: boolean;                     // false = NOT DEPLOYED
  _meta: {
    'openai/widgetDescription'?: string;
    'openai/widgetPrefersBorder'?: boolean;
    'openai/widgetCSP'?: {
      connect_domains: string[];
      resource_domains: string[];
    };
    'openai/widgetDomain'?: string;
    'openai:widget_meta': {
      script_url: string;                // URL to aem-embed.js (MANDATORY)
      widget_embed_url: string;          // URL to widget content (MANDATORY)
    };
  };
}
```

**environments** (Per-server with managed flag):
```typescript
{
  id: string;
  name: string;
  description: string;
  type: 'local' | 'remote';
  managed?: boolean;                     // true = cannot be deleted
  aemServiceId?: string;                 // For remote type (Fastly service ID)
  aemServiceToken?: string;              // For remote type (Fastly API token)
  createdAt: string;                     // ISO timestamp
}
```

**deployments** (Per-environment with full output):
```typescript
{
  id: string;
  environmentId: string;
  serverId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'killed' | 'cancelled';
  command: string;                       // e.g., 'make build && make serve'
  output: string;                        // Full console output with ANSI colors
  sessionId?: string;                    // Bash session ID (for kill operations)
  startedAt: string;                     // ISO timestamp
  completedAt?: string;                  // ISO timestamp
  exitCode?: number;
}
```

**changelogs** (Per-session change tracking):
```typescript
{
  id: string;
  sessionId: string;
  timestamp: string;                     // ISO timestamp
  type: string;                          // e.g., 'action_added', 'field_modified', etc.
  target: string;                        // Target action/resource/flow name
  description: string;                   // Human-readable description
  details?: {
    fieldName?: string;
    oldValue?: any;
    newValue?: any;
  };
}
```

## Development

### Component Structure

Pages are organized as modular components in dedicated folders:

- **ActionsPage/**
  - ActionsHeader, ActionsErrorDisplay
  - AvailableActionsList, ActionDetails
  - ExecutionHistoryModal

- **EnvironmentsPage/**
  - EnvironmentsHeader, EnvironmentsErrorDisplay
  - EnvironmentsList, EnvironmentDetailsPanel

- **LcbServersPage/**
  - LcbServersHeader, LcbServersFilter
  - LcbServersGrid, Pagination, ErrorDisplay

### Custom Hooks

- `useServerState`: Server selection and connection state
- `useConnectedServer`: Access to connected server info
- `useDeploymentPolling`: Deployment status polling
- `useErrorNotification`: Standardized async error/success handling with toast notifications

### Error Handling

Standardized error handling with:
- `useErrorNotification` hook for consistent async operation handling
- Centralized error messages (`ErrorMessages` constants)
- Success message factories (`SuccessMessages`)
- Type-safe error handling across all pages
- Structured logging with context
- Automatic toast notifications on success/error

### State Management

- React hooks for local component state
- Custom hooks for shared logic
- LocalForage for browser persistence
- lowdb (server-side) for structured data
- sessionStorage for session-specific state

## API Routes

### MCP Servers
- `GET /api/servers` - List all servers
- `POST /api/servers` - Add new server
- `PUT /api/servers/:id` - Update server
- `DELETE /api/servers/:id` - Delete server (only external servers)
- `POST /api/servers/:id/connect` - Connect to server
- `POST /api/servers/:id/disconnect` - Disconnect from server

### Actions
- `GET /api/actions/:serverId` - Get all actions (discovered + custom)
- `GET /api/actions/:serverId/drafts` - Get draft actions
- `POST /api/actions/:serverId/custom` - Add custom action
- `POST /api/actions/:serverId/drafts` - Save action as draft
- `POST /api/actions/:serverId/drafts/deploy` - Deploy all drafts to schema files
- `DELETE /api/actions/:serverId/drafts` - Clear all drafts
- `POST /api/actions/:serverId/schema/:actionName` - Save action schema
- `POST /api/actions/:serverId/schema/:actionName/publish` - Toggle isPublished flag
- `PUT /api/actions/:serverId/:actionName` - Update action
- `DELETE /api/actions/:serverId/:actionName` - Delete action

### Environments & Deployments
- `GET /api/environments/:serverId` - Get environments
- `POST /api/environments/:serverId` - Add environment
- `PUT /api/environments/:serverId/:id` - Update environment
- `DELETE /api/environments/:serverId/:id` - Delete environment (only custom environments)
- `GET /api/deployments/:environmentId` - Get deployment history
- `POST /api/deployments/:environmentId` - Create deployment record
- `PATCH /api/deployments/:environmentId/:deploymentId` - Update deployment
- `POST /api/bash/execute` - Execute bash commands (supports background mode)
- `POST /api/bash/kill/:sessionId` - Kill running process

### Widget Resources
- `GET /api/widget-resources/:serverId` - List resources
- `POST /api/widget-resources/:serverId` - Add resource
- `GET /api/widget-resources/:serverId/read/:uri` - Read resource content

### Changelog
- `GET /api/changelog/:sessionId` - Get changelog entries
- `POST /api/changelog/:sessionId` - Add changelog entry
- `DELETE /api/changelog/:sessionId` - Clear changelog for session
- `DELETE /api/changelog/:sessionId/:entryId` - Delete specific entry
- `DELETE /api/changelog` - Clear all changelogs

### Health & Utilities
- `GET /api/health/check?url=<encoded_url>` - Server health check (CORS proxy)
- `POST /api/cleanup` - Clean room operation (resets database)

## Documentation

For comprehensive technical documentation, see:
- **CLAUDE.md**: Detailed architecture, patterns, and implementation guidelines
- **[LCB Server Documentation](../lcb-server/CLAUDE.md)**: MCP server implementation details

## Important Notes

- **NO Authentication**: This is a local development tool, no auth required
- **React Spectrum Only**: Do not add duplicate UI libraries (zustand, react-query, etc.)
- **Modular Components**: All major pages use component folders for better maintainability
- **db.json Auto-Creation**: Database is created automatically with pre-configured managed server
- **Sticky Modals**: History modals have buttons in sticky footer (always visible, no scrolling)
- **Close on Escape**: All modals support Escape key dismissal

## Quick Start Testing

### 1. Start the Application
```bash
npm run dev
```

This starts:
- Backend Server on `http://localhost:${LCB_UI_BACKEND_PORT}`
- Frontend Client on `http://localhost:${LCB_UI_FRONTEND_PORT}`

### 2. Prerequisites
Before testing, ensure the LCB MCP server is running:
```bash
cd ../lcb-server
make serve
```

The MCP server will be at `http://localhost:${LCB_SERVER_PORT}/<service-name>` (extracted from `AEM_COMPUTE_SERVICE` in `.env`)

**Example**: If `.env` contains `AEM_COMPUTE_SERVICE=p169116-e1811065-lcb-boilerplate`:
- MCP endpoint: `http://localhost:${LCB_SERVER_PORT}/lcb-boilerplate`

### 3. Open the UI
Navigate to: **http://localhost:${LCB_UI_FRONTEND_PORT}**

You should see:
- Sidebar with "LCB UI" title
- Navigation items: LCBs, Actions, Conversion Flows, Widget Resources, Deploy
- Main area showing the LCB Servers page
- Pre-configured "Managed LCB Server (Local)" ready to connect

### 4. Console Logs
All operations are logged with prefixes for easy tracking:

**Frontend (Browser Console)**:
- `[API Client]` - HTTP requests to backend

**Backend (Terminal)**:
- `[Storage Service]` - Database operations
- `[Source Server Initializer]` - Managed server setup
- `[MCP Client Manager]` - MCP server connections

### 5. Test Server Connection
1. Click "Start Server" on the "Managed LCB Server (Local)" card
2. Wait for server to start (health checks run automatically)
3. Click "Connect" to establish MCP connection
4. Watch console logs for connection success
5. Status should show green "Connected" indicator
6. Session ID will be displayed in the header

### 6. Test Deployment Flow
1. Navigate to Actions page
2. Edit an action (e.g., add a parameter or change description)
3. Changes are saved as drafts (UPDATED badge appears)
4. Navigate to Deploy page
5. Select "Local Development" environment
6. Click "Deploy" button
7. Watch real-time deployment output with ANSI colors
8. System automatically:
   - Stops running servers
   - Writes draft schemas to files
   - Runs `make build` (tests + build)
   - Starts server with `make serve`
   - Clears drafts and changelog
   - Reconnects with fresh MCP session
9. Deployment history saved with full output

## Troubleshooting

### Server Won't Connect

Check terminal logs for errors. Common issues:
- MCP server not running on the correct endpoint (check your `AEM_COMPUTE_SERVICE` in `.env`)
- Wrong URL or port in server configuration
- MCP server not responding to initialize request

Test your MCP server directly:
```bash
curl -X POST http://localhost:${LCB_SERVER_PORT}/<service-name> \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
```

Should return a JSON-RPC 2.0 response with server info.

### db.json Not Created
The database is auto-created on first backend startup. Ensure the backend server has started:
```bash
npm run dev
```

### Port Already in Use
- Frontend uses port ${LCB_UI_FRONTEND_PORT}
- Backend uses port ${LCB_UI_BACKEND_PORT}

If ports are busy, kill existing processes:
```bash
# Kill port ${LCB_UI_BACKEND_PORT} (backend)
lsof -ti:${LCB_UI_BACKEND_PORT} | xargs kill -9

# Kill port ${LCB_UI_FRONTEND_PORT} (frontend)
lsof -ti:${LCB_UI_FRONTEND_PORT} | xargs kill -9
```

### Storage Not Persisting
- Check browser console for storage errors
- Try clearing browser cache and reloading
- Data is stored in IndexedDB (check Application tab in DevTools)

## License

Part of the LLM Conversion Bridge project - See root LICENSE for details

