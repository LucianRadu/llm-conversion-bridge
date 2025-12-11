# Creating an EDS Action: Step-by-Step Guide

This guide walks you through creating an EDS (Edge Delivery Services) action with a widget using the Create Action Wizard. We'll create a `helloWorldBMW` action as an example.

## Prerequisites

- LCB UI running at `https://localhost:4545`
- Local managed server started and connected
- EDS page available at: `https://da.live/#/lucianradu/chatgpt-eds/widgets/bmw`

---

## Getting Started

1. Navigate to the Actions page by opening your browser to `https://localhost:4545/actions`
2. Click **"Actions & Widgets"** in the left sidebar
3. Click the **"Add Action"** button in the top right corner

The Create Action Wizard will open with a 5-step flow for EDS actions.

---

## Step 1: Action Details & Input Schema

This step defines the basic action properties and input parameters.

### Left Column: Action Properties

#### Action Name (Required)
- **Enter**: `helloWorldBMW`

#### Description (Required)
- **Enter**: `A sample BMW widget action that demonstrates EDS integration with read-only access`
- **Purpose**: Describes what the action does for users and ChatGPT

#### Annotations
- **Check only**: `readOnlyHint`
- **Leave unchecked**: `destructiveHint`, `openWorldHint`
- **Explanation**: 
  - `readOnlyHint` indicates this action only reads data without modifying it
  - This helps ChatGPT understand the action's safety profile

#### Has EDS Widget (Required)
- **Select**: `Yes`
- **Effect**: Enables the widget creation flow (Steps 2-5 instead of just Step 2)

### Right Column: Input Parameters

#### Input Parameters
- **For this action**: Leave empty (no parameters)
- **Note**: The gray box will show: "No parameters configured. This action will take no input."

Click **"Next"** to proceed to Step 2.

---

## Step 2: Action OpenAI Metadata

This step configures how the action integrates with ChatGPT Apps and OpenAI.

### Auto-Populated Fields

#### Output Template (URI)
- **Value**: `ui://eds-widget/hello-world-bmw-widget.html`
- **Auto-generated**: Converted from camelCase (`helloWorldBMW`) to kebab-case (`hello-world-bmw`) with `-widget.html` suffix
- **Disabled**: Cannot be edited (synchronized with widget resource URI)
- **Purpose**: Points to the HTML template resource that will be rendered as a widget

#### Widget Accessible
- **Value**: Checked (enabled by default)
- **Disabled**: Cannot be edited
- **Purpose**: Allows the widget to call back to this tool through the OpenAI client bridge, enabling interactive components

### Editable Fields

#### Invoking Status Text (Required)
- **Enter**: `Loading Hello World BMW...`
- **Purpose**: Displayed to users while the action is running

#### Invoked Status Text (Required)
- **Enter**: `Hello World BMW complete`
- **Purpose**: Displayed to users after the action completes

Click **"Next"** to proceed to Step 3.

---

## Step 3: EDS Widget Resource Metadata

This step defines the widget resource that will be created and registered with the MCP server.

### Left Column: MCP Strict Resource Fields

#### Name (Required)
- **Value**: `helloWorldBMWWidget`
- **Auto-generated**: Action name + "Widget" suffix
- **Read-only**: Cannot be edited (required naming convention)
- **Purpose**: Unique identifier for the widget resource

#### URI (Required)
- **Value**: `ui://eds-widget/hello-world-bmw-widget.html`
- **Auto-synchronized**: Same as Output Template from Step 2
- **Disabled**: Cannot be edited
- **Purpose**: Resource identifier in the MCP protocol

#### Description (Required - MANDATORY)
- **Enter**: `BMW widget displaying automotive information with EDS integration`
- **Purpose**: Standard MCP resource description displayed in resource lists
- **Note**: This field is MANDATORY - the system will not allow proceeding without it

#### MIME Type
- **Value**: `text/html+skybridge`
- **Disabled**: Cannot be edited
- **Purpose**: Identifies this as a Skybridge-compatible HTML widget

### Right Column: OpenAI Metadata (Scrollable)

#### Widget Description (Optional)
- **Enter**: `Interactive BMW widget for ChatGPT with dark mode support`
- **Purpose**: ChatGPT-specific description (different from standard MCP description)
- **Usage**: Can be left empty if not needed

#### Prefers Border (Optional)
- **Check**: Leave unchecked (or check based on design preference)
- **Purpose**: Indicates if the widget should have a border in the ChatGPT UI

#### Widget CSP - Connect Domains
- **Auto-populated**: `https://main--chatgpt-eds--lucianradu.aem.page`
- **Source**: From server's EDS config
- **Purpose**: Content Security Policy for network requests
- **Can add more**: Click "Add Connect Domain" to add additional domains

#### Widget CSP - Resource Domains
- **Auto-populated**: `https://main--chatgpt-eds--lucianradu.aem.page`
- **Source**: From server's EDS config
- **Purpose**: Content Security Policy for loading resources (CSS, JS, images)
- **Can add more**: Click "Add Resource Domain" to add additional domains

#### Widget Domain
- **Value**: `https://web-sandbox.oaiusercontent.com`
- **Auto-populated**: ChatGPT sandbox domain
- **Purpose**: Domain where the widget will be rendered in ChatGPT

Click **"Next"** to proceed to Step 4.

---

## Step 4: Template URLs (CRITICAL)

This is the most critical step - these URLs are MANDATORY for template.html generation.

### ⚠️ Important Warning Box

The wizard displays an orange warning box:

> ⚠️ Enter an existing EDS Page URL or create a **new EDS Page** for this Action.

If you have a valid Widget Embed URL, the "new EDS Page" text will be a clickable link to da.live.

### Template URL Fields

#### Script URL (Required - MANDATORY)
- **Enter**: `https://github.com/LucianRadu/chatgpt-eds/blob/main/scripts/aem-embed.js`
- **Purpose**: URL to the AEM embed WebComponent script

#### Widget Embed URL (Required - MANDATORY)
- **Enter**: `https://main--chatgpt-eds--lucianradu.aem.page/widgets/bmw`
- **Purpose**: URL to the widget content page

### EDS Page Preview

Once you enter a valid Widget Embed URL, a live preview iframe appears:
- **Refresh button**: Click to reload the preview
- **Loading state**: Shows spinner while loading
- **Size**: 400px height, full width
- **Purpose**: Verify the widget renders correctly before deployment

### Understanding URL Patterns

**da.live Editor URL** (for editing):
```
https://da.live/#/lucianradu/chatgpt-eds/widgets/bmw
```

**aem.page Published URL** (for embedding):
```
https://main--chatgpt-eds--lucianradu.aem.page/widgets/bmw
```

Pattern: `https://{branch}--{repo}--{owner}.aem.page/{path}`

**CRITICAL**: Without these URLs, `template.html` cannot be generated during deployment!

Click **"Next"** to proceed to Step 5.

---

## Step 5: Files Preview

This step shows the files and folders that will be created during deployment.

### Info Message

A gray info box displays:

> ℹ️ These files and folders will be created during deployment. The action will be available for calling only after successful deployment.

### File Tree Structure

```
lcb-server/server/src/actions/
└── helloWorldBMW/
    ├── schema.json
    ├── index.ts
    └── widget/
        ├── widget-schema.json
        ├── index.ts
        └── template.html
```

### File Descriptions

#### `schema.json`
- **Purpose**: Action definition with metadata
- **Contains**: 
  - Action name, version, isPublished
  - Definition: title, description, inputSchema, annotations
  - OpenAI metadata (_meta): output template, widget accessible, status texts

#### `index.ts`
- **Purpose**: Action handler implementation
- **Contains**: 
  - Template handler function
  - Logging and error handling
  - Returns text response with timestamp

#### `widget/widget-schema.json`
- **Purpose**: Widget resource metadata
- **Contains**: 
  - Resource URI, name, description, MIME type
  - OpenAI widget metadata: CSP domains, widget domain, template URLs

#### `widget/index.ts`
- **Purpose**: Widget metadata export
- **Contains**: 
  - Imports widget-schema.json
  - Exports widgetMeta for MCP server registration

#### `widget/template.html`
- **Purpose**: HTML template rendered in ChatGPT
- **Generated from**: widget-schema.json (script_url + widget_embed_url)
- **Contains**:
  ```html
  <script src="https://github.com/LucianRadu/chatgpt-eds/blob/main/scripts/aem-embed.js" type="module"></script>
  <div>
      <aem-embed url="https://main--chatgpt-eds--lucianradu.aem.page/widgets/bmw"></aem-embed>
  </div>
  ```

### Final Action

Click **"Create Action"** to save the action to the database.

**Result**: 
- Action saved with `deployed: false` (NOT DEPLOYED badge)
- Widget resource saved with `deployed: false`
- Changelog entry created
- Action appears in Actions list with yellow "NOT DEPLOYED" badge

---

## Deployment Process

After creating the action, you must deploy it to make it available.

### Navigate to Environments Page

1. Click **"Environments"** in the left sidebar (or click "Deploy" if visible)
2. URL: `https://localhost:4545/deploy`

### Select Environment

1. Find **"Local Development"** in the environments list
2. Click on it to select it (blue border highlight)

### Deploy

1. Click the **"Deploy"** button
2. Deployment output appears in real-time with ANSI colors
3. Wait for deployment to complete (status: success/error)

### Deployment Steps (Automatic)

The system executes these steps automatically:

1. **Stop running servers** (`make kill-fastly`)
2. **Generate new action files** (`make generate-new-eds-actions`)
   - Creates `helloWorldBMW/` folder
   - Generates `schema.json`, `index.ts`
   - Generates `widget/widget-schema.json`, `widget/index.ts`, `widget/template.html`
3. **Generate widget templates** (`make generate-widget-templates`)
   - Reads widget-schema.json
   - Extracts script_url and widget_embed_url
   - Generates template.html with proper tags
4. **Build and serve** (`make build` + `make serve`)
   - Runs tests
   - Generates actions index
   - Builds WASM binary
   - Starts local server with health check
5. **Cleanup and reconnect**
   - Clears drafts and changelog
   - Marks action/resource as `deployed: true`
   - Reconnects to server with fresh MCP session

### Verify Deployment

1. Navigate back to **Actions & Widgets** page
2. Find `helloWorldBMW` in the actions list
3. Verify:
   - ✅ **No "NOT DEPLOYED" badge** (badge should be gone)
   - ✅ **ViewDetail icon** displayed (indicates widget present)
   - ✅ Action is clickable and executable

---

## Troubleshooting

### Common Issues

#### "Spaces are not allowed" error
- **Cause**: Action name contains spaces
- **Solution**: Remove all spaces, use camelCase or underscores

#### "An action with this name already exists"
- **Cause**: Duplicate action name
- **Solution**: Choose a different unique name

#### "URL must use HTTPS protocol"
- **Cause**: Script URL or Widget Embed URL uses HTTP
- **Solution**: Change to HTTPS

#### "URL must include a valid path"
- **Cause**: URL missing path component
- **Solution**: Add path like `/scripts/file.js` or `/widgets/name`

#### Deployment fails at build step
- **Cause**: Missing template URLs or invalid schema
- **Solution**: Check db.json for correct URLs in `_meta['openai:widget_meta']`

#### Widget doesn't render in ChatGPT
- **Cause**: Incorrect Widget Embed URL or CSP domains
- **Solution**: Verify aem.page URL is accessible and CSP domains match

---

## Comparison with helloWorldEDS

The `helloWorldBMW` action is similar to the existing `helloWorldEDS` action:

### Similarities
- Both are EDS widget actions
- Both use AEM embed WebComponent
- Both have `readOnlyHint` annotation
- Both use the same template structure

### Differences
- **Action name**: `helloWorldEDS` vs `helloWorldBMW`
- **Widget URI**: Different kebab-case names
- **Widget Embed URL**: Different EDS page paths
- **Description**: Different content focus

### Reference Files
Check these existing files for comparison:
- `lcb-server/server/src/actions/helloWorldEDS/schema.json`
- `lcb-server/server/src/actions/helloWorldEDS/widget/widget-schema.json`
- `lcb-server/server/src/actions/helloWorldEDS/widget/template.html`

---

## Key Concepts

### Naming Conventions

- **Action name**: camelCase (e.g., `helloWorldBMW`)
- **Folder name**: Same as action name (e.g., `helloWorldBMW/`)
- **Widget URI**: kebab-case + suffix (e.g., `hello-world-bmw-widget.html`)
- **Widget resource name**: Action name + "Widget" (e.g., `helloWorldBMWWidget`)

### Auto-Population

Fields automatically filled by the wizard:
- **Step 2**: Output Template URI (from action name)
- **Step 3**: Widget name, URI, CSP domains (from action name + server EDS config)
- **Step 4**: Script URL and Widget Embed URL (from server EDS config if available)

### Mandatory vs Optional Fields

**Mandatory** (wizard won't proceed without):
- ✅ Action name
- ✅ Description
- ✅ Has EDS Widget selection
- ✅ Invoking status text
- ✅ Invoked status text
- ✅ Widget resource description
- ✅ Script URL
- ✅ Widget Embed URL

**Optional**:
- Annotations (default: all unchecked)
- Input parameters (default: none)
- Widget OpenAI description
- Prefers border
- Additional CSP domains

---

## Summary

You've successfully created an EDS action with a widget! The `helloWorldBMW` action is now:

1. ✅ Defined in the database
2. ✅ Deployed to the local server
3. ✅ Available for execution in the Actions list
4. ✅ Registered as an MCP tool
5. ✅ Widget registered as an MCP resource

The action can now be tested in the Actions & Widgets page by clicking the Execute button.

---

## Additional Resources

- **Create Action Wizard Code**: `lcb-ui/client/src/components/CreateActionWizard.tsx`
- **Action Generation Script**: `lcb-server/scripts/generate-eds-widgets-from-db.js`
- **Widget Template Generator**: `lcb-server/scripts/generate-widget-templates.js`
- **Example Action**: `lcb-server/server/src/actions/helloWorldEDS/`
- **EDS Documentation**: https://www.aem.live/developer/
- **AEM Embed Component**: https://github.com/LucianRadu/chatgpt-eds/blob/main/scripts/aem-embed.js

