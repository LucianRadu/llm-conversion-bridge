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
 * Get all non-deployed actions for a server (excluding deleted ones)
 */
function getNonDeployedActions(db, serverId) {
  if (!db.actions || !db.actions[serverId]) {
    return [];
  }

  const actions = db.actions[serverId];
  const allActions = [...(actions.discovered || []), ...(actions.custom || [])];
  
  // Filter: deployed === false AND deleted !== true
  // (Skip actions that are both new and deleted - they should be cleaned up directly)
  return allActions.filter(action => action.deployed === false && action.deleted !== true);
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
 * Generate schema.json content
 */
function generateSchemaJson(action) {
  const schema = {
    name: action.name,
    version: '0.0.1',
    isPublished: true,
    hasAemWidget: action.hasEdsWidget || false,
    definition: {
      title: capitalize(action.name),
      description: action.description || `Generated action: ${action.name}`,
      inputSchema: transformInputSchema(action.inputSchema),
      annotations: action.annotations || {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: false
      }
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
 * Generate action folder structure
 */
function generateActionFolder(action) {
  const actionsDir = path.resolve(__dirname, '../server/src/actions');
  const actionDir = path.join(actionsDir, action.name);

  // Check if action already exists (idempotency)
  if (fs.existsSync(actionDir)) {
    console.log(`⏭️  Skipping ${action.name} (folder already exists)`);
    return true; // Return success, don't regenerate
  }

  try {
    console.log(`\n📁 Creating action: ${action.name}`);
    
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

    console.log(`   ✅ Action "${action.name}" generated successfully`);
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
  console.log('🔍 Checking database for new actions...\n');

  // Read database
  const db = readDatabase();

  // Find local managed server
  const serverId = findLocalManagedServer(db);
  if (!serverId) {
    console.log('⚠️  No local managed server found');
    console.log('✅ Nothing to generate\n');
    process.exit(0);
  }

  // Get non-deployed actions
  const nonDeployedActions = getNonDeployedActions(db, serverId);

  if (nonDeployedActions.length === 0) {
    console.log('✅ No new actions found in database');
    console.log('✅ Nothing to generate\n');
    process.exit(0);
  }

  console.log(`📦 Found ${nonDeployedActions.length} new action(s) to generate:\n`);

  // Filter to only widgetless actions for now (skip actions with hasEdsWidget: true)
  const widgetlessActions = nonDeployedActions.filter(action => !action.hasEdsWidget);
  const widgetActions = nonDeployedActions.filter(action => action.hasEdsWidget);

  if (widgetActions.length > 0) {
    console.log('⏭️  Skipping actions with widgets (handled by generate-eds-widgets-from-db.js):');
    widgetActions.forEach(action => console.log(`   - ${action.name}`));
    console.log('');
  }

  if (widgetlessActions.length === 0) {
    console.log('⚠️  No widgetless actions to generate (all have widgets)');
    process.exit(0);
  }

  // Generate action folders
  const successfulActions = [];
  const failedActions = [];

  widgetlessActions.forEach(action => {
    const success = generateActionFolder(action);
    if (success) {
      successfulActions.push(action.name);
    } else {
      failedActions.push(action.name);
    }
  });

  // NOTE: Do NOT mark actions as deployed here!
  // The UI deployment flow will mark them as deployed via API call
  // to /api/actions/:serverId/mark-deployed AFTER successful build verification.
  // Marking them here would create inconsistent state if build fails later.

  // Print summary
  console.log('\n📊 Summary:');
  console.log(`   ✅ Generated: ${successfulActions.length}`);
  if (failedActions.length > 0) {
    console.log(`   ❌ Failed: ${failedActions.length}`);
    console.log('\nFailed actions:');
    failedActions.forEach(name => console.log(`   - ${name}`));
    process.exit(1);
  }

  console.log('\n✨ All actions generated successfully!');
}

main();

