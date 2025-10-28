# Scripts

This directory contains utility scripts for managing the MCP server project.

## generate-action.js

Generates scaffolding for new MCP actions with optional widget support.

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
├── index.ts              # Action handler with MCP interface
```

#### Action with Widget
```
server/src/actions/myWidgetAction/
├── index.ts              # Action handler with MCP interface and widget metadata
└── widget/
    ├── index.ts          # Widget metadata
    └── template.html     # Widget HTML template
```

### Generated Files

The script generates fully-functional scaffolding with:

- **Adobe copyright headers** on all files
- **Type-safe Action interface** with Zod schema validation
- **Structured logging** for monitoring and debugging
- **Widget metadata** (if --widget flag is used)
- **Error handling** with try-catch blocks
- **Execution timing** for performance monitoring

### Next Steps After Generation

1. **Implement your action logic** in `server/src/actions/{actionName}/index.ts`
   - Define your input schema using Zod
   - Implement the handler function
   - Update the description and title

2. **Customize the widget** (if applicable) in `server/src/actions/{actionName}/widget/template.html`
   - Modify the AEM embed URL
   - Add any custom HTML/styling

3. **Regenerate indices** (done automatically by `make create-action`)
   - `make generate-actions` - Updates action index
   - `make generate-aem-widgets` - Updates widget index (if widget enabled)

4. **Test your action**
   ```bash
   make test
   ```

5. **Build and serve locally**
   ```bash
   make build-ts
   make serve
   ```

### Examples

```bash
# Create a search action without a widget
make create-action NAME=searchContent

# Create a dashboard widget action
make create-action NAME=dashboardWidget WIDGET=true

# Create a status check action with a visual widget
make create-action NAME=statusCheck WIDGET=true
```

### File Naming Conventions

The script automatically handles naming conventions:

- **Action names**: Uses camelCase in code (e.g., `myAction`)
- **Widget URIs**: Converts to kebab-case (e.g., `my-action-widget.html`)
- **Directory names**: Uses the exact name provided

### Tips

- Use descriptive action names that indicate what the action does
- Add the `WIDGET=true` flag if your action needs to display visual content
- Remember to implement proper input validation in the generated Zod schema
- Update the description to help users understand what your action does

## generate-actions-index.js

Scans the `server/src/actions` directory and generates the action index file (`index.ts`) that exports all published actions.

### Usage

```bash
make generate-actions
# or
npm run generate-actions
```

This is automatically run by `make create-action`.

## generate-aem-widgets-index.js

Scans the `server/src/actions` directory for widget-enabled actions and generates the widget index file (`index-widgets.ts`).

### Usage

```bash
make generate-aem-widgets
# or
npm run generate-aem-widgets
```

This is automatically run by `make create-action` when `WIDGET=true` is specified.

