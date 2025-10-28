# Adding New MCP AEM Widgets

This guide explains how to add new MCP AEM Widgets to the project. AEM Widgets are used for interactive UI components that MCP tools can reference.

## AEM Widget Structure

All MCP AEM Widgets follow a simple modular structure:
- **HTML file** (`.html`): Contains the widget's HTML, CSS, and JavaScript
- **TypeScript file** (`.ts`): Defines the widget metadata and configuration

The build system automatically discovers widgets and embeds the HTML content during index generation.

## Basic AEM Widget Template

### Step 1: Create the HTML file

Create `server/src/widgets/myWidget/myWidget.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .my-widget {
            padding: 20px;
            text-align: center;
            background: #f8f9fa;
            border: 2px solid #007bff;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="my-widget">
        <div id="content">Loading...</div>
    </div>
    <script>
        const data = window.openai?.toolOutput || {};
        document.getElementById('content').textContent =
            data.message || 'No data available';
    </script>
</body>
</html>
```

### Step 2: Create the TypeScript metadata file

Create `server/src/widgets/myWidget/myWidget.ts`:

```typescript
/**
 * My Widget Metadata
 * The HTML content is automatically loaded from myWidget.html during build
 */
export const widgetMeta = {
  uri: "ui://aem-widget/my-widget.html",
  name: "My Widget",
  description: "Description of what this widget displays",
  mimeType: "text/html+skybridge",
  htmlFile: "myWidget.html",
  _meta: {
    "openai/outputTemplate": "ui://aem-widget/my-widget.html",
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  }
};
```

### Step 3: Generate the widgets index

Run the generation script to build the index with embedded HTML:

```bash
make generate-aem-widgets
```

This will:
1. Find your widget metadata file
2. Read the corresponding HTML file
3. Generate the `widgets/index.ts` file with embedded HTML content

**Important**: Always edit the `.html` file for visual changes. The build script automatically embeds the HTML.

### Interactive Widget HTML Example

For widgets that display dynamic data from tools with `hasAemWidget: true`:

**HTML File** (`server/src/widgets/myWidget/myWidget.html`):
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        html, body {
            width: 100%;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        body {
            background: #f8f9fa;
        }
        .widget-container {
            width: 100%;
            min-height: 300px;
            padding: 24px;
            box-sizing: border-box;
        }
        .widget-header {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 16px;
            text-align: center;
            color: #333;
        }
        .widget-body {
            font-size: 16px;
            line-height: 1.5;
            text-align: center;
            color: #666;
        }
        .data-display {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 8px;
            padding: 16px;
            margin-top: 16px;
            font-family: monospace;
            font-size: 14px;
            word-break: break-word;
        }
    </style>
</head>
<body>
    <div class="widget-container">
        <div class="widget-header" id="header">Widget Title</div>
        <div class="widget-body" id="body">Widget content loading...</div>
        <div class="data-display" id="data"></div>
    </div>

    <script>
        // Access structured data from the corresponding action
        const data = window.openai?.toolOutput || {};

        // Update widget content based on action data
        document.getElementById('header').textContent =
            data.title || 'My Widget';
        document.getElementById('body').textContent =
            data.message || 'No message available';
        document.getElementById('data').textContent =
            JSON.stringify(data, null, 2);
    </script>
</body>
</html>
```

**Metadata File** (`server/src/widgets/myWidget/myWidget.ts`):
```typescript
export const widgetMeta = {
  uri: "ui://aem-widget/my-widget.html",
  name: "My Widget",
  description: "Interactive widget for displaying action results",
  mimeType: "text/html+skybridge",
  htmlFile: "myWidget.html",
  _meta: {
    "openai/outputTemplate": "ui://aem-widget/my-widget.html",
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
    "openai/widgetPrefersBorder": false,
    "openai/widgetDescription": "Displays widget data with interactive elements"
  }
};
```

## AEM Widget Properties

### Required Properties

- **`uri`**: Unique identifier following the pattern `ui://aem-widget/widget-name.html`
- **`name`**: Human-readable AEM Widget name
- **`description`**: Clear description of what the AEM Widget displays
- **`mimeType`**: Content type (typically `"text/html+skybridge"` for widgets)
- **`content`**: The actual resource content (HTML, CSS, JavaScript)

### Optional Properties

- **`_meta`**: Metadata for widget configuration (required for widgets)

## URI Naming Convention

AEM Widgets should follow consistent URI patterns:

- **AEM Widgets**: `ui://aem-widget/widget-name.html`

## Content Guidelines

### 1. Modular File Structure
AEM Widgets use a simple modular approach:

```
widgets/
└── myWidget/
    ├── myWidget.html  # Edit this - HTML, CSS, JavaScript
    └── myWidget.ts    # Edit this - Widget metadata
```

### 2. HTML Files
- Edit the `.html` file for all visual content
- Include all CSS inline within `<style>` tags
- Include all JavaScript inline within `<script>` tags
- No external file references (Fastly Compute@Edge limitation)

### 3. Build Process
The build script (`generate-aem-widgets-index.js`) automatically:
1. Scans for widget metadata `.ts` files in the widgets directory
2. Reads corresponding `.html` files
3. Generates the `widgets/index.ts` with embedded HTML content

### 4. Self-Contained Styling
Include all CSS inline within the HTML file:

```html
<style>
  .widget { /* styles */ }
</style>
<div class="widget">Content</div>
```

### 5. Data Access Pattern
Access action data via `window.openai.toolOutput`:

```javascript
const data = window.openai?.toolOutput || {};
// Use data.propertyName to access action's structuredContent
```

## AEM Widget-Tool Integration

When creating AEM Widgets for tools with `hasAemWidget: true`:

### 1. Naming Convention
- **Tool**: `myWidgetTool.ts`
- **AEM Widget**: `myWidgetTool.ts` (same name)
- **URI**: `ui://aem-widget/my-widget-action.html`

### 2. Data Flow
1. **Tool** returns `structuredContent` object
2. **MCP** passes data to AEM Widget via `window.openai.toolOutput`
3. **AEM Widget** accesses data and renders UI

### 3. Example Tool Integration
```typescript
// In action handler
return {
  content: [{ type: "text", text: "Success" }],
  structuredContent: {
    title: "Widget Title",
    message: "Data for widget",
    timestamp: new Date().toISOString(),
    items: [...] // Any data structure
  },
  // ... other properties
};
```

## File Generation

The AEM Widget index is automatically generated by the build system:

### Manual Generation
```bash
# Generate AEM Widgets index only
make generate-aem-widgets

# Generate both actions and AEM Widgets
make generate-all
```

### Automatic Generation
The AEM Widget index is automatically generated during:
- `make build`
- `make build-ts`
- `make dev`
- `npm run build:fastly`
- `npm run dev`

## AEM Widget Registration

AEM Widgets are automatically registered when:

1. **File exists**: `server/src/widgets/myWidget/myWidget.ts`
2. **Exported properly**: Default export of `MCPResource` type
3. **Index generated**: `make generate-aem-widgets` has been run

AEM Widgets are automatically linked to tools with matching names that have `hasAemWidget: true`.


## Testing AEM Widgets

### Local Testing
1. Start server: `make serve`
2. Use MCP Inspector: `npx @modelcontextprotocol/inspector`
3. Connect to: `http://127.0.0.1:7676/mcp-boilerplate`
4. Test tools that use your AEM Widgets

**Note**: The MCP endpoint path is defined by `MCP_TRANSPORT_PATH` in `../constants/mcp.ts`.

### AEM Widget Debugging
- Check browser developer tools for errors
- Verify `window.openai.toolOutput` contains expected data
- Test responsive behavior at different sizes
- Validate HTML and CSS syntax

## Examples

See existing AEM Widgets for reference:
- **`heartbeat/heartbeatWidget.html`**: HTML, CSS, and JavaScript for the widget
- **`heartbeat/heartbeatWidget.ts`**: Widget metadata and configuration
- Demonstrates data access via `window.openai.toolOutput` and styling patterns

## Security Considerations

- Never include sensitive data in AEM Widgets
- Sanitize any user-provided data
- Avoid inline event handlers
- Use CSP-compatible coding practices
- Validate all data from `window.openai.toolOutput`

