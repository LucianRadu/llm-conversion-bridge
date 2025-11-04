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

const actionsDirectory = path.join(process.cwd(), 'server', 'src', 'actions');
const indexFile = path.join(actionsDirectory, 'index-widgets.ts');

// Read app name from package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const appName = packageJson.name || 'mcp-server';

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

// Scan actions directory recursively for widget metadata files
function findWidgetFiles(dir, baseDir = dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && item !== 'node_modules') {
      // Look for widget subfolder
      const widgetDir = path.join(fullPath, 'widget');
      if (fs.existsSync(widgetDir) && fs.statSync(widgetDir).isDirectory()) {
        const widgetIndexPath = path.join(widgetDir, 'index.ts');
        if (fs.existsSync(widgetIndexPath)) {
          const relativePath = path.relative(baseDir, widgetIndexPath);
          
          // Check if there's a template.html file in the widget directory
          const htmlFile = path.join(widgetDir, 'template.html');
          const hasHtml = fs.existsSync(htmlFile);
          
          files.push({ 
            fileName: 'index.ts', 
            relativePath: relativePath.replace(/\\/g, '/'),
            htmlPath: hasHtml ? htmlFile : null,
            dirPath: widgetDir,
            actionName: item // Store the action folder name
          });
        }
      }
    }
  }
  
  return files;
}

const resourceFiles = findWidgetFiles(actionsDirectory);

// Scan actions directory to find widget-enabled actions with their versions
const actionFolders = fs.readdirSync(actionsDirectory)
  .filter(item => {
    const itemPath = path.join(actionsDirectory, item);
    return fs.statSync(itemPath).isDirectory();
  });

const widgetEnabledActions = [];
const actionVersions = new Map(); // Map action name to version
for (const folder of actionFolders) {
  const indexPath = path.join(actionsDirectory, folder, 'index.ts');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');
    
    // Extract action name
    const nameMatch = content.match(/name\s*:\s*['"]([\w.-]+)['"]/);
    const actionName = nameMatch ? nameMatch[1] : folder;
    
    // Extract version
    const versionMatch = content.match(/version\s*:\s*['"]([^'"]+)['"]/);
    const version = versionMatch ? versionMatch[1] : '0.0.1';
    actionVersions.set(actionName, version);
    actionVersions.set(folder, version); // Also store by folder name
    
    // Store the base filename for matching (without namespace)
    const baseActionName = actionName.includes('.') ? actionName.split('.').pop() : actionName;
    actionVersions.set(baseActionName, version);
    
    if (/hasAemWidget\s*:\s*true[\s,\n]/m.test(content)) {
      widgetEnabledActions.push(actionName);
    }
  }
}

// Generate import statements for widget metadata files
const metadataImports = resourceFiles.map(file => {
  const metaVarName = file.actionName + 'Meta';
  const importPath = './' + file.actionName + '/widget';
  return `import { widgetMeta as ${metaVarName} } from '${importPath}';`;
}).join('\n');

// Generate widget resource definitions with embedded HTML
const widgetDefinitions = resourceFiles.map(file => {
  const constName = file.actionName + 'Resource';
  const metaVarName = file.actionName + 'Meta';
  
  if (file.htmlPath) {
    let htmlContent = fs.readFileSync(file.htmlPath, 'utf-8');
    
    // Replace {{TOOL_VERSION}} with actual version from matching action if present
    if (htmlContent.includes('{{TOOL_VERSION}}')) {
      // Find matching action version using the action folder name
      const version = actionVersions.get(file.actionName) || '0.0.1';
      htmlContent = htmlContent.replace(/\{\{TOOL_VERSION\}\}/g, version);
    }
    
    // Escape backticks and backslashes in HTML content
    const escapedHtml = htmlContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    
    return `const ${constName}: MCPResource = {
  ...${metaVarName},
  content: \`${escapedHtml}\`
};`;
  }
  return null;
}).filter(def => def !== null).join('\n\n');

// Generate resource mapping for widget-enabled actions
const resourceMappings = resourceFiles.map(file => {
  const constName = file.actionName + 'Resource';

  // Check if this resource corresponds to a widget-enabled action
  // Normalize both names by removing dots and converting to lowercase for comparison
  const normalizeActionName = (name) => name.replace(/\./g, '').toLowerCase();

  const matchingAction = widgetEnabledActions.find(action => {
    const normalizedAction = normalizeActionName(action);
    const normalizedFile = normalizeActionName(file.actionName);
    return normalizedAction === normalizedFile;
  });

  if (matchingAction && file.htmlPath) {
    return `    if (action.name === '${matchingAction}') {
      return ${constName};
    }`;
  }
  return null;
}).filter(mapping => mapping !== null).join('\n');

const indexContent = `${adobeCopyrightHeader}

// This file is auto-generated by scripts/generate-aem-widgets-index.js.
// Do not edit this file directly.

${metadataImports}
import actions from './index';

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  content: string;
  htmlFile?: string;
  _meta?: Record<string, any>;
}

// Widget resources with embedded HTML content
${widgetDefinitions}

// Dynamically collect resources for actions that have widgets
const staticResources: MCPResource[] = [
  // Add any static resources here if needed
];

// Add resources for actions with hasAemWidget: true
const widgetActions = actions.filter(action => action.hasAemWidget);
const widgetResources: MCPResource[] = widgetActions
  .map(action => {
    // Map widget actions to their corresponding resources
${resourceMappings}
    // Add more widget resources here as needed
    return null;
  })
  .filter(resource => resource !== null) as MCPResource[];

// Combine all resources
const resources: MCPResource[] = [...staticResources, ...widgetResources];

// Log AEM Widget registration with nice formatting (consistent with actions logging)
if (resources.length > 0) {
  console.log(\`\\n[${appName}] Successfully generated server/src/actions/index-widgets.ts with \${resources.length} AEM Widgets:\`);
  resources.forEach(resource => {
    const resourceFile = resource.uri.split('/').pop();
    console.log(\`- \${resourceFile} -> \${resource.name} (type: \${resource.mimeType})\`);
  });
} else {
  console.log('[${appName}] No AEM Widgets registered');
}

// Log widget actions that have AEM Widgets
if (widgetActions.length > 0) {
  console.log(\`\\n[${appName}] Widget-enabled Actions with AEM Widgets:\`);
  widgetActions.forEach(action => {
    console.log(\`- \${action.name}\`);
  });
}

// Create lookup maps for efficient access
export const resourcesByUri = new Map<string, MCPResource>();

resources.forEach((resource) => {
  resourcesByUri.set(resource.uri, resource);
});

// Helper function to get resource by URI
export function getResourceByUri(uri: string) {
  const resource = resourcesByUri.get(uri);
  if (!resource) {
    return null;
  }
  
  return {
    contents: [
      {
        uri: resource.uri,
        mimeType: resource.mimeType,
        text: resource.content,
        _meta: resource._meta
      }
    ]
  };
}

export { resources };
export default resources;
`;

fs.writeFileSync(indexFile, indexContent.trim() + '\n');

console.log(`\n[${appName}] Successfully generated server/src/actions/index-widgets.ts with ${resourceFiles.length} AEM Widgets:`);
resourceFiles.forEach(file => {
  console.log(`- ${file.relativePath} -> ${file.actionName} (aem-widget)`);
});

if (widgetEnabledActions.length > 0) {
  console.log(`\n[${appName}] Found ${widgetEnabledActions.length} widget-enabled Actions:`);
  widgetEnabledActions.forEach(action => {
    console.log(`- ${action}`);
  });
}