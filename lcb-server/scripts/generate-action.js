#!/usr/bin/env node

/*
 * ADOBE CONFIDENTIAL
 * ___________________
 * Copyright 2025 Adobe
 * All Rights Reserved.
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 *  Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */

import fs from 'fs';
import path from 'path';

const adobeCopyrightHeader = `/*
 * ADOBE CONFIDENTIAL
 * ___________________
 * Copyright 2025 Adobe
 * All Rights Reserved.
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 *  Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */`;

function toCamelCase(str) {
  return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
}

function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function printUsage() {
  console.log(`
Usage: node scripts/generate-action.js <action-name> [--widget]

Options:
  <action-name>   Name of the action to generate (e.g., myNewAction)
  --widget        Generate the action with a widget (optional)

Examples:
  node scripts/generate-action.js myAction
  node scripts/generate-action.js myWidgetAction --widget
  `);
}

function generateActionFile(actionName, hasWidget) {
  const camelName = toCamelCase(actionName);
  const widgetMeta = hasWidget ? `
    _meta: {
      "openai/outputTemplate": "ui://eds-widget/${toKebabCase(actionName)}-widget.html",
      "openai/toolInvocation/invoking": "Processing ${actionName}",
      "openai/toolInvocation/invoked": "Processed ${actionName}",
      "openai/widgetAccessible": true,
      "openai/resultCanProduceWidget": true,
    },` : '';

  return `${adobeCopyrightHeader}
import { z } from "zod";
import type { Action, ActionHandlerResult } from "../../types";
import { logger } from "../../utils/logger";

const ${camelName}: Action = {
  version: '0.0.1',
  name: "${actionName}",
  isPublished: true,
  hasAemWidget: ${hasWidget},
  definition: {
    title: "${actionName.charAt(0).toUpperCase() + actionName.slice(1)}",
    description: "Description for ${actionName}",
    inputSchema: z.object({
      // Add your input parameters here
    }),
    // To disable the approval prompt for the tool
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },${widgetMeta}
  },
  handler: async (args: {}): Promise<ActionHandlerResult> => {
    const startTime = Date.now();
    logger.info(\`MCP: action=tool_invoked;tool=${actionName};status=starting\`);

    try {
      logger.info(\`MCP: action=tool_execution;tool=${actionName};status=processing\`);

      const now = new Date();
      const responseText = \`${actionName} executed successfully\`;

      const result = {
        content: [{
          type: "text" as const,
          text: responseText
        }],${hasWidget ? `
        structuredContent: {
          // Add structured data here if needed
        },` : ''}
        success: true,
        timestamp: now.getTime()
      };

      const executionTime = Date.now() - startTime;
      logger.info(\`MCP: action=tool_completed;tool=${actionName};status=success;duration_ms=\${executionTime}\`);

      return result;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(\`MCP: action=tool_completed;tool=${actionName};status=error;duration_ms=\${executionTime};error=\${error.message}\`);

      return {
        content: [{
          type: "text" as const,
          text: \`Error in ${actionName}: \${error.message}\`
        }],
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
};

export default ${camelName};
`;
}

function generateWidgetIndexFile(actionName) {
  const camelName = toCamelCase(actionName);
  const kebabName = toKebabCase(actionName);

  return `${adobeCopyrightHeader}

/**
 * ${actionName} Widget Metadata
 * The HTML content is automatically loaded from template.html during build
 */
export const widgetMeta = {
    uri: "ui://eds-widget/${kebabName}-widget.html",
    name: "${camelName}Widget",
    description: "${actionName} widget",
    mimeType: "text/html+skybridge",
    htmlFile: "template.html",
    _meta: {
      "openai/widgetPrefersBorder": true,
      "openai/widgetDescription": "Displays ${actionName} information",
    }
  };
  `;
}

function generateWidgetTemplate(actionName) {
  return `<!-- TODO: Configure your widget template URLs below -->
<!-- Script URL: Add your aem-embed.js script URL -->
<!-- Widget Embed URL: Add your widget content URL -->
<!-- Example: https://main--your-repo--your-org.aem.live/scripts/aem-embed.js -->
<script src="YOUR_SCRIPT_URL_HERE" type="module"></script>
<div>
    <aem-embed url="YOUR_WIDGET_EMBED_URL_HERE/${toKebabCase(actionName)}"></aem-embed>
</div>
`;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const actionName = args[0];
  const hasWidget = args.includes('--widget');

  if (!actionName || actionName.startsWith('--')) {
    console.error('Error: Action name is required');
    printUsage();
    process.exit(1);
  }

  const actionsDir = path.join(process.cwd(), 'server', 'src', 'actions');
  const actionDir = path.join(actionsDir, actionName);

  // Check if action already exists
  if (fs.existsSync(actionDir)) {
    console.error(`Error: Action '${actionName}' already exists at ${actionDir}`);
    process.exit(1);
  }

  // Create action directory
  fs.mkdirSync(actionDir, { recursive: true });
  console.log(`✓ Created directory: ${actionDir}`);

  // Generate action index.ts
  const actionContent = generateActionFile(actionName, hasWidget);
  const actionIndexPath = path.join(actionDir, 'index.ts');
  fs.writeFileSync(actionIndexPath, actionContent);
  console.log(`✓ Created file: ${actionIndexPath}`);

  // Generate widget files if needed
  if (hasWidget) {
    const widgetDir = path.join(actionDir, 'widget');
    fs.mkdirSync(widgetDir, { recursive: true });
    console.log(`✓ Created directory: ${widgetDir}`);

    const widgetIndexContent = generateWidgetIndexFile(actionName);
    const widgetIndexPath = path.join(widgetDir, 'index.ts');
    fs.writeFileSync(widgetIndexPath, widgetIndexContent);
    console.log(`✓ Created file: ${widgetIndexPath}`);

    const widgetTemplateContent = generateWidgetTemplate(actionName);
    const widgetTemplatePath = path.join(widgetDir, 'template.html');
    fs.writeFileSync(widgetTemplatePath, widgetTemplateContent);
    console.log(`✓ Created file: ${widgetTemplatePath}`);
  }

  console.log(`
✅ Successfully generated action '${actionName}'${hasWidget ? ' with widget' : ''}

Next steps:
  1. Edit ${path.relative(process.cwd(), actionIndexPath)} to implement your action logic
  ${hasWidget ? `2. Edit ${path.relative(process.cwd(), path.join(actionDir, 'widget', 'template.html'))} to customize the widget` : ''}
  ${hasWidget ? '3' : '2'}. Run 'make generate-actions' to register the action
  ${hasWidget ? '4' : '3'}. Run 'make test' to ensure everything works
`);
}

main();

