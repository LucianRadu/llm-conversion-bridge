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

const ACTIONS_DIR = path.join(__dirname, '..', 'server', 'src', 'actions');

/**
 * Generate template.html from widget-schema.json metadata
 */
function generateTemplateFromSchema(widgetMeta) {
  const meta = widgetMeta._meta || {};
  const widgetMetaObj = meta['openai:widget_meta'] || {};
  
  const scriptUrl = widgetMetaObj.script_url || '';
  const widgetEmbedUrl = widgetMetaObj.widget_embed_url || '';

  // Generate template HTML
  let template = '';
  
  // Add script tag if script_url is provided
  if (scriptUrl) {
    template += `<script src="${scriptUrl}" type="module"></script>\n`;
  }
  
  // Add widget embed
  template += '<div>\n';
  if (widgetEmbedUrl) {
    template += `    <aem-embed url="${widgetEmbedUrl}"></aem-embed>\n`;
  }
  template += '</div>\n';

  return template;
}

/**
 * Process all widget directories and generate template.html files
 */
function processWidgets() {
  let generatedCount = 0;
  let skippedCount = 0;

  // Read all action directories
  const actionDirs = fs.readdirSync(ACTIONS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const actionName of actionDirs) {
    const widgetDir = path.join(ACTIONS_DIR, actionName, 'widget');
    const widgetSchemaPath = path.join(widgetDir, 'widget-schema.json');
    const templatePath = path.join(widgetDir, 'template.html');

    // Check if widget directory and schema exist
    if (!fs.existsSync(widgetDir) || !fs.existsSync(widgetSchemaPath)) {
      continue;
    }

    try {
      // Read widget-schema.json
      const widgetSchemaContent = fs.readFileSync(widgetSchemaPath, 'utf-8');
      const widgetMeta = JSON.parse(widgetSchemaContent);

      // Check if _meta contains template URLs
      const meta = widgetMeta._meta || {};
      const widgetMetaObj = meta['openai:widget_meta'] || {};

      if (!widgetMetaObj.script_url || !widgetMetaObj.widget_embed_url) {
        console.log(`⏭️  Skipping ${actionName}: Missing required template URLs in widget-schema.json`);
        skippedCount++;
        continue;
      }

      // Generate template
      const templateContent = generateTemplateFromSchema(widgetMeta);

      // Write template.html
      fs.writeFileSync(templatePath, templateContent, 'utf-8');
      console.log(`✅ Generated template.html for ${actionName}`);
      generatedCount++;

    } catch (error) {
      console.error(`❌ Error processing ${actionName}:`, error.message);
    }
  }

  console.log('\n================================================================================');
  console.log('Widget Template Generation Complete');
  console.log('================================================================================');
  console.log(`✅ Generated: ${generatedCount} template(s)`);
  console.log(`⏭️  Skipped: ${skippedCount} widget(s)`);
}

// Run the script
console.log('================================================================================');
console.log('Generating Widget Templates from widget-schema.json');
console.log('================================================================================\n');

processWidgets();

