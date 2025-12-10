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
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

/**
 * Capitalize the first letter of a string
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Read and parse db.json from lcb-ui
 */
function readDatabase() {
  const dbPath = path.resolve(__dirname, '../../lcb-ui/db.json');
  
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database file not found at: ${dbPath}`);
    process.exit(1);
  }

  try {
    const dbContent = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(dbContent);
  } catch (error) {
    console.error(`❌ Error reading database: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Write updated database back to db.json
 */
function writeDatabase(db) {
  const dbPath = path.resolve(__dirname, '../../lcb-ui/db.json');
  
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error(`❌ Error writing database: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Find the local managed server ID
 */
function findLocalManagedServer(db) {
  if (!db.servers || !Array.isArray(db.servers)) {
    console.error('❌ No servers found in database');
    return null;
  }

  const localServer = db.servers.find(s => s.serverType === 'local-managed');
  
  if (!localServer) {
    console.error('❌ No local-managed server found in database');
    return null;
  }

  return localServer.id;
}

/**
 * Get all non-deployed widget actions (hasEdsWidget: true, deployed: false, not deleted)
 */
function getNonDeployedWidgetActions(db, serverId) {
  if (!db.actions || !db.actions[serverId]) {
    return [];
  }

  const actions = db.actions[serverId];
  const allActions = [...(actions.discovered || []), ...(actions.custom || [])];
  
  // Filter: hasEdsWidget === true AND deployed === false AND deleted !== true
  return allActions.filter(action => 
    action.hasEdsWidget === true && 
    action.deployed === false && 
    action.deleted !== true
  );
}

/**
 * Find widget resource for an action
 */
function findResourceForAction(db, serverId, actionName) {
  if (!db.widgetResources || !db.widgetResources[serverId]) {
    return null;
  }

  const resources = db.widgetResources[serverId];
  return resources.find(resource => resource.actionName === actionName);
}

/**
 * Transform inputSchema from UI format to schema.json format
 */
function transformInputSchema(inputSchema) {
  if (!inputSchema || !inputSchema.properties) {
    return {
      type: 'object',
      properties: {},
      required: []
    };
  }

  const properties = {};
  const required = [];

  Object.entries(inputSchema.properties).forEach(([key, prop]) => {
    const propSchema = { type: prop.type };

    if (prop.description) {
      propSchema.description = prop.description;
    }

    // Add string validators if present
    if (prop.type === 'string') {
      if (prop.minLength !== undefined && prop.minLength > 0) {
        propSchema.minLength = prop.minLength;
      }
      if (prop.maxLength !== undefined && prop.maxLength > 0) {
        propSchema.maxLength = prop.maxLength;
      }
    }

    properties[key] = propSchema;

    // Check if field is required
    if (inputSchema.required && inputSchema.required.includes(key)) {
      required.push(key);
    }
  });

  return {
    type: 'object',
    properties,
    required
  };
}

/**
 * Generate schema.json content for widget action
 */
function generateSchemaJson(action) {
  const schema = {
    name: action.name,
    version: '0.0.1',
    isPublished: true,
    hasAemWidget: true, // Always true for widget actions
    definition: {
      title: capitalize(action.name),
      description: action.description || `Generated action: ${action.name}`,
      inputSchema: transformInputSchema(action.inputSchema),
      annotations: action.annotations || {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: false
      },
      // Include OpenAI metadata if present
      _meta: action._meta || undefined
    }
  };

  return JSON.stringify(schema, null, 2);
}

/**
 * Generate index.ts handler content
 */
function generateIndexTs(action) {
  return `${adobeCopyrightHeader}

import type { ActionHandlerResult } from '../../types';
import { logger } from '../../utils/logger';

async function handler(args: {}): Promise<ActionHandlerResult> {
  const startTime = Date.now();
  logger.info(\`MCP: action=tool_invoked;tool=${action.name};status=starting\`);

  try {
    logger.info(\`MCP: action=tool_execution;tool=${action.name};status=processing\`);

    const now = new Date();
    const utcTimestamp = now.toISOString();
    const responseText = \`Hello from ${action.name}! Generated at \${utcTimestamp}\`;

    const result = {
      content: [{
        type: 'text' as const,
        text: responseText
      }],
      success: true,
      timestamp: now.getTime()
    };

    const executionTime = Date.now() - startTime;
    logger.info(\`MCP: action=tool_completed;tool=${action.name};status=success;duration_ms=\${executionTime}\`);

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    logger.error(\`MCP: action=tool_completed;tool=${action.name};status=error;duration_ms=\${executionTime};error=\${error.message}\`);

    return {
      content: [{
        type: 'text' as const,
        text: \`Error in ${action.name}: \${error.message}\`
      }],
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

export { handler };
`;
}

/**
 * Generate widget-schema.json content
 */
function generateWidgetSchemaJson(resource) {
  const schema = {
    uri: resource.uri,
    name: resource.name || '',
    description: resource.description || '',
    mimeType: resource.mimeType || 'text/html+skybridge',
    _meta: resource._meta || {}
  };

  return JSON.stringify(schema, null, 2);
}

/**
 * Generate widget/index.ts content
 */
function generateWidgetIndexTs(resource) {
  return `${adobeCopyrightHeader}

import widgetSchema from './widget-schema.json';

/**
 * ${resource.name} Widget Metadata
 * The HTML content is automatically loaded from template.html during build
 * Widget metadata is loaded from widget-schema.json
 */
export const widgetMeta = widgetSchema;
`;
}

/**
 * Generate widget/template.html content from template file
 */
function generateWidgetTemplateHtml(resource) {
  const templatePath = path.resolve(__dirname, 'templates/widget-template.html');
  
  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Template file not found at: ${templatePath}`);
    return null;
  }

  try {
    let template = fs.readFileSync(templatePath, 'utf8');
    
    // Replace placeholders with actual URLs from resource._meta
    const scriptUrl = resource._meta?.scriptUrl || '';
    const widgetEmbedUrl = resource._meta?.widgetEmbedUrl || '';
    
    template = template.replace('{{SCRIPT_URL}}', scriptUrl);
    template = template.replace('{{WIDGET_EMBED_URL}}', widgetEmbedUrl);
    
    return template;
  } catch (error) {
    console.error(`❌ Error reading template file: ${error.message}`);
    return null;
  }
}

/**
 * Generate action folder structure (action files + widget files)
 */
function generateActionFolder(action, resource) {
  const actionsDir = path.resolve(__dirname, '../server/src/actions');
  const actionDir = path.join(actionsDir, action.name);

  // Check if action already exists (idempotency)
  if (fs.existsSync(actionDir)) {
    console.log(`⏭️  Skipping ${action.name} (folder already exists)`);
    return true; // Return success, don't regenerate
  }

  try {
    console.log(`\n📁 Creating widget action: ${action.name}`);
    
    // Create action directory
    fs.mkdirSync(actionDir, { recursive: true });
    console.log(`   ✓ Created folder: server/src/actions/${action.name}/`);

    // Generate schema.json
    const schemaJson = generateSchemaJson(action);
    fs.writeFileSync(path.join(actionDir, 'schema.json'), schemaJson, 'utf8');
    console.log(`   ✓ Generated file: server/src/actions/${action.name}/schema.json`);

    // Generate index.ts
    const indexTs = generateIndexTs(action);
    fs.writeFileSync(path.join(actionDir, 'index.ts'), indexTs, 'utf8');
    console.log(`   ✓ Generated file: server/src/actions/${action.name}/index.ts`);

    // Generate widget folder if resource exists
    if (resource) {
      const widgetDir = path.join(actionDir, 'widget');
      fs.mkdirSync(widgetDir, { recursive: true });
      console.log(`   ✓ Created folder: server/src/actions/${action.name}/widget/`);

      // Generate widget-schema.json
      const widgetSchemaJson = generateWidgetSchemaJson(resource);
      fs.writeFileSync(path.join(widgetDir, 'widget-schema.json'), widgetSchemaJson, 'utf8');
      console.log(`   ✓ Generated file: server/src/actions/${action.name}/widget/widget-schema.json`);

      // Generate widget/index.ts
      const widgetIndexTs = generateWidgetIndexTs(resource);
      fs.writeFileSync(path.join(widgetDir, 'index.ts'), widgetIndexTs, 'utf8');
      console.log(`   ✓ Generated file: server/src/actions/${action.name}/widget/index.ts`);

      // Generate widget/template.html
      const widgetTemplateHtml = generateWidgetTemplateHtml(resource);
      if (widgetTemplateHtml) {
        fs.writeFileSync(path.join(widgetDir, 'template.html'), widgetTemplateHtml, 'utf8');
        console.log(`   ✓ Generated file: server/src/actions/${action.name}/widget/template.html`);
      } else {
        console.error(`   ❌ Failed to generate template.html for ${action.name}`);
        return false;
      }
    } else {
      console.warn(`   ⚠️  No resource found for ${action.name}, widget files not generated`);
    }

    console.log(`   ✅ Widget action "${action.name}" generated successfully`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error generating ${action.name}: ${error.message}`);
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Checking database for new widget actions...\n');

  // Read database
  const db = readDatabase();

  // Find local managed server
  const serverId = findLocalManagedServer(db);
  if (!serverId) {
    console.log('⚠️  No local managed server found');
    console.log('✅ Nothing to generate\n');
    process.exit(0);
  }

  // Get non-deployed widget actions
  const widgetActions = getNonDeployedWidgetActions(db, serverId);

  if (widgetActions.length === 0) {
    console.log('✅ No new widget actions found in database');
    console.log('✅ Nothing to generate\n');
    process.exit(0);
  }

  console.log(`📦 Found ${widgetActions.length} new widget action(s) to generate:\n`);

  // Generate widget action folders
  const successfulActions = [];
  const successfulResources = [];
  const failedActions = [];

  widgetActions.forEach(action => {
    // Find associated resource
    const resource = findResourceForAction(db, serverId, action.name);
    
    if (!resource) {
      console.warn(`⚠️  No resource found for action: ${action.name}`);
      console.warn(`   Skipping widget generation for ${action.name}`);
      return;
    }

    const success = generateActionFolder(action, resource);
    if (success) {
      successfulActions.push(action.name);
      successfulResources.push(resource.uri);
    } else {
      failedActions.push(action.name);
    }
  });

  // NOTE: Do NOT mark actions/resources as deployed here!
  // The UI deployment flow will mark them as deployed via API calls
  // to /api/actions/:serverId/mark-deployed and /api/widget-resources/:serverId/mark-deployed
  // AFTER successful build verification. Marking them here would create inconsistent state
  // if build fails later.

  // Print summary
  console.log('\n📊 Summary:');
  console.log(`   ✅ Generated: ${successfulActions.length}`);
  if (failedActions.length > 0) {
    console.log(`   ❌ Failed: ${failedActions.length}`);
    console.log('\nFailed actions:');
    failedActions.forEach(name => console.log(`   - ${name}`));
    process.exit(1);
  }

  console.log('\n✨ All widget actions generated successfully!');
}

main();

