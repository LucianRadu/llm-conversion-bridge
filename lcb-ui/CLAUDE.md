# LCB UI - MCP Server Management Interface

A standalone web application for managing Model Context Protocol (MCP) servers with a visual interface for browsing, executing tools, and managing resources.

## Quick Start

### Prerequisites
- **Node.js**: v20.x (tested with v20.19.3)
- **npm**: v10.x (tested with v10.8.2)

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

LCB UI is a **Single Page Application (SPA)** with a monorepo workspace structure for:
- Managing MCP server connections (add, edit, remove servers)
- Browsing and executing tools from connected MCP servers
- Viewing and managing resources
- Creating actions visually through dialog-based workflows
- Tracking uncommitted changes during a browser session

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

### 1. LCB Servers Page (`/lcb-servers`)
The main server management interface with the following capabilities:

**Server Display**
- Grid layout showing all configured MCP servers as cards
- Visual status indicators (green dot for connected, gray for disconnected)
- Server selection with blue border highlight
- Hover interactions reveal edit/delete buttons with floating backgrounds
- Fixed-height description containers ensure vertical alignment across cards
- Smart filter with 3+ character minimum (searches name and description)

**Connection Management**
- One-click connect/disconnect per server
- Automatic connection confirmation dialog when switching between servers
- Session ID captured and stored upon connection
- Last connected timestamp with relative time display ("Just now", "2 mins ago")
- Server sorting: connected servers first, then by original order

**CRUD Operations**
- Add new servers via AddLcbServerDialog
- Edit existing servers via EditLcbServerDialog
- Delete servers with confirmation
- Persistent server selection across page navigation

### 2. Selected Server Header
A persistent header displayed across all pages showing:
- Connected server name and URL (left-aligned)
- MCP Session ID (right-aligned, uppercase label with monospace value)
- Only visible when a server is connected
- Shows "No LCB server connected" when disconnected

### 3. Actions Page (`/actions`)
Browse and execute MCP tools/actions from the connected LCB server:

**Page Title**: Dynamic title showing "[Server Name] Actions" (e.g., "Bitdefender LCB Actions")

**Layout**
- Three-panel resizable layout:
  - Left panel: Actions list with search
  - Center panel: Selected action details with input parameters
  - Right panel: Execution response and history

**Actions Management**
- List all available actions from the connected server
- Refresh button to reload actions
- **Create actions via CreateActionWizard**: 3-step wizard with full validation
  - Step 1: Action name, description, annotations, has EDS widget, input parameters (2-column layout)
  - Duplicate parameter name validation
  - Folder name validation (letters, numbers, underscore, hyphen only)
  - Real-time validation with toast notifications
  - Vertical divider between left/right columns
  - Scrollable input parameters panel
- **Edit actions via EditActionDialog**: Full action editor
  - Annotations support (destructiveHint, openWorldHint, readOnlyHint)
  - Input parameters with string validators
  - Draft system for tracking changes
- **Delete actions**: Full deletion system with confirmation dialogs
  - **Widgetless actions**: Shows file tree preview (schema.json, index.ts)
  - **EDS actions**: Shows complete file tree including widget files + associated resource warning
  - **Soft delete**: Actions marked with DELETED badge, can be restored before deployment
  - **Associated resource handling**: EDS actions automatically mark associated widget resources for deletion
  - **Auto-selection**: Deleted actions immediately selected with DELETED badge visible
  - **Restore functionality**: Click DELETED badge or "Restore Action" button to undo deletion
  - **Deployment cleanup**: Physical files deleted and database entries removed on deployment
- **Badge System**: NOT DEPLOYED (yellow), UPDATED (blue), DELETED (red)
- Auto-selection of newly created actions with border flash animation
- **Widget icon display**: Actions with widgets show ViewDetail icon next to name in list

**Action Execution**
- Dynamic form generation from inputSchema
- Required field indicators (asterisk)
- Execute button to run actions
- Response panel with copy-to-clipboard functionality
- Execution history tracking

**Display Sections**
- Annotations (with minimal spacing from content)
- Metadata
- Input Parameters (dynamic form fields)
- Response (execution results)

### 4. Flows Page (`/flows`)
Visual flow builder for customer journey flows using custom FDS (Flow Design System):

**Page Title**: Dynamic title showing "[Server Name] Flows" (e.g., "Bitdefender LCB Flows")

**Layout**
- Two-column layout (30% flows list / 70% canvas)
- Left: Scrollable list of available flows with name and description cards
- Right: Interactive FDS canvas for flow visualization

**Flow Visualization (Custom FDS Implementation)**
- Top-to-bottom vertical layout (first action at top)
- Draggable nodes for action repositioning with smooth offset tracking
- Animated dashed arrows connecting actions (black, 3px width with arrow markers)
- Arrows connect from center-bottom to center-top of nodes (pixel-perfect positioning)
- Node spacing: 140px vertical for compact layout
- Zoom controls: + (zoom in), - (zoom out), ⊡ (fit view)
- Pan canvas with grab/grabbing cursor (click and drag background)
- Grid background pattern (20px × 20px)
- Nodes centered horizontally on canvas (startX: 350px)
- Smooth zoom transitions (300ms) with configurable min/max zoom (0.5x - 2.0x)

**FDS Technical Details**
- **d3-zoom**: Handles pan and zoom with event filtering to prevent conflicts
- **d3-drag**: Manages node dragging with click-offset preservation
- **Transform Tuple**: `[x, y, zoom]` for viewport state management
- **Coordinate Transformation**: Accurate screen-to-canvas space conversion
- **Bezier Curves**: SVG paths for smooth vertical flow connections
- **Event Propagation**: Proper isolation between drag and pan behaviors

**Flow Management**
- Add actions to flows via dialog with scrollable action cards
- Add LLM Hint button (placeholder for future functionality)
- Flow selection with blue border highlight
- Canvas updates automatically when switching flows
- Server-specific storage: `lcb-flows-${serverId}`

### 5. Environments Page (`/deploy`)
Environment and deployment management for the connected LCB server:

**Page Title**: Dynamic title showing "[Server Name] Environments"

**Layout**
- Grid layout (1fr 2fr columns, 2 rows):
  - Left: Environments list spanning 2 rows (full height)
  - Right: Multiple bordered containers in vertical stack

**Environment Management**
- Add/Edit/Delete environments
- Local and remote environment types
- AEM Service ID and token configuration for remote environments
- Search and filter environments

**Deployment Features**
- Deploy button triggers comprehensive deployment workflow:
  1. **Stop running servers**: Kills any existing Fastly processes
  2. **Generate new actions**: Creates folder structure + schema.json + index.ts for newly created actions
     - Executes `make generate-new-actions` (calls `scripts/generate-actions-from-db.js`)
     - Includes annotations (destructiveHint, openWorldHint, readOnlyHint)
     - Skips actions that are both new and deleted
  3. **Delete marked actions**: Removes action folders for deleted actions
     - Executes `make delete-actions-from-db` (calls `scripts/delete-actions-from-db.js`)
     - Recursively deletes folder (including widget if present)
     - **Finds and deletes associated widget resources** using URI pattern matching
     - Updates database to remove both action and associated resource entries
     - Provides detailed deletion summary in deployment logs
  4. **Update modified actions**: Writes draft schemas to `schema.json` files
  5. **Build and serve**: Runs `make build` (tests + generates actions index + builds WASM)
  6. **Start server**: Runs `make serve` in background with health check polling
  7. **Cleanup**: Clears drafts, changelog, and deployment flags
  8. **Reconnect**: Automatically reconnects to server with fresh MCP session
- Real-time deployment output in monospace terminal-style display with ANSI colors
- Deployment status tracking (running, success, error)
- Kill deployment button to stop running deployments
- Deployment history with timestamps and full console output
- Last deployment brief (status, timestamp in UTC)
- Spinner in environment list during active deployment
- Polling mechanism to detect deployment completion after navigation

**Deployment Persistence**
- Deployments stored in database with status, output, timestamps
- Session ID tracking for kill functionality
- Deployment state restoration when navigating back
- Auto-polling (2-second interval) for running deployments

**Sticky Headers**
- "Environments (N)" heading and search field stay fixed while scrolling

### 7. Conversion Flows Page (`/flows`)
**Page Title**: Dynamic title showing "[Server Name] Conversion Flows"

**Layout**
- Two-column layout with resizable panels
- Left: Available flows list (30%)
- Right: Flow canvas visualization (70%)

**Features**
- Visual flow builder using custom FDS
- Flow selection and visualization
- Add actions to flows
- Sticky header with search

### 8. Changelog System (Uncommitted Changes Tracking)
A comprehensive system that tracks all modifications made to actions during a browser session:

**Tracking Capabilities**
- Action additions, modifications, and deletions
- Field additions, modifications, and deletions
- Type changes and required status changes
- Flow additions and modifications
- Session-based storage (clears on page refresh)

**Changelog Entry Types**
- `action_added`, `action_modified`, `action_deleted`
- `action_name_changed`, `action_description_changed`
- `field_added`, `field_modified`, `field_deleted`
- `field_type_changed`, `field_required_changed`
- `flow_added`, `flow_modified`, `flow_deleted`
- `actions_discovered`

**UI Components**
- **UncommittedChangesWarning**: Fixed bottom-center banner showing change count
  - Dismissable with X button
  - Auto-reappears when new changes occur
  - Light orange background (#FFF4E6)
  - Z-index: 100 (below toasts)
- **ChangelogDialog**: Modal dialog with chronological list of changes
  - Color-coded entries (green=added, red=deleted, orange=modified)
  - Shows timestamps, descriptions, old/new values

**Integration**
- Automatically logs all CRUD operations
- "View Changes" button opens changelog dialog
- Session ID format: `session_{timestamp}_{random}`

### 8. Toast Notification System
Centralized notification management for user feedback:

**Features**
- Success, error, info, and neutral message variants
- Fixed position at bottom-right
- Slide-in animation for new toasts
- Color-coded by variant (green, red, blue, gray)
- 3-second auto-dismiss with manual close option
- Stacks multiple toasts vertically
- Z-index: 101 (above uncommitted changes warning)

**Integration**
- Action created/updated/deleted confirmations
- Server connection/disconnection feedback
- Error messages for failed operations

### 9. Authentication System
Adobe IMS integration for secure user authentication:

**Tool Planner Dialog**
- Multi-step wizard requiring Adobe IMS authentication
- Step 0: Authentication screen (no step number shown)
  - Shows Adobe logo and sign-in instructions
  - "Sign In with Adobe ID" button initiates OAuth flow
  - Loading state while IMS library initializes
  - Error state with retry button if initialization fails
- Auto-advances to Step 1 after successful authentication
- Steps 1-3: Tool planning wizard (lorem ipsum content)
- No back button on Step 1 (cannot return to auth screen)
- Opened from Actions page header "Tool Planner" button

**IMS Service** (`services/ims.ts`)
- Singleton service managing Adobe IMS Thin library
- **Token Management**:
  - Automatic loading from CDN: `https://auth-stg1.services.adobe.com/imslib/imslib-thin.js`
  - Factory pattern: `window.adobeImsFactory.createIMSLib()`
  - Token persistence with XOR cipher encryption (not plain text)
  - Automatic token decryption on load
  - Token expiration checking and cleanup
  - OAuth redirect flow support
- **Authentication Methods**:
  - `loadLibrary()` - Load IMS Thin from CDN
  - `isAuthenticated()` - Check authentication status (real or mock)
  - `signIn(context)` - Initiate OAuth flow with context preservation
  - `signOut()` - Clear tokens and session
  - `logout()` - Complete cleanup (all tokens, redirect to /lcbs)
  - `getAccessToken()` - Retrieve decrypted token from memory
- **OAuth Flow**:
  - Redirect to IMS login: `/auth/callback` as callback URL
  - Fragment value processing (access_token, expires_in, etc.)
  - Auth context preservation (return path, timestamp)
  - Manual token extraction if `onAccessToken` callback doesn't fire

**Mock Authentication**
- Toggle in Sidebar DEBUG section (above Sandbox)
- Generates realistic mock tokens:
  - Format: JWT-like with "MOCK_TOKEN_FOR_TESTING" identifier
  - Session ID: `v2-v0.48.0-1-mock-{random}`
  - User ID: `mock-user-12345@AdobeID`
  - Expiration: 24 hours from generation
- **Protection**: Warning dialog if real authentication exists
  - "Real Authentication Active" dialog
  - Options: Cancel (keep real auth) or Enable Mock (override)
  - Toast: "Mock authentication enabled (overriding real session)"
- Automatically cleared on logout
- Mock mode indicator in Check AuthN dialog

**Authentication UI Components**

*Check AuthN Button* (DEBUG section)
- Shows authentication status dialog
- Status line: "✅ Authenticated" or "✅ Authenticated (🔧 MOCK MODE)"
- Mock mode warning box (orange background):
  - "⚠️ Mock Authentication Active"
  - "This is simulated authentication for testing purposes"
- Token details display:
  - Expiration timestamp (localized)
  - Time remaining (hours and minutes)
  - User ID (if available)
  - Session ID
  - Full access token (monospace, scrollable, plain text JWT)
- Dismissable with X button (Escape key supported)

*Logout Button* (DEBUG section, under Check AuthN)
- Positioned below Check AuthN button
- LogOut icon from React Spectrum
- Disabled when not authenticated (real or mock)
- Border styling matching other DEBUG buttons
- **Complete Cleanup**:
  - Calls IMS `signOut()` if library loaded
  - Clears real token from localStorage (encrypted)
  - Clears mock token from sessionStorage
  - Clears auth context from sessionStorage
  - Resets Mock AuthN toggle to off
  - Redirects to `/lcbs`
  - Toast: "Logged out successfully"

**Auth Callback Page** (`pages/AuthCallbackPage.tsx`)
- Handles OAuth redirect from Adobe IMS
- Route: `/auth/callback`
- **Processing Flow**:
  1. Load IMS library
  2. Get fragment values from URL
  3. Manually process token (callback doesn't fire after redirect)
  4. Verify authentication succeeded
  5. Retrieve auth context (return path)
  6. Redirect to original page with `?reopenToolPlanner=true`
- **States**:
  - Processing: Progress spinner + "Processing Authentication"
  - Success: Green checkmark + "Authentication Successful"
  - Error: Red X + error message + auto-redirect after 3 seconds

**Security Features**
- **Token Encryption** (`utils/encryption.ts`):
  - XOR cipher with random salt prefix
  - Base64 encoding
  - Version prefix (v1:) for future compatibility
  - Fallback (v0:) if encryption fails
  - **Not cryptographically secure** - designed for local development obfuscation
- **HTTPS Requirement**:
  - Vite configured with `@vitejs/plugin-basic-ssl`
  - Auto-generated self-signed certificate for localhost
  - Required by Adobe IMS for OAuth redirects
- **Session Management**:
  - Auth context stored in sessionStorage
  - Token stored encrypted in localStorage
  - Mock mode state in sessionStorage
  - Complete cleanup on logout
- **Storage Keys** (`constants/storage.ts`):
  - `REAL_IMS_TOKEN` - Encrypted real token (localStorage)
  - `MOCK_AUTH_MODE` - Mock mode state (sessionStorage)
  - `lcb-ims-auth-context` - Auth context for OAuth redirect

**IMS Configuration** (`constants/ims.ts`)
```typescript
{
  CLIENT_ID: 'llm-conversion-bridge',
  ENVIRONMENT: 'stg1',
  CDN_URL: 'https://auth-stg1.services.adobe.com/imslib/imslib-thin.js',
  SCOPE: 'AdobeID,openid',
  REDIRECT_URI: 'https://localhost:${LCB_UI_FRONTEND_PORT}/auth/callback',
  STORAGE_KEY: 'lcb-ims-auth-context'
}
```

**Type Definitions** (`types/ims.d.ts`)
- `ITokenInformation` - Token structure
- `AdobeIdConfig` - IMS configuration
- `AdobeIMSThin` - IMS Thin library interface
- `AdobeImsFactory` - Factory interface for creating IMS instance
- Global window augmentation for `adobeid` and `adobeImsFactory`

**Integration Points**
- Tool Planner opened from Actions page
- Auth required before accessing wizard steps
- Check AuthN available in all pages (Sidebar DEBUG)
- Logout available in all pages (Sidebar DEBUG)
- OAuth callback handles redirect and restoration
- Mock mode for development without IMS server

## MCP Integration

### Server Configuration
Servers are stored with this schema (see `shared/types.ts`):
```typescript
interface MCPServer {
  id: string;
  name: string;
  description?: string;
  url: string;
  transport: 'stdio' | 'http' | 'sse';
  status?: 'connected' | 'disconnected' | 'connecting';
  lastConnectedAt?: string;     // ISO timestamp of last successful connection
  sessionId?: string;            // MCP session ID (when connected)
  command?: string;              // For stdio servers
  env?: Record<string, string>;  // Environment variables for stdio
}

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;              // JSON Schema for input validation
  deployed?: boolean;            // false for newly created actions (NOT DEPLOYED badge)
  hasEdsWidget?: boolean;        // true if action has EDS widget
  deleted?: boolean;             // true if marked for deletion (DELETED badge)
  draft?: boolean;               // true if modified (UPDATED badge)
  annotations?: {
    destructiveHint?: boolean;  // Indicates destructive operations
    openWorldHint?: boolean;    // Indicates external API calls
    readOnlyHint?: boolean;     // Indicates read-only operations
  };
}
```

### Transport Types
- **stdio**: Command-based local servers (requires `command` field)
- **http**: HTTP-based servers using StreamableHTTPClientTransport
  - Handles session management via Mcp-Session-Id header automatically
- **sse**: Server-Sent Events servers

### Default Test Server
The app connects to a local LCB server:
- **URL**: `http://localhost:${LCB_SERVER_PORT}`
- **Transport**: http
- This is the main LCB LLM Conversion Bridge server

## Development Workflow

### Running the App
```bash
cd lcb-ui
npm install           # Install all workspace dependencies
npm run dev          # Run both client and server concurrently
```

- Client: http://localhost:${LCB_UI_FRONTEND_PORT}
- Server: http://localhost:${LCB_UI_BACKEND_PORT}
- API endpoints: http://localhost:${LCB_UI_FRONTEND_PORT}/api/* (proxied to server)

### Project Structure (Refactored with Modular Components)
```
lcb-ui/
├── client/
│   ├── src/
│   │   ├── components/          # Reusable React components
│   │   │   ├── Sidebar.tsx                         # Left navigation sidebar
│   │   │   ├── LcbServerCard.tsx                   # LCB server card with status indicator
│   │   │   ├── SelectedLcbServerHeader.tsx         # Persistent header with session ID
│   │   │   ├── AddLcbServerDialog.tsx              # Dialog for adding servers
│   │   │   ├── EditLcbServerDialog.tsx             # Dialog for editing servers
│   │   │   ├── CreateActionWizard.tsx              # 3-step wizard for creating actions
│   │   │   ├── EditActionDialog.tsx                # Dialog for editing actions with annotations
│   │   │   ├── ReviewDraftsModal.tsx               # Modal for reviewing uncommitted changes
│   │   │   ├── AddEnvironmentDialog.tsx            # Dialog for adding environments
│   │   │   ├── EditEnvironmentDialog.tsx           # Dialog for editing environments
│   │   │   ├── DeploymentHistoryDialog.tsx         # Deployment history viewer
│   │   │   ├── ChangelogDialog.tsx                 # Changelog viewer
│   │   │   ├── UncommittedChangesWarning.tsx       # Sticky warning banner
│   │   │   ├── ToastContainer.tsx                  # Toast notification display
│   │   │   ├── ErrorBoundary.tsx                   # Error catching component
│   │   │   ├── ToolPlannerDialog.tsx               # Tool Planner wizard with authentication
│   │   │   └── FlowCanvas/                         # FDS (Flow Design System)
│   │   │       ├── FlowCanvas.tsx                  # Main canvas component
│   │   │       ├── FlowCanvas.css                  # Styles and animations
│   │   │       ├── types.ts                        # TypeScript type definitions
│   │   │       ├── utils.ts                        # Transform and path utilities
│   │   │       └── index.ts                        # Export file
│   │   ├── pages/               # Page components (one per route with refactored sub-components)
│   │   │   ├── LcbServersPage/
│   │   │   │   ├── LcbServersPage.tsx              # Main page
│   │   │   │   ├── LcbServersHeader.tsx            # Header section
│   │   │   │   ├── LcbServersFilter.tsx            # Filter/search component
│   │   │   │   ├── LcbServersGrid.tsx              # Server grid with pagination
│   │   │   │   ├── Pagination.tsx                  # Pagination controls
│   │   │   │   └── ErrorDisplay.tsx                # Reusable error display
│   │   │   ├── ActionsPage/
│   │   │   │   ├── ActionsPage.tsx                 # Main page
│   │   │   │   ├── ActionsHeader.tsx               # Header with title and buttons
│   │   │   │   ├── ActionsErrorDisplay.tsx         # Error/no-server messages
│   │   │   │   ├── AvailableActionsList.tsx        # Left panel - search + list
│   │   │   │   ├── ActionDetails.tsx               # Right panel - details + execution
│   │   │   │   └── ExecutionHistoryModal.tsx       # History modal with sticky footer
│   │   │   ├── EnvironmentsPage/
│   │   │   │   ├── EnvironmentsPage.tsx            # Main page
│   │   │   │   ├── EnvironmentsHeader.tsx          # Header section
│   │   │   │   ├── EnvironmentsErrorDisplay.tsx    # Error/no-server messages
│   │   │   │   ├── EnvironmentsList.tsx            # Left panel - search + list
│   │   │   │   └── EnvironmentDetailsPanel.tsx     # Right panel - details + deployment
│   │   │   ├── ConversionFlowsPage.tsx             # Visual flow builder (standalone page)
│   │   │   └── AuthCallbackPage.tsx                # OAuth callback handler for IMS
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useServerState.ts                   # Server state management
│   │   │   ├── useConnectedServer.ts               # Connected server hook
│   │   │   └── useDeploymentPolling.ts             # Deployment polling hook
│   │   ├── services/            # API client services
│   │   │   ├── api.ts                              # REST API client
│   │   │   ├── changelog.ts                        # Changelog service (async)
│   │   │   ├── toast.ts                            # Toast notification service
│   │   │   ├── history.ts                          # Operation history tracking
│   │   │   └── ims.ts                              # IMS authentication service
│   │   ├── utils/               # Utility functions
│   │   │   ├── errorHandler.ts                     # Standardized error handling
│   │   │   ├── storage.ts                          # Safe storage utilities
│   │   │   ├── eventBus.ts                         # Custom event system
│   │   │   └── encryption.ts                       # Token encryption utilities
│   │   ├── constants/           # Application constants
│   │   │   ├── storage.ts                          # localStorage/sessionStorage keys
│   │   │   ├── ui.ts                               # UI constants (delays, durations)
│   │   │   ├── events.ts                           # Event names and helpers
│   │   │   └── ims.ts                              # IMS configuration constants
│   │   ├── types/               # TypeScript type definitions
│   │   │   └── ims.d.ts                            # IMS library type declarations
│   │   ├── App.tsx              # Main app with routing
│   │   ├── main.tsx             # Entry point
│   │   └── index.css            # Global styles (pointer cursors, animations)
│   ├── vite.config.ts           # Vite configuration (port ${LCB_UI_FRONTEND_PORT})
│   └── package.json
├── server/
│   ├── src/
│   │   ├── services/            # Backend services
│   │   │   ├── mcpClientManager.ts              # MCP client connections
│   │   │   └── storage.ts                       # lowdb wrapper with CRUD
│   │   ├── routes/              # API route handlers
│   │   │   ├── servers.ts                       # Server CRUD + connect/disconnect
│   │   │   ├── actions.ts                       # Actions API endpoints
│   │   │   ├── flows.ts                         # Flows API endpoints
│   │   │   ├── environments.ts                  # Environments API endpoints
│   │   │   ├── deployments.ts                   # Deployment history tracking
│   │   │   ├── resources.ts                     # Widget resources endpoints
│   │   │   ├── changelog.ts                     # Changelog API endpoints
│   │   │   ├── tools.ts                         # Tools list and execution
│   │   │   └── bash.ts                          # Bash command execution
│   │   └── index.ts             # Server entry point
│   └── package.json
├── shared/
│   └── types.ts                 # Shared TypeScript interfaces
├── db.json                      # lowdb database (actions, flows, deployments, environments)
└── package.json                 # Root workspace config
```

## Implementation Guidelines

### Atomic Modular Steps
Work in small, focused increments:
1. One feature at a time
2. One component at a time
3. Test each component before moving to the next

### UI Component Patterns
Always use React Spectrum components:
- Layout: `Flex`, `Grid`, `View`
- Navigation: `ActionButton`, `Link`
- Forms: `TextField`, `Picker`, `Button`, `Form`
- Data Display: `TableView`, `ListView`
- Dialogs: `DialogTrigger`, `Dialog`, `Content`, `AlertDialog`, `DialogContainer`
- Feedback: `ProgressCircle`, `StatusLight`, `Text`

### State Management
- Use React hooks (useState, useEffect, useCallback) for local state
- Use custom hooks (useServerState, useConnectedServer) for shared state
- Use @react-stately hooks for complex UI state (collections, selections)
- Use LocalForage for persistent storage
- Use constants for storage keys and event names

### API Design
RESTful endpoints:
- `GET /api/servers` - List all configured servers
- `POST /api/servers` - Add new server
- `PUT /api/servers/:id` - Update server
- `DELETE /api/servers/:id` - Remove server
- `POST /api/servers/:id/connect` - Connect to server (returns session ID)
- `POST /api/servers/:id/disconnect` - Disconnect from server (clears session ID)
- `GET /api/tools/server/:serverId` - Get tools for specific server
- `POST /api/tools/execute` - Execute a tool
- `GET /api/resources` - List all resources

## Key Technical Implementation Details

### State Synchronization
- **Custom Event System**: Type-safe event helpers for cross-component updates
  - `lcb-server-selected`: Fired when server selection changes
  - `lcb-server-connected`: Fired when server connects successfully
  - `lcb-server-disconnected`: Fired when server disconnects
  - `lcb-changelog-updated`: Fired when changelog entries are added
- **localStorage**: Persistent server selection with `STORAGE_KEYS.SELECTED_SERVER`
- **React Hooks**: Custom hooks (useServerState, useConnectedServer) reduce duplication
- **Error Boundary**: Catches React errors and displays user-friendly error screen

### UI/UX Patterns

**Layout Consistency**
- **Compact Spacing**: All pages use `padding="size-300"` and `gap="size-150"` for consistent spacing
- **Grid Layout**: Actions, Resources, and Environments use CSS Grid with `gridTemplateColumns: '1fr 2fr'`
- **Height Constraints**: Main content grids use `height: 'calc(100% - 100px)'` to fit viewport
- **Resizable Panels**: All bordered containers have `resize: 'both'` with min-width/min-height constraints
- **List Containers**: Left-side list containers wrap content naturally (no forced height on ListView)
- **Sticky Headers**: List headers, search fields, and toggles use `position: sticky` to remain visible during scroll

**Visual Patterns**
- **Highlight Selection**: ListView with `selectionStyle="highlight"` (no checkboxes)
- **Auto-selection**: Newly created actions are automatically selected and visible
- **Flash Animation**: Border flash effect (2s duration) for newly added actions
- **Scroll-into-view**: Selected items automatically scroll into viewport after 100ms delay
- **Toggle Positioning**: "Auto open" toggles aligned horizontally with section headings
- **Button Order**: Delete button appears before edit button (delete-first pattern)

**Interactive Elements**
- **Resizable Panels**: CSS `resize` property on bordered containers
- **Toast Notifications**: Bottom-right positioned toasts with 3s auto-dismiss
- **Centered Warning**: UncommittedChangesWarning horizontally centered at bottom
- **Z-index Layering**: Toasts (101) above warning (100) for proper visibility
- **Disabled States**: Navigation items disabled when no server connected
- **Dismissable Dialogs**: Click outside to close with `isDismissable` on DialogContainer
- **Confirmation Dialogs**: AlertDialog for destructive actions
- **Floating Buttons**: Edit/delete buttons on server cards with semi-transparent backgrounds

**Typography & Formatting**
- **Timestamps**: All timestamps displayed in UTC format using `toUTCString()`
- **Monospace Output**: Deployment and terminal output in monospace font with dark background
- **Minimal Spacing**: Section labels sit directly on top of content divs (4px margin)
- **Copy-to-clipboard**: Hover-reveal copy buttons on code blocks with success/error feedback

**State Management**
- **Page Refresh**: Selected items restored from sessionStorage after page reload
- **Session Detection**: Distinguish browser reload vs navigation using PerformanceNavigationTiming
- **Polling**: 2-second intervals for background status checks (deployments)
- **Global Styles**: `index.css` for pointer cursors and animations (slideIn, borderFlash)

### MCP Integration Patterns
- **Transport Types**: stdio (command), http (HTTP with session management), sse (Server-Sent Events)
- **Connection Flow**: Connect → Capture session ID → Save timestamp → Load tools
- **Tool Schema**: Dynamic form generation from `inputSchema.properties`
- **Error Handling**: Graceful failures with user-friendly error messages
- **Session Management**: Session IDs extracted from StreamableHTTPClientTransport

### File Naming Conventions
- Use "LCB" prefix for LCB-specific components (e.g., `LcbServerCard`, `AddLcbServerDialog`)
- Use "Actions" instead of "Tools" for consistency
- Component files: PascalCase (e.g., `LcbServerCard.tsx`)
- Page files: PascalCase with "Page" suffix (e.g., `ActionsPage.tsx`)
- Hook files: camelCase with "use" prefix (e.g., `useServerState.ts`)
- Service files: camelCase (e.g., `changelog.ts`, `toast.ts`)

### Storage Patterns
- **Centralized Keys**: All localStorage keys defined in `constants/storage.ts`
- **Server-Specific Data**: Actions and flows stored per server
  - Actions: `lcb-actions-${serverId}`
  - Flows: `lcb-flows-${serverId}`
- **Session Storage**: Changelog session ID in sessionStorage
- **Persistence**: Server selection persists across sessions

## FDS (Flow Design System) Architecture

### Overview
Custom-built flow visualization system replacing React Flow, providing full control over canvas behavior and rendering.

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

### Error Handling

Standardized error handling with:
- Centralized error messages (`ErrorMessages` constants)
- Success message factories (`SuccessMessages`)
- Type-safe error handling across all pages
- Structured logging with context

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
- `DELETE /api/servers/:id` - Delete server
- `POST /api/servers/:id/connect` - Connect to server
- `POST /api/servers/:id/disconnect` - Disconnect from server

### Actions
- `GET /api/actions/:serverId` - Get all actions
- `POST /api/actions/:serverId/custom` - Add custom action
- `PUT /api/actions/:serverId/:actionName` - Update action
- `DELETE /api/actions/:serverId/:actionName` - Delete action

### Environments & Deployments
- `GET /api/environments/:serverId` - Get environments
- `POST /api/environments/:serverId` - Add environment
- `POST /api/bash/execute` - Execute bash commands (deployment)
- `POST /api/bash/kill/:sessionId` - Kill running process

### Widget Resources
- `GET /api/widget-resources/:serverId` - List resources
- `POST /api/widget-resources/:serverId` - Add resource
- `GET /api/widget-resources/:serverId/read/:uri` - Read resource content

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
- Navigation items: LCBs, Actions, Conversion Flows, Deploy
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
1. Click the "Managed LCB Server (Local)" card
2. Click "Connect" to establish MCP connection
3. Watch console logs for connection success
4. Status should show green "Connected" indicator
5. Session ID will be displayed in the header

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

## Documentation

For comprehensive technical documentation, see the project-specific CLAUDE.md files:
- **[lcb-server/CLAUDE.md](../lcb-server/CLAUDE.md)**: MCP server architecture and development guide
- **[Root CLAUDE.md](../CLAUDE.md)**: Complete system overview and both project components

## Database Initialization

### db.json Auto-Creation
The `db.json` file is automatically created on first startup if it doesn't exist:

**Location**: `/lcb-ui/db.json`

**Auto-Initialized with Pre-Configured Server**:
- Default "Managed LCB Server (Local)" connecting to `http://localhost:${LCB_SERVER_PORT}`
- Default environment "bitdefender-local" for the managed server
- Empty actions, flows, and changelogs collections ready for use

**First Startup Flow**:
1. Backend server starts
2. Checks if `db.json` exists in project root
3. If missing: Creates file with default managed server configuration
4. Frontend loads and discovers pre-configured server
5. User can immediately connect and start using the application

**Managed Server Details**:
- **Name**: Managed LCB Server (Local)
- **URL**: `http://localhost:${LCB_SERVER_PORT}`
- **Transport**: HTTP with StreamableHTTPClientTransport
- **Port**: 7676 (matches lcb-server local development port)
- **Default Environment**: bitdefender-local (local development)

## Important Notes

- **NO Authentication**: This is a local development tool, no auth required
- **Title**: Application title is "LCB UI" (not "MCP Inspector")
- **React Spectrum Only**: Do not add duplicate libraries (zustand, react-query, etc.)
- **SPA**: All routing is client-side via React Router
- **Routes**:
  - `/lcb-servers` for server management
  - `/actions` for tools/actions from MCP server
  - `/flows` for conversion flows visualization
  - `/deploy` for environment and deployment management
- **Dynamic Titles**: Page titles include connected server name when available
- **Session IDs**: Displayed in header when server is connected (HTTP transport only)
- **FDS**: Custom Flow Design System used instead of React Flow for full control and customization
- **Modular Pages**: Major pages (ActionsPage, EnvironmentsPage) broken into reusable components in dedicated folders
- **Sticky Footers**: History/detail modals have buttons in sticky footer that remain visible during scroll
- **Close on Escape**: All modals support Escape key dismissal via `isDismissable` property
