# LLM Conversion Bridge

Boilerplate project used to rapidly develop ChatGPT apps using AEM Edge Compute and Edge Delivery Services.

## Prerequisites

- **Node.js**: v20.x (tested with v20.19.3)
- **npm**: v10.x (tested with v10.8.2)
- **Fastly CLI**: v11.x or higher

### Install Fastly CLI
```bash
brew install fastly/tap/fastly
```

### Check Environment

Run the environment check script from the project root to verify all prerequisites:
```bash
cd .. && ./check-env.sh
```

## Environment Variables

**CRITICAL**: Set these in the `.env` file at the project root (`../env`), not as shell exports.

```bash
# Required - Format: p<project>-e<env>-<service-name>
AEM_COMPUTE_SERVICE=p169116-e1811065-lcb-boilerplate

# Required for deployment only
AEM_COMPUTE_TOKEN=<your_token>
```

### Single Source of Truth

The **`.env` file** is the single source of truth. Here's how it works:

1. **Makefile** automatically loads `../.env` on every command
2. **Build time**: `make generate-env` creates `env-constants.ts` from `.env` value
3. **Runtime**: `getMCP_TRANSPORT_PATH()` extracts path from build-time constant
4. **Example**: `p169116-e1811065-lcb-boilerplate` → MCP endpoint `/lcb-boilerplate`

**MCP Endpoint Format**: `http://localhost:${LCB_SERVER_PORT}/<service-name>` (service name = everything after 2nd dash)

**Note**: 
- The AEM Compute API endpoint (`https://api-fastly.adobeaemcloud.com/`) is configured in the Makefile
- Change `.env` → rebuild → new path automatically applied everywhere

## Setup

```bash
make setup
```

## Local Development

For local development and testing:

```bash
# 1. Build the project
make build

# 2. Start local server
make serve
```

The server will be available at `http://localhost:${LCB_SERVER_PORT}/<service-name>`

**Example**: If `.env` contains `AEM_COMPUTE_SERVICE=p169116-e1811065-lcb-boilerplate`:
- MCP endpoint: `http://localhost:${LCB_SERVER_PORT}/lcb-boilerplate`

**Note**: The MCP endpoint path is automatically extracted from `AEM_COMPUTE_SERVICE` at build time. Change `.env` and rebuild to update the path.

### Session Management

The MCP server manages user sessions with automatic TTL (Time-To-Live) expiration:

- **Default Session TTL**: 30 minutes (1800 seconds)
- **Configuration**: `SESSION_TTL_SECONDS` constant in `server/src/constants/mcp.ts`
- **Manager**: `SessionManager` class in `server/src/session-manager.ts`
- **Storage**: Fastly SimpleCache with automatic expiration

Sessions are created during MCP `initialize` and persist across multiple requests. After 30 minutes of inactivity, sessions automatically expire and must be recreated.

To modify the session TTL:
```bash
# Edit server/src/constants/mcp.ts
export const SESSION_TTL_SECONDS = 1800; // Change this value
```

## Development Commands

### Make Commands (**Recommended**)
```bash
make help                  # Show all available commands
make setup                 # Install dependencies and setup development environment
make build                 # Run tests and build Fastly Compute package (deployable .tar.gz)
make build-ts              # Run tests and build TypeScript only (for development)
make test                  # Run tests only
make dev                   # Start development server
make serve                 # Run locally with Fastly server (localhost:${LCB_SERVER_PORT}) with auto-cleanup
make serve-only            # Run locally without killing existing processes
make deploy                # Deploy to Fastly Compute service
make tail-logs             # Tail logs from deployed service
make clean                 # Clean build artifacts
make check-env             # Check environment variables and tool versions
make create-action         # Create new action scaffolding (NAME=myAction [WIDGET=true])
make generate-actions      # Generate MCP actions index file
make generate-eds-widgets  # Generate MCP EDS Widgets index file
make generate-all          # Generate both MCP actions and MCP EDS Widgets index files
make generate-new-actions  # Generate new action files from db.json (UI-created actions)
make delete-actions-from-db # Delete action files marked for deletion in db.json
```

## API Testing

### Local (localhost:${LCB_SERVER_PORT})
```bash
# Start the MCP Inspector to test the local server
npx @modelcontextprotocol/inspector
```

This will open a web interface where you can:
1. Enter the server URL: `http://localhost:${LCB_SERVER_PORT}/<service-name>` (from your `.env` file)
   - Example: `http://localhost:${LCB_SERVER_PORT}/lcb-boilerplate` if `AEM_COMPUTE_SERVICE=p169116-e1811065-lcb-boilerplate`
2. Test the `contentSearch` tool interactively
3. View tool schemas and documentation
4. Send requests and see responses in a user-friendly format

### Remote (publish-p169116-e1811065.adobeaemcloud.com)
Replace `http://localhost:${LCB_SERVER_PORT}` with your AEM Cloud Service publish URL (e.g., `https://publish-p169116-e1811065.adobeaemcloud.com`) in above commands.

## Input Validation & Schema System

All MCP actions use **JSON Schema** definitions for input validation, compiled to **Zod validators** at build time.

### Schema Architecture

Each action has two files:

1. **`schema.json`** - Action metadata and input schema (JSON Schema format)
   - Action name, version, publication status
   - Input parameter definitions with constraints
   - Annotations (destructiveHint, openWorldHint, readOnlyHint)
   - OpenAI metadata for ChatGPT Apps

2. **`index.ts`** - Handler function (logic only, no schema definition)
   - Pure async function that executes the action
   - Receives pre-validated arguments
   - No schema validation code needed

### Build Process

Run `make generate-actions` to:
1. Read all `schema.json` files
2. Convert JSON Schema → Zod validators
3. Generate consolidated `server/src/actions/index.ts`
4. Combine metadata + Zod validators + handler function → Action objects

### Supported JSON Schema Constraints

For **string** parameters in schema.json:

```json
{
  "query": {
    "type": "string",
    "minLength": 3,
    "maxLength": 500,
    "pattern": "^[a-zA-Z0-9\\s]+$",
    "description": "Search query..."
  }
}
```

Generates Zod validator:
```typescript
z.string()
  .trim()
  .min(3, "Must be at least 3 characters")
  .max(500, "Must be at most 500 characters")
  .regex(/^[a-zA-Z0-9\s]+$/, "Invalid format")
```

### Example: contentSearch

**schema.json**:
```json
{
  "name": "contentSearch",
  "definition": {
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "minLength": 3,
          "description": "Search query (min 3 characters)"
        }
      },
      "required": ["query"]
    }
  }
}
```

**Validation at MCP server level** (`mcp-server.ts:131`):
```typescript
const validatedArgs = action.definition.inputSchema.parse(args || {});
const result = await action.handler(validatedArgs);
```

- ✅ `contentSearch({ query: "berlin concerts" })` → SUCCESS
- ❌ `contentSearch({ query: "ab" })` → REJECTED (too short)
- ❌ `contentSearch({ query: "" })` → REJECTED (empty)
- ❌ `contentSearch({})` → REJECTED (missing required parameter)

### Adding Validation to New Actions

1. Edit `schema.json` - add constraints to inputSchema
2. Run `make generate-actions` - codegen creates Zod validators
3. No handler code changes needed - validation is automatic

### lcb-ui Integration

Schema validation is fully integrated with lcb-ui:
- **Create Action Wizard**: 3-step wizard for creating actions with annotations
- **Edit Actions**: Full editor for modifying action schemas
- **Input Parameters**: Dynamic form with validators (minLength, maxLength)
- **Annotations**: UI support for destructiveHint, openWorldHint, readOnlyHint
- **Local Deployment**: Automatic action generation and deployment
- No need to touch TypeScript handler code - all editable via UI

## Quick Start: Creating New Actions

Generate action scaffolding with a single command:

```bash
# Create a basic action (no widget)
make create-action NAME=myNewAction

# Create an action with a widget
make create-action NAME=myWidgetAction WIDGET=true
```

This automatically creates:
- Complete TypeScript action handler with type safety
- Zod schema validation
- Structured logging and error handling
- Widget files (if `WIDGET=true`)
- Updates action/widget indices

See **[scripts/README.md](scripts/README.md)** for detailed documentation and examples.

## Development Documentation

- **[Adding New Actions](server/src/actions/README.md)**: Step-by-step guide for creating new MCP actions
- **[Adding New AEM Widgets](server/src/widgets/README.md)**: Step-by-step guide for creating new MCP AEM Widgets
- **[Script Utilities](scripts/README.md)**: Documentation for code generation scripts

## Content Search Examples

Use the MCP Inspector (see [API Testing](#api-testing) section) to test these example queries with the `contentSearch` tool:

### Basic Natural Language Search
- **Query**: `"Find concerts in Berlin in June"`

### Event-specific Search  
- **Query**: `"theater events in London this summer"`

### Location-based Search
- **Query**: `"outdoor activities in Paris"`

The MCP Inspector provides an interactive interface to test these queries and view the JSON responses.

## Scripts

The lcb-server includes utility scripts for code generation and database integration:

### Core Scripts

- **generate-action.js**: Scaffold new actions with optional widget support
  - Usage: `make create-action NAME=myAction [WIDGET=true]`
  - Creates: Action folder structure, schema.json, index.ts, widget files (if requested)

- **generate-actions-from-schemas.js**: Build Zod validators from JSON Schema
  - Converts declarative JSON Schema to runtime Zod validators
  - Generates consolidated `server/src/actions/index.ts` with all actions

- **generate-eds-widgets-index.js**: Index all widget resources
  - Auto-discovers and registers all EDS widget resources
  - Generates `server/src/actions/index-widgets.ts`

### lcb-ui Integration Scripts

- **generate-actions-from-db.js**: Generate action files from lcb-ui database
  - Creates physical action files for actions created in lcb-ui
  - Trigger: `make generate-new-actions` (called during deployment)

- **generate-eds-widgets-from-db.js**: Generate widget actions from UI database
  - Creates widget actions defined in lcb-ui
  - Outputs action folder with widget/ subdirectory including template.html

- **delete-actions-from-db.js**: Delete actions marked for deletion
  - Physical deletion of actions marked `deleted: true` in lcb-ui
  - Trigger: `make delete-actions-from-db` (called during deployment)

- **generate-widget-templates.js**: Generate template.html from widget-schema.json
  - Auto-generates widget HTML templates from metadata
  - Trigger: `make generate-widget-templates` (called during deployment)

### Action Lifecycle

**End-to-End Flow from lcb-ui to Deployment**:

1. **User Creates Action in lcb-ui** → Stored in `db.json` with `deployed: false`
2. **User Clicks Deploy** → Triggers deployment workflow
3. **Deployment Verification** → lcb-ui polls health endpoint
4. **Mark as Deployed** → lcb-ui API call sets `deployed: true`
5. **Database Cleanup** → Remove all deleted action/resource entries

See **[scripts/README.md](scripts/README.md)** for detailed script documentation.

## Deployment Workflow

### Local Development

```bash
# 1. Build Fastly Compute package
make build

# 2. Start local server
make serve
```

### Production (Fastly Compute@Edge)

```bash
# 1. Build Fastly Compute package
make build

# 2. Deploy to service
make deploy
```

### lcb-ui Automated Deployment

The lcb-ui provides full deployment automation:

1. **Pre-Deployment**:
   - Kill existing Fastly processes
   - Generate new action files from database
   - Delete marked actions and associated resources
   - Update modified action schemas
   - Generate widget templates from metadata

2. **Build & Deploy**:
   - Generate action indices (Zod validators + widget resources)
   - Run TypeScript tests
   - Build WASM package
   - Start local server in background

3. **Post-Deployment**:
   - Health check verification
   - Mark actions as deployed
   - Clear uncommitted changes
   - Database cleanup (remove deleted entries)
   - Automatic server reconnection

See **[lcb-ui/CLAUDE.md](../lcb-ui/CLAUDE.md)** for full deployment workflow documentation.


## Content Search Tool

The content search tool is designed for AEM Cloud Service integration:

- Uses AEM hostname for API calls (configured via PUBLISH_BASE_URL constant)
- Requires IMS authentication and Fastly Secret Store integration
- Optimized for Fastly Compute@Edge deployment

## Environment Check

To verify your setup:
```bash
make check-env
```

This will show:
- Fastly Service ID
- API endpoints
- Tool versions (Node.js, npm, Fastly CLI)
- Authentication status
