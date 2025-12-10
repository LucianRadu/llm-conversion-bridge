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
 * Get all actions marked for deletion
 */
function getDeletedActions(db, serverId) {
  const actions = db.actions?.[serverId];
  
  if (!actions) {
    return [];
  }

  const discovered = actions.discovered || [];
  const custom = actions.custom || [];
  
  // Find all actions with deleted: true
  const deletedDiscovered = discovered.filter(a => a.deleted === true);
  const deletedCustom = custom.filter(a => a.deleted === true);
  
  return [...deletedDiscovered, ...deletedCustom];
}

/**
 * List all files in a directory recursively
 */
function listFilesRecursively(dir, prefix = '') {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(prefix, entry.name);
      if (entry.isDirectory()) {
        files.push(`${relativePath}/`);
        files.push(...listFilesRecursively(fullPath, relativePath));
      } else {
        files.push(relativePath);
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return files;
}

/**
 * Delete action folder recursively
 */
function deleteActionFolder(actionName) {
  const actionsDir = path.resolve(__dirname, '../server/src/actions');
  const actionDir = path.join(actionsDir, actionName);
  
  if (!fs.existsSync(actionDir)) {
    return { success: false, files: [] };
  }

  try {
    // List all files before deletion
    const files = listFilesRecursively(actionDir, actionName);
    
    // Delete the folder
    fs.rmSync(actionDir, { recursive: true, force: true });
    
    return { success: true, files };
  } catch (error) {
    console.error(`   ❌ Error deleting folder ${actionDir}: ${error.message}`);
    return { success: false, files: [] };
  }
}

/**
 * Remove action from database
 */
function removeActionFromDb(db, serverId, actionName) {
  const actions = db.actions?.[serverId];
  
  if (!actions) {
    return false;
  }

  let found = false;

  // Remove from discovered array
  if (actions.discovered) {
    const index = actions.discovered.findIndex(a => a.name === actionName);
    if (index !== -1) {
      actions.discovered.splice(index, 1);
      found = true;
    }
  }

  // Remove from custom array
  if (actions.custom) {
    const index = actions.custom.findIndex(a => a.name === actionName);
    if (index !== -1) {
      actions.custom.splice(index, 1);
      found = true;
    }
  }

  return found;
}

/**
 * Remove resource from database
 */
function removeResourceFromDb(db, serverId, resourceUri) {
  if (!db.widgetResources || typeof db.widgetResources !== 'object') {
    return false;
  }

  // Get resources array for this server
  const resources = db.widgetResources[serverId];
  if (!Array.isArray(resources)) {
    return false;
  }

  // Find resource by URI
  const index = resources.findIndex(r => r.uri === resourceUri);

  if (index !== -1) {
    resources.splice(index, 1);
    return true;
  }

  return false;
}

/**
 * Main deletion process
 */
async function main() {
  // Read database
  const db = readDatabase();
  console.log('✅ Database loaded successfully');

  // Find local managed server
  const serverId = findLocalManagedServer(db);
  if (!serverId) {
    console.log('⚠️  No local-managed server found. Nothing to delete.');
    return;
  }

  console.log(`✅ Found local-managed server: ${serverId}`);

  // Get deleted actions
  const deletedActions = getDeletedActions(db, serverId);
  
  if (deletedActions.length === 0) {
    console.log('');
    console.log('✅ No actions marked for deletion');
    console.log('');
    return;
  }

  console.log(`\n📋 Found ${deletedActions.length} action(s) marked for deletion:\n`);

  let deletedCount = 0;
  let widgetCount = 0;

  // Process each deleted action
  for (const action of deletedActions) {
    const actionName = action.name;
    console.log(`🗑️  Deleting action: ${actionName}`);

    // Check if action was never deployed (created but not yet generated on disk)
    if (action.deployed === false) {
      console.log(`   ℹ️  Action was never deployed (created in UI but not yet generated on disk)`);
      console.log(`   ⏭️  Skipping folder deletion (folder doesn't exist)`);
    } else {
      // Delete action folder (this also deletes widget if present)
      const deleteResult = deleteActionFolder(actionName);
      if (deleteResult.success) {
        console.log(`   ✓ Deleted folder: server/src/actions/${actionName}/`);
        if (deleteResult.files.length > 0) {
          console.log(`   📄 Deleted ${deleteResult.files.length} file(s) and folder(s):`);
          deleteResult.files.forEach(file => {
            console.log(`      - ${file}`);
          });
        }
        deletedCount++;
      } else {
        console.log(`   ⚠️  Folder not found: server/src/actions/${actionName}/`);
      }
    }

    // Remove action from database
    const actionRemoved = removeActionFromDb(db, serverId, actionName);
    if (actionRemoved) {
      console.log(`   ✓ Removed action from database`);
    }

    // If action has a widget, remove the associated resource too
    const hasWidget = action.hasEdsWidget || 
                     action._meta?.['openai/widgetAccessible'] || 
                     action._meta?.['openai/outputTemplate'];
    
    if (hasWidget) {
      // Find the associated resource by extracting action name from URI
      const resources = db.widgetResources[serverId];
      if (Array.isArray(resources)) {
        // Try multiple methods to find the resource:
        // 1. By actionName field (if exists)
        // 2. By extracting action name from URI pattern (ui://eds-widget/{actionName}.html)
        // 3. By outputTemplate in action's _meta
        let associatedResource = resources.find(r => r.actionName === actionName);
        
        if (!associatedResource) {
          // Try extracting from URI pattern
          associatedResource = resources.find(r => {
            if (r.uri) {
              // Extract action name from URI like "ui://eds-widget/action_4spenj.html"
              const match = r.uri.match(/ui:\/\/(?:eds|aem)-widget\/([^.\/]+)(?:\.html)?$/);
              return match && match[1] === actionName;
            }
            return false;
          });
        }
        
        if (!associatedResource && action._meta?.['openai/outputTemplate']) {
          // Try finding by outputTemplate URI
          associatedResource = resources.find(r => r.uri === action._meta['openai/outputTemplate']);
        }
        
        if (associatedResource) {
          const resourceRemoved = removeResourceFromDb(db, serverId, associatedResource.uri);
          if (resourceRemoved) {
            console.log(`   ✓ Deleted EDS Widget resource: ${associatedResource.uri}`);
            widgetCount++;
          }
        } else {
          console.log(`   ⚠️  No matching resource found for action: ${actionName}`);
        }
      }
    }

    console.log('');
  }

  // Write updated database
  writeDatabase(db);
  console.log('✅ Database updated successfully');

  // Print summary
  console.log('');
  console.log('================================================================================');
  console.log(' Deletion Summary');
  console.log('================================================================================');
  console.log(`✅ Deleted ${deletedCount} action(s) from filesystem`);
  console.log(`✅ Deleted ${widgetCount} EDS Widget(s) from database`);
  console.log('');
}

// Run main process
main().catch(error => {
  console.error('');
  console.error('❌ Error during deletion process:');
  console.error(error.message);
  console.error('');
  process.exit(1);
});

