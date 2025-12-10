# LCB - LLM Conversion Bridge

**A boilerplate for rapidly building ChatGPT applications with custom actions and interactive widgets.**

## What is This?

LCB helps you create ChatGPT applications that can:
- Execute custom **actions** (search products, book appointments, fetch data)
- Display rich **widgets** (interactive cards, forms, product galleries)
- Connect to your own data sources and APIs

**Key Concepts:**
- **MCP (Model Context Protocol)**: Standard protocol for AI assistants to interact with external tools
- **Actions**: Functions that ChatGPT can call (e.g., "search catalog", "get weather")
- **Widgets**: Visual components displayed in ChatGPT conversations (product cards, booking forms)
- **lcb-server**: Your MCP server that handles ChatGPT requests
- **lcb-ui**: Web interface for creating and managing actions

**First-Time Setup:**

1. **Create your environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and configure your service:**
   ```bash
   # Required - Your service identifier
   AEM_COMPUTE_SERVICE=p<project>-e<env>-your-app-name
   
   # Example:
   AEM_COMPUTE_SERVICE=p123456-e789012-my-chatgpt-app
   ```

3. **You're ready to start!**

📝 **Note:** Throughout this documentation, you'll see variables like `${LCB_UI_FRONTEND_PORT}`. These are environment variables with defaults (4545, 3000, 7676) that you can customize in `.env` if needed.

## Quick Start

### Prerequisites
- **Node.js**: v20.x or higher (tested with v20.19.3)
- **npm**: v10.x or higher (tested with v10.8.2)
- **Optional**: Fastly CLI v11.x+ (only needed for production deployment)

### Easy Startup with run.sh

**Fastest Way to Start Both Services:**
```bash
./run.sh
# Automatically starts lcb-server and lcb-ui
# Frontend: https://localhost:${LCB_UI_FRONTEND_PORT} (HTTPS with self-signed cert)
# Backend: http://localhost:${LCB_UI_BACKEND_PORT}
# MCP Server: http://localhost:${LCB_SERVER_PORT}/<service-name> (from .env)
```

The `run.sh` script:
- Checks environment and prerequisites
- Detects and kills existing processes
- Starts lcb-server in background
- Starts lcb-ui in foreground
- Handles graceful shutdown with Ctrl+C

### Manual Installation & Setup

**Terminal 1: Start LCB Server**
```bash
cd lcb-server
make setup
make serve
# MCP Server now at: http://localhost:${LCB_SERVER_PORT}/<service-name> (from .env)
```

**Terminal 2: Start LCB UI**
```bash
cd lcb-ui
npm install
npm run dev
# Frontend: https://localhost:${LCB_UI_FRONTEND_PORT} (HTTPS with self-signed cert)
# Backend: http://localhost:${LCB_UI_BACKEND_PORT}
```

**Open Browser**
- UI: https://localhost:${LCB_UI_FRONTEND_PORT}
- MCP Server: http://localhost:${LCB_SERVER_PORT}/<service-name> (from .env)

## Project Structure

```
lcb/
├── lcb-server/          # MCP Server (handles ChatGPT requests)
│   ├── server/src/      # Your actions and widgets
│   ├── Makefile         # Build and deployment commands
│   └── README.md        # Server documentation
│
└── lcb-ui/              # Management Interface
    ├── client/          # React UI (port ${LCB_UI_FRONTEND_PORT})
    ├── server/          # API backend (port ${LCB_UI_BACKEND_PORT})
    └── README.md        # UI documentation
```

## Documentation

### For Quick Start & Setup
- **[lcb-server/README.md](lcb-server/README.md)** - Server installation and commands
- **[lcb-ui/README.md](lcb-ui/README.md)** - UI installation, features, and troubleshooting

### For Deep Dives
- **[CLAUDE.md](CLAUDE.md)** - Complete system overview and architecture
- **[lcb-ui/CLAUDE.md](lcb-ui/CLAUDE.md)** - UI architecture, components, and patterns

## What's Included

### lcb-server (MCP Server)
Your ChatGPT action server with:
- **Action System**: Create custom functions ChatGPT can call
- **Widget System**: Build interactive UI components
- **Input Validation**: Automatic validation of user inputs
- **Session Management**: Handles user sessions automatically
- **Code Generation**: Scaffold new actions quickly
- **Testing**: Built-in test framework
- **Production Ready**: Deploy to production environments

### lcb-ui (Management Interface)
Visual tool for managing your actions:
- **Action Wizard**: Step-by-step action creation with validation
- **Edit & Deploy**: Modify actions and deploy changes instantly
- **Widget Builder**: Create interactive UI components
- **Visual Flow Builder**: Design conversation flows visually
- **Deployment Automation**: One-click deployment with real-time output
- **Change Tracking**: See what's changed before deploying
- **Development Server**: Built-in local server for testing

## Your First Action

Let's create a simple "Hello World" action:

**1. Start the development environment:**
```bash
./run.sh
# Opens browser at https://localhost:4545
```

**2. In the UI:**
- Click **"Actions"** → **"Create Action"**
- Name: `sayHello`
- Description: "Greets a user by name"
- Add parameter: `name` (string, required)
- Click **"Create"**

**3. Test it:**
- Click **"Deploy"** → Select "Local Development" → **"Deploy"**
- Use the MCP Inspector or ChatGPT to call your action

**That's it!** You've created your first ChatGPT action.

## Common Commands

### Development
```bash
./run.sh                # Start everything (easiest)
./check-env.sh          # Verify your setup

# Or manually:
cd lcb-server && make serve          # Start MCP server
cd lcb-ui && npm run dev             # Start UI
```

### Creating Actions
```bash
cd lcb-server
make create-action NAME=myAction     # Create new action
make create-action NAME=myWidget WIDGET=true  # With widget
```

### Deployment
```bash
# Local deployment (via UI)
# Just click "Deploy" in the UI!

# Production deployment (advanced)
cd lcb-server
make deploy             # Deploy to production
```

## Testing Your Actions

### Option 1: MCP Inspector (Recommended for Development)

```bash
npx @modelcontextprotocol/inspector
```

Then connect to: `http://localhost:${LCB_SERVER_PORT}/<service-name>`

### Option 2: ChatGPT (Production Testing)

Once deployed, your actions will be available in ChatGPT conversations.

## How It Works

When you start the UI, it automatically sets up:
- **Local development environment** for testing
- **Database** to store your actions and configuration
- **Deployment pipelines** for one-click deploys

Everything is pre-configured and ready to use!

## Key Features

- ✅ **5-Step Action Wizard**: Guided creation with validation
- ✅ **Visual Widget Builder**: Create interactive UI without code
- ✅ **Hot Reload**: See changes instantly during development
- ✅ **Change Tracking**: Review all changes before deploying
- ✅ **One-Click Deploy**: Deploy to production with a single click
- ✅ **Rollback Support**: Undo deployments if needed
- ✅ **Built-in Testing**: Test actions before deploying
- ✅ **Type-Safe**: Full TypeScript support with auto-completion

## Technology Stack

- **Language**: TypeScript (full type safety)
- **MCP SDK**: @modelcontextprotocol/sdk v1.20.2
- **UI Framework**: React 18 + Vite
- **UI Library**: Adobe React Spectrum
- **Backend**: Hono (lightweight & fast)
- **Testing**: Jest
- **Deployment**: Production-ready infrastructure

## Troubleshooting

### ❌ "AEM_COMPUTE_SERVICE not set"
**Problem:** Missing or incorrect `.env` file  
**Solution:** Copy `.env.example` to `.env` and edit the values

### ❌ "Port already in use"
**Problem:** Another process is using the port  
**Solution:** Run `./run.sh` - it will detect and offer to stop existing processes

### ❌ "Certificate error" in browser
**Problem:** Self-signed HTTPS certificate  
**Solution:** Click "Advanced" → "Proceed to localhost" (this is normal for local dev)

### ❌ Action not appearing in ChatGPT
**Problem:** Not deployed yet  
**Solution:** Click "Deploy" in the UI and wait for deployment to complete

### 💡 Still stuck?

1. Run `./check-env.sh` to verify your setup
2. Check `lcb-server/README.md` for detailed documentation
3. See `CLAUDE.md` for architecture details

## Next Steps

**Now that you're set up:**

1. **Explore Example Actions**: Check `lcb-server/server/src/actions/` for examples
2. **Read Action Guide**: See `lcb-server/server/src/actions/README.md`
3. **Build Widgets**: See `lcb-server/server/src/widgets/README.md`
4. **Deploy to Production**: When ready, see deployment documentation

**Example Projects You Can Build:**
- 🛍️ E-commerce product search with cart widgets
- 📅 Appointment booking with calendar display
- 📊 Data visualization with interactive charts
- 🔍 Content search with rich result cards
- 📝 Form submission with confirmation widgets

## License

**Note:** This project requires an appropriate license before distribution. All source files contain Adobe confidential headers.

