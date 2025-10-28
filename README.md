# LLM Conversion Bridge

Boilerplate project used to rapidly develop ChatGPT apps using AEM Edge Compute and Edge Delivery Services.

## Prerequisites

- **Node.js**: v20.19.3
- **npm**: v10.8.2
- **Fastly CLI**: v11.3.0

### Install Fastly CLI
```bash
brew install fastly/tap/fastly
```

## Environment Variables

```bash
export AEM_COMPUTE_TOKEN=<your_token>
export AEM_COMPUTE_SERVICE=<your_service_id>
```

**Note**: The AEM Compute API endpoint (`https://api-fastly.adobeaemcloud.com/`) is configured in the Makefile. To change it, edit the `API_ENDPOINT` variable in the Makefile.

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

The server will be available at `http://127.0.0.1:7676/mcp-boilerplate`

**Note**: The MCP endpoint path (`/mcp-boilerplate`) is defined by the `MCP_TRANSPORT_PATH` constant in `server/src/constants/mcp.ts`.

## Development Commands

### Make Commands (**Recommended**)
```bash
make help                  # Show all available commands
make setup                 # Install dependencies and setup development environment
make build                 # Run tests and build Fastly Compute package (deployable .tar.gz)
make build-ts              # Run tests and build TypeScript only (for development)
make test                  # Run tests only
make dev                   # Start development server
make serve                 # Run locally with Fastly server (127.0.0.1:7676) with auto-cleanup
make serve-only            # Run locally without killing existing processes
make deploy                # Deploy to Fastly Compute service
make tail-logs             # Tail logs from deployed service
make clean                 # Clean build artifacts
make check-env             # Check environment variables and tool versions
make create-action         # Create new action scaffolding (NAME=myAction [WIDGET=true])
make generate-actions      # Generate MCP actions index file
make generate-aem-widgets  # Generate MCP AEM Widgets index file
make generate-all          # Generate both MCP actions and MCP AEM Widgets index files
```

## API Testing

### Local (127.0.0.1:7676)
```bash
# Start the MCP Inspector to test the local server
npx @modelcontextprotocol/inspector
```

This will open a web interface where you can:
1. Enter the server URL: `http://127.0.0.1:7676/mcp-boilerplate`
2. Test the `contentSearch` tool interactively
3. View tool schemas and documentation
4. Send requests and see responses in a user-friendly format

### Remote (publish-pXXXXXX-eXXXXXX.adobeaemcloud.com)
Replace `http://127.0.0.1:7676` with your AEM Cloud Service publish URL (e.g., `https://publish-p148639-e1512661.adobeaemcloud.com`) in above commands.

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

## Actions

- **contentSearch**: Natural language content search with AEM integration. Returns JSON response.
  - **query**: Required string. Natural language search query (e.g., "Find concerts in Berlin in June").
  - **Features**: Uses IMS authentication for secure AEM API access.
  - **Deployment**: Optimized for remote deployment with Fastly Secret Store integration.
  - **Note**: To setup content AI follow the steps described [here](CONTENT_AI_ONBOARDING.md).

- **heartbeat**: Simple health check tool that returns server timestamp and status.
  - **Parameters**: None required.
  - **Returns**: Server timestamp, uptime information, and health status in text format.
  - **Use case**: Monitoring server availability and response times.

- **heartbeatWidget**: Enhanced heartbeat tool that displays results in an interactive widget.
  - **Parameters**: None required.
  - **Returns**: Server timestamp and status information displayed in a visual widget with rounded corners.
  - **Widget**: Shows real-time server heartbeat with styled interface including timestamp and status indicators.
  - **Use case**: Visual monitoring and demonstration of widget functionality.

## Content Search Examples

Use the MCP Inspector (see [API Testing](#api-testing) section) to test these example queries with the `contentSearch` tool:

### Basic Natural Language Search
- **Query**: `"Find concerts in Berlin in June"`

### Event-specific Search  
- **Query**: `"theater events in London this summer"`

### Location-based Search
- **Query**: `"outdoor activities in Paris"`

The MCP Inspector provides an interactive interface to test these queries and view the JSON responses.

## Deployment Workflow

### Local

```bash
# 1. Build Fastly Compute package
make build

# 2. Deploy to service  
make deploy
```


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
