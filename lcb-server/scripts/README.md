# Scripts Documentation

This directory contains 7 utility scripts for managing the MCP server project, from manual action scaffolding to automated lcb-ui integration.

## Table of Contents

1. [generate-action.js](#generate-actionjs) - Manual action scaffolding
2. [generate-actions-from-schemas.js](#generate-actions-from-schemasjs) - JSON Schema → Zod codegen
3. [generate-eds-widgets-index.js](#generate-eds-widgets-indexjs) - Widget resource indexing
4. [generate-actions-from-db.js](#generate-actions-from-dbjs) - Generate actions from lcb-ui database
5. [generate-eds-widgets-from-db.js](#generate-eds-widgets-from-dbjs) - Generate widget actions from database
6. [delete-actions-from-db.js](#delete-actions-from-dbjs) - Delete actions marked in database
7. [generate-widget-templates.js](#generate-widget-templatesjs) - Generate template.html from metadata

---

## generate-action.js

**Purpose**: Scaffold new MCP actions with optional widget support for manual development.

### Usage

```bash
# Create a basic action (no widget)
make create-action NAME=myNewAction

# Create an action with a widget
make create-action NAME=myWidgetAction WIDGET=true
```

### What It Creates

#### Basic Action (without widget)
```
server/src/actions/myNewAction/
├── schema.json           # Action metadata and JSON Schema
└── index.ts              # Handler function only
```

#### Action with Widget
```
server/src/actions/myWidgetAction/
├── schema.json           # Action metadata with widget flags
├── index.ts              # Handler function only
└── widget/
    ├── index.ts          # Widget metadata
    └── template.html     # Widget HTML template
```

### Generated Files

The script generates fully-functional scaffolding with:

- **Adobe copyright headers** on all files
- **schema.json**: Action metadata, JSON Schema inputSchema, annotations
- **index.ts**: Type-safe handler function with structured logging
- **Widget metadata** (if `WIDGET=true` flag is used)
- **Error handling** with try-catch blocks
- **Execution timing** for performance monitoring

### Post-Generation Steps

1. **Edit schema.json**: Add input parameters, validators, annotations
2. **Implement handler logic** in `index.ts`
3. **Customize widget** (if applicable) in `widget/template.html`
4. **Auto-generated indices**: `make create-action` automatically runs:
   - `make generate-actions` - Builds Zod validators
   - `make generate-eds-widgets` - Indexes widget resources
5. **Test your action**: `make test`
6. **Build and serve**: `make build && make serve`

### Examples

```bash
# Create a search action without a widget
make create-action NAME=searchContent

# Create a dashboard widget action
make create-action NAME=dashboardWidget WIDGET=true

# Create a status check action with a visual widget
make create-action NAME=statusCheck WIDGET=true
```

---

## generate-actions-from-schemas.js

**Purpose**: Convert declarative JSON Schema definitions to runtime Zod validators. This is the core of the schema-driven validation system.

**Size**: 188 lines

### Usage

```bash
make generate-actions
# or
npm run generate-actions
```

**Auto-run**: Called by `make build`, `make create-action`

### Process Flow

1. **Discovery**: Scans `server/src/actions/*/schema.json` files
2. **Parsing**: Reads each schema.json containing:
   - Action name, version, publication status
   - Input parameter definitions (JSON Schema format)
   - Annotations (destructiveHint, openWorldHint, readOnlyHint)
   - OpenAI metadata for ChatGPT Apps
3. **Code Generation**: Converts JSON Schema → Zod validator code
4. **Output**: Generates `server/src/actions/index.ts` with:
   - Import statements for all handler modules
   - Zod validator objects for each action
   - Action array with metadata + validators + handlers

### Key Functions

#### `buildStringValidator(schema)`
Builds Zod validator string for string types with constraints.

**Input**: JSON Schema fragment
```json
{
  "type": "string",
  "minLength": 3,
  "maxLength": 500,
  "pattern": "^[a-zA-Z0-9\\s]+$"
}
```

**Output**: Zod validator code
```javascript
z.string().trim().min(3, "Must be at least 3 characters").max(500, "Must be at most 500 characters").regex(/^[a-zA-Z0-9\s]+$/, "Invalid format")
```

#### `buildEnumValidator(enumValues)`
Generates Zod enum validator from array of allowed values.

**Input**: `["option1", "option2", "option3"]`

**Output**: `z.enum(["option1", "option2", "option3"])`

#### `jsonSchemaToZod(schema)`
Recursive converter from JSON Schema to Zod validator code.

**Supported Types**:
- `string`: With minLength, maxLength, pattern, enum
- `number`/`integer`: Basic numeric validation
- `boolean`: Boolean values
- `array`: Arrays with item type validation
- `object`: Nested objects with required fields
- `enum`: Enumerated values (any type)

**Example Conversion**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "minLength": 3
    },
    "limit": {
      "type": "number"
    }
  },
  "required": ["query"]
}
```

Generates:
```javascript
z.object({
  "query": z.string().trim().min(3, "Must be at least 3 characters"),
  "limit": z.number().optional()
})
```

### Generated Output Structure

**server/src/actions/index.ts**:
```typescript
import { z } from 'zod';
import * as mod_contentSearch from './contentSearch';
import * as mod_heartbeat from './heartbeat';
// ... more imports

const actions = [
  {
    name: "contentSearch",
    version: "0.0.15",
    isPublished: true,
    hasAemWidget: false,
    definition: {
      title: "Content Search",
      description: "Natural language content search...",
      inputSchema: z.object({
        query: z.string().trim().min(3, "Must be at least 3 characters")
      }),
      annotations: { /* ... */ },
      _meta: { /* ... */ }
    },
    handler: mod_contentSearch.handler,
    fileName: 'contentSearch/index.ts'
  },
  // ... more actions
];

export default actions;
```

### Integration with MCP Server

The generated `actions` array is imported in `mcp-server.ts` and registered:

```typescript
import actions from './actions';

// For each action
server.registerTool(action.name, toolDefinition, async (args, extra) => {
  // 1. Validate args with Zod schema
  const validatedArgs = action.definition.inputSchema.parse(args || {});

  // 2. Call handler with validated args
  const result = await action.handler(validatedArgs);

  return result;
});
```

---

## generate-eds-widgets-index.js

**Purpose**: Auto-discover and register all EDS widget resources for ChatGPT Apps.

**Size**: 250 lines

### Usage

```bash
make generate-eds-widgets
# or
npm run generate-eds-widgets
```

**Auto-run**: Called by `make build`, `make create-action WIDGET=true`

### Process Flow

1. **Scan**: Finds all `server/src/actions/*/widget/` directories
2. **Read Metadata**: Parses `widget-schema.json` in each widget folder
3. **Generate Index**: Creates `server/src/actions/index-widgets.ts` with:
   - Import statements for all widget metadata modules
   - Widget resource objects with URI, MIME type, metadata

### Widget Resource Format

Each widget resource includes:

- **URI**: `ui://eds-widget/{actionName}-widget.html` (ChatGPT Apps protocol)
- **MIME Type**: `text/html+skybridge` (Skybridge widget format)
- **Name**: Human-readable widget name
- **Description**: Widget purpose and functionality
- **Metadata**: OpenAI-specific widget configuration

### Generated Output Structure

**server/src/actions/index-widgets.ts**:
```typescript
import * as widget_helloWorldEDS from './helloWorldEDS/widget';
import * as widget_getAdobeShirts from './getAdobeShirts/widget';
// ... more imports

const widgets = [
  {
    uri: "ui://eds-widget/hello-world-eds-widget.html",
    name: "Hello World EDS Widget",
    mimeType: "text/html+skybridge",
    description: "Visual heartbeat display...",
    metadata: widget_helloWorldEDS.metadata,
    getTemplate: widget_helloWorldEDS.getTemplate
  },
  // ... more widgets
];

export default widgets;
```

### Integration with MCP Server

Widgets are registered as MCP resources in `mcp-server.ts`:

```typescript
import widgets from './actions/index-widgets';

// For each widget
server.registerResource({
  uri: widget.uri,
  name: widget.name,
  mimeType: widget.mimeType,
  description: widget.description
}, async () => {
  const template = await widget.getTemplate();
  return { contents: [{ uri: widget.uri, mimeType: widget.mimeType, text: template }] };
});
```

---

## generate-actions-from-db.js

**Purpose**: Generate physical action files for actions created in lcb-ui. This bridges the gap between UI-based action creation and filesystem-based deployment.

**Size**: 354 lines

### Usage

```bash
make generate-new-actions
# or
node scripts/generate-actions-from-db.js
```

**Auto-run**: Called during lcb-ui deployment workflow

### Process Flow

1. **Read Database**: Parses `../../lcb-ui/db.json`
2. **Find Local Server**: Locates `serverType: 'local-managed'` server
3. **Get Non-Deployed Actions**: Filters actions where `deployed: false` AND `deleted: false`
4. **Filter Widgetless**: Skips actions with `hasEdsWidget: true` (handled by script #5)
5. **Generate Folders**: Creates action directories with schema.json + index.ts
6. **Idempotency**: Skips actions that already exist on disk

### Key Functions

#### `transformInputSchema(inputSchema)`
Converts lcb-ui inputSchema format to JSON Schema format.

**Input** (lcb-ui format):
```javascript
{
  properties: {
    query: {
      type: 'string',
      description: 'Search query',
      minLength: 3,
      maxLength: 500
    }
  },
  required: ['query']
}
```

**Output** (JSON Schema format):
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query",
      "minLength": 3,
      "maxLength": 500
    }
  },
  "required": ["query"]
}
```

#### `generateSchemaJson(action)`
Creates schema.json content from action metadata.

**Output**:
```json
{
  "name": "myAction",
  "version": "0.0.1",
  "isPublished": true,
  "hasAemWidget": false,
  "definition": {
    "title": "MyAction",
    "description": "Generated action: myAction",
    "inputSchema": { /* transformed schema */ },
    "annotations": {
      "destructiveHint": false,
      "openWorldHint": false,
      "readOnlyHint": false
    }
  }
}
```

#### `generateIndexTs(action)`
Creates index.ts handler template.

**Output**:
```typescript
import type { ActionHandlerResult } from '../../types';
import { logger } from '../../utils/logger';

async function handler(args: {}): Promise<ActionHandlerResult> {
  const startTime = Date.now();
  logger.info(`MCP: action=tool_invoked;tool=${action.name};status=starting`);

  try {
    logger.info(`MCP: action=tool_execution;tool=${action.name};status=processing`);

    const now = new Date();
    const utcTimestamp = now.toISOString();
    const responseText = `Hello from ${action.name}! Generated at ${utcTimestamp}`;

    const result = {
      content: [{
        type: 'text' as const,
        text: responseText
      }],
      success: true,
      timestamp: now.getTime()
    };

    const executionTime = Date.now() - startTime;
    logger.info(`MCP: action=tool_completed;tool=${action.name};status=success;duration_ms=${executionTime}`);

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    logger.error(`MCP: action=tool_completed;tool=${action.name};status=error;duration_ms=${executionTime};error=${error.message}`);

    return {
      content: [{
        type: 'text' as const,
        text: `Error in ${action.name}: ${error.message}`
      }],
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

export { handler };
```

### Important Notes

- **Does NOT mark actions as deployed**: The UI deployment flow marks actions as `deployed: true` via API call AFTER successful build verification
- **Idempotent**: Safe to run multiple times, skips existing folders
- **Validation preserved**: Transfers minLength, maxLength validators from UI to schema.json
- **Annotations preserved**: Copies destructiveHint, openWorldHint, readOnlyHint from UI

---

## generate-eds-widgets-from-db.js

**Purpose**: Generate widget action files for actions with `hasEdsWidget: true` created in lcb-ui.

### Usage

```bash
# Currently integrated into generate-actions-from-db.js workflow
# Separate script for widget-specific generation
```

### Process

Similar to script #4 but:
- Filters actions where `hasEdsWidget: true`
- Creates widget/ subdirectory with:
  - `widget/index.ts` - Widget metadata
  - `widget/widget-schema.json` - Widget resource metadata
  - `widget/template.html` - Generated by script #7

---

## delete-actions-from-db.js

**Purpose**: Physical deletion of actions marked for deletion in lcb-ui, including associated widget resources.

**Size**: 338 lines

### Usage

```bash
make delete-actions-from-db
# or
node scripts/delete-actions-from-db.js
```

**Auto-run**: Called during lcb-ui deployment workflow (before building)

### Process Flow

1. **Read Database**: Parses `../../lcb-ui/db.json`
2. **Find Deleted Actions**: Filters actions where `deleted: true`
3. **Check Deployment Status**:
   - If `deployed: false`: Skip folder deletion (never generated on disk)
   - If `deployed: true`: Delete action folder recursively
4. **List Files**: Recursively lists all files in action folder before deletion
5. **Delete Folder**: Uses `fs.rmSync()` with `{ recursive: true, force: true }`
6. **Remove from Database**: Deletes action entry from `db.actions[serverId]` arrays
7. **Find Associated Widget Resource**: Uses multiple matching strategies:
   - By `actionName` field (if exists)
   - By extracting action name from URI pattern: `ui://eds-widget/{actionName}.html`
   - By matching `action._meta['openai/outputTemplate']` with resource URI
8. **Delete Widget Resource**: Removes resource from `db.widgetResources[serverId]`
9. **Write Database**: Saves updated database back to disk

### Key Functions

#### `listFilesRecursively(dir, prefix)`
Recursively lists all files and directories for deletion preview.

**Output**:
```
actionName/
actionName/schema.json
actionName/index.ts
actionName/widget/
actionName/widget/index.ts
actionName/widget/widget-schema.json
actionName/widget/template.html
```

#### `deleteActionFolder(actionName)`
Recursively deletes action folder and all contents.

**Returns**: `{ success: boolean, files: string[] }`

#### `removeActionFromDb(db, serverId, actionName)`
Removes action from both `discovered` and `custom` arrays in database.

#### `removeResourceFromDb(db, serverId, resourceUri)`
Removes widget resource from `db.widgetResources[serverId]` array.

### Widget Resource Matching Strategies

The script uses 3 methods to find associated widget resources:

1. **Direct Field Match**:
   ```javascript
   resources.find(r => r.actionName === actionName)
   ```

2. **URI Pattern Extraction**:
   ```javascript
   // Extract from URI like "ui://eds-widget/action_4spenj.html"
   const match = r.uri.match(/ui:\/\/(?:eds|aem)-widget\/([^.\/]+)(?:\.html)?$/);
   return match && match[1] === actionName;
   ```

3. **Output Template Match**:
   ```javascript
   // Match action's outputTemplate with resource URI
   resources.find(r => r.uri === action._meta['openai/outputTemplate'])
   ```

### Console Output Example

```
✅ Database loaded successfully
✅ Found local-managed server: local-dev-server

📋 Found 2 action(s) marked for deletion:

🗑️  Deleting action: test_deploy_widget
   ✓ Deleted folder: server/src/actions/test_deploy_widget/
   📄 Deleted 7 file(s) and folder(s):
      - test_deploy_widget/
      - test_deploy_widget/schema.json
      - test_deploy_widget/index.ts
      - test_deploy_widget/widget/
      - test_deploy_widget/widget/index.ts
      - test_deploy_widget/widget/widget-schema.json
      - test_deploy_widget/widget/template.html
   ✓ Removed action from database
   ✓ Deleted EDS Widget resource: ui://eds-widget/test_deploy_widget-widget.html

🗑️  Deleting action: myOldAction
   ℹ️  Action was never deployed (created in UI but not yet generated on disk)
   ⏭️  Skipping folder deletion (folder doesn't exist)
   ✓ Removed action from database

✅ Database updated successfully

================================================================================
 Deletion Summary
================================================================================
✅ Deleted 1 action(s) from filesystem
✅ Deleted 1 EDS Widget(s) from database
```

---

## generate-widget-templates.js

**Purpose**: Auto-generate widget HTML templates from widget metadata. This eliminates manual template.html creation and ensures consistency across all widget actions.

**Size**: 119 lines

### Usage

```bash
make generate-widget-templates
# or
node scripts/generate-widget-templates.js
```

**Auto-run**: Called during lcb-ui deployment workflow (after writing widget-schema.json)

### Process Flow

1. **Scan Widgets**: Finds all `server/src/actions/*/widget/widget-schema.json` files
2. **Read Metadata**: Extracts `_meta['openai:widget_meta']` containing:
   - `script_url`: URL to aem-embed.js script (required)
   - `widget_embed_url`: URL to widget content (required)
3. **Validate**: Skips widgets missing required template URLs
4. **Generate Template**: Creates template.html with proper HTML structure
5. **Write File**: Overwrites existing template.html

### Template Generation Logic

#### Input (widget-schema.json):
```json
{
  "_meta": {
    "openai:widget_meta": {
      "script_url": "https://main--helix-website--hlxsites.aem.live/blocks/aem-embed/aem-embed.js",
      "widget_embed_url": "https://main--helix-website--hlxsites.aem.live/tools/sidekick/custom-plugins-widget-hello"
    }
  }
}
```

#### Output (template.html):
```html
<script src="https://main--helix-website--hlxsites.aem.live/blocks/aem-embed/aem-embed.js" type="module"></script>
<div>
    <aem-embed url="https://main--helix-website--hlxsites.aem.live/tools/sidekick/custom-plugins-widget-hello"></aem-embed>
</div>
```

### Key Functions

#### `generateTemplateFromSchema(widgetMeta)`
Generates HTML template from widget metadata.

**Process**:
1. Extract `script_url` and `widget_embed_url` from `_meta['openai:widget_meta']`
2. Build HTML string:
   - Add `<script>` tag with `type="module"` if `script_url` exists
   - Add `<div>` wrapper with `<aem-embed>` element
3. Return complete HTML string

#### `processWidgets()`
Main processing loop:
1. Reads all action directories
2. Checks for widget/ subdirectory
3. Validates widget-schema.json presence
4. Validates required template URLs
5. Generates and writes template.html

### Console Output Example

```
================================================================================
Generating Widget Templates from widget-schema.json
================================================================================

✅ Generated template.html for helloWorldEDS
✅ Generated template.html for getAdobeShirts
✅ Generated template.html for systemStatusWidget
✅ Generated template.html for test_deploy_widget
⏭️  Skipping myIncompleteWidget: Missing required template URLs in widget-schema.json

================================================================================
Widget Template Generation Complete
================================================================================
✅ Generated: 4 template(s)
⏭️  Skipped: 1 widget(s)
```

### Benefits

- **Consistency**: All widgets follow same HTML structure
- **Automation**: No manual template.html editing required
- **Validation**: Ensures required URLs are present before deployment
- **Maintainability**: Single source of truth (widget-schema.json) for template URLs
- **lcb-ui Integration**: Enables full UI-based widget creation workflow

---

## Script Execution Order

### During lcb-ui Deployment

The scripts execute in this specific order:

1. `make kill-fastly` - Kill existing Fastly processes
2. `make generate-new-actions` → **Script #4** (generate-actions-from-db.js)
   - Generates folders for new widgetless actions
3. `make delete-actions-from-db` → **Script #6** (delete-actions-from-db.js)
   - Deletes marked actions + associated widget resources
4. Write draft schemas to schema.json files (UI backend handles this)
5. Write widget resource drafts to widget-schema.json files (UI backend handles this)
6. `make generate-widget-templates` → **Script #7** (generate-widget-templates.js)
   - Generates template.html from widget-schema.json
7. `make generate-actions` → **Script #2** (generate-actions-from-schemas.js)
   - Builds Zod validators from all schema.json files
8. `make generate-eds-widgets` → **Script #3** (generate-eds-widgets-index.js)
   - Indexes all widget resources
9. `make build` - Compile TypeScript + create WASM package
10. `make serve` - Start local server

### Manual Development

For manual action creation:

1. `make create-action NAME=myAction [WIDGET=true]` → **Script #1** (generate-action.js)
   - Creates action scaffolding
2. Auto-runs: **Script #2** (generate-actions-from-schemas.js)
3. Auto-runs (if widget): **Script #3** (generate-eds-widgets-index.js)

---

## Database Integration

### Database Schema (lcb-ui/db.json)

```json
{
  "servers": [
    {
      "id": "local-dev-server",
      "serverType": "local-managed",
      "name": "Local Development Server",
      "url": "http://localhost:${LCB_SERVER_PORT}/<service-name>"  // Extracted from AEM_COMPUTE_SERVICE in .env
    }
  ],
  "actions": {
    "local-dev-server": {
      "discovered": [ /* actions from connected MCP server */ ],
      "custom": [ /* manually created actions */ ]
    }
  },
  "widgetResources": {
    "local-dev-server": [
      {
        "uri": "ui://eds-widget/hello-world-eds-widget.html",
        "name": "Hello World EDS Widget",
        "description": "Visual heartbeat display...",
        "actionName": "helloWorldEDS",
        "_meta": {
          "openai:widget_meta": {
            "script_url": "https://...",
            "widget_embed_url": "https://..."
          }
        }
      }
    ]
  }
}
```

### Action States

Actions track lifecycle through these flags:

- `deployed: false` - Created in UI, not yet generated on disk
- `deployed: true` - Generated on disk and deployed to server
- `deleted: true` - Marked for deletion (soft delete)
- `draft: true` - Modified but not yet deployed
- `hasEdsWidget: true` - Action includes EDS widget

### Resource Cleanup

Widget resources are automatically deleted when:
1. Associated action is marked `deleted: true`
2. URI pattern matches: `ui://eds-widget/{actionName}.html`
3. Script #6 runs during deployment

---

## Troubleshooting

### Script #4 (generate-actions-from-db.js)

**Issue**: "No new actions found in database"
- Check `db.actions[serverId]` contains actions with `deployed: false`
- Verify actions are not deleted (`deleted: false`)

**Issue**: "Action folder already exists"
- Script is idempotent, skips existing folders
- Safe to run multiple times

### Script #6 (delete-actions-from-db.js)

**Issue**: "No matching resource found for action: X"
- Action has `hasEdsWidget: true` but no resource entry
- Check `db.widgetResources[serverId]` for matching URI

**Issue**: "Folder not found"
- Action was never deployed (`deployed: false`)
- Script skips folder deletion, only removes database entry

### Script #7 (generate-widget-templates.js)

**Issue**: "Missing required template URLs"
- `widget-schema.json` missing `script_url` or `widget_embed_url`
- Check `_meta['openai:widget_meta']` contains both URLs

**Issue**: "widget-schema.json not found"
- Widget directory exists but schema file missing
- Create widget-schema.json or delete widget/ folder

---

## Best Practices

1. **Always use Makefile targets** instead of running scripts directly
2. **Let lcb-ui handle deployment** for UI-created actions
3. **Use script #1 for manual development** when prototyping new features
4. **Check console output** during deployment for errors
5. **Verify database state** before and after script execution
6. **Backup db.json** before major operations
7. **Test locally** before deploying to Fastly production

