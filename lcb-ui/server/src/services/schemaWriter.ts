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

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import type { MCPTool } from '../../../shared/types';
import { z } from 'zod';

/**
 * Resolve the lcb-server project root directory.
 * Prefers LCB_SERVER_PATH env; falls back to ../../lcb-server relative to server cwd.
 */
function resolveServerRoot(): string {
  const candidate = process.env.LCB_SERVER_PATH || join(process.cwd(), '..', '..', 'lcb-server');
  return resolve(candidate);
}

/**
 * Securely resolve the schema.json path for an action.
 * Ensures the final resolved path stays under the expected actions directory.
 */
function resolveActionSchemaPath(actionName: string): { baseDir: string; schemaPath: string } {
  const serverRoot = resolveServerRoot();
  const baseDir = resolve(serverRoot, 'server', 'src', 'actions');
  const targetDir = resolve(baseDir, actionName);
  const schemaPath = resolve(targetDir, 'schema.json');

  // Prevent path traversal - ensure both are within actions dir
  if (!targetDir.startsWith(baseDir) || !schemaPath.startsWith(baseDir)) {
    throw new Error('Invalid action name or path traversal detected');
  }
  return { baseDir, schemaPath };
}

/**
 * Merge allowed fields from a draft into the existing schema.json structure.
 * Only updates: definition.title, definition.description, definition.inputSchema,
 * definition.annotations, version.
 */
const SchemaDefinitionZ = z.object({
  title: z.string().min(1),
  description: z.string().min(0),
  inputSchema: z.record(z.any()).optional(),
  annotations: z.record(z.any()).optional(),
  _meta: z.record(z.any()).optional()
});

const ActionSchemaZ = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  isPublished: z.boolean(),
  hasAemWidget: z.boolean(),
  definition: SchemaDefinitionZ
});

function bumpPatch(version: string): string {
  const parts = version.split('.');
  if (parts.length !== 3) return version;
  const [major, minor, patch] = parts;
  const next = Number.parseInt(patch || '0', 10) + 1;
  return `${major}.${minor}.${isNaN(next) ? patch : String(next)}`;
}

function buildOverwrittenSchema(original: any, folderName: string, payload: { title: string; description: string; inputSchema?: any }): any {
  const preservedAnnotations = original?.definition?.annotations;
  const preservedMeta = original?.definition?._meta;
  const hasAemWidget = Boolean(original?.hasAemWidget);
  const isPublished = original?.isPublished !== undefined ? Boolean(original.isPublished) : true;
  const version = bumpPatch(original?.version || '0.0.1');

  const finalSchema = {
    name: folderName,
    version,
    isPublished,
    hasAemWidget,
    definition: {
      title: payload.title,
      description: payload.description,
      ...(payload.inputSchema ? { inputSchema: payload.inputSchema } : {}),
      ...(preservedAnnotations ? { annotations: preservedAnnotations } : {}),
      ...(preservedMeta ? { _meta: preservedMeta } : {})
    }
  };

  const parsed = ActionSchemaZ.safeParse(finalSchema);
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Invalid schema: ${msg}`);
  }
  if (finalSchema.name !== folderName) {
    throw new Error('Schema name must equal folder name');
  }
  return finalSchema;
}

/**
 * Write a single action draft to its schema.json file.
 */
export async function writeActionSchemaFromDraft(draft: MCPTool): Promise<void> {
  if (!draft.name) {
    throw new Error('Draft must include action name');
  }
  const { schemaPath } = resolveActionSchemaPath(draft.name);

  // Read existing schema if present
  let existing: any = {
    name: draft.name,
    version: draft.version || '0.0.1',
    isPublished: true,
    hasAemWidget: false,
    definition: {}
  };
  try {
    const content = await fs.readFile(schemaPath, 'utf-8');
    existing = JSON.parse(content);
  } catch {
    // If not found, continue with default scaffold
  }

  const payload = {
    title: draft.title || existing?.definition?.title || '',
    description: draft.description || existing?.definition?.description || '',
    inputSchema: draft.inputSchema !== undefined ? draft.inputSchema : existing?.definition?.inputSchema
  };
  const overwritten = buildOverwrittenSchema(existing, draft.name, payload);
  const data = JSON.stringify(overwritten, null, 2) + '\n';
  // Ensure directory exists
  const dir = schemaPath.substring(0, schemaPath.lastIndexOf('/'));
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = `${schemaPath}.tmp`;
  await fs.writeFile(tmpPath, data, 'utf-8');
  await fs.rename(tmpPath, schemaPath);
}

/**
 * Overwrite schema.json directly from UI payload (title, description, inputSchema)
 */
export async function overwriteActionSchemaFromUi(actionName: string, payload: { title: string; description: string; inputSchema?: any }): Promise<{ version: string; path: string }> {
  const { schemaPath } = resolveActionSchemaPath(actionName);
  // Load original
  let original: any = {};
  try {
    const content = await fs.readFile(schemaPath, 'utf-8');
    original = JSON.parse(content);
  } catch {
    // allow new, fill defaults in builder
  }
  const newSchema = buildOverwrittenSchema(original, actionName, payload);
  const tmpPath = `${schemaPath}.tmp`;
  await fs.mkdir(schemaPath.substring(0, schemaPath.lastIndexOf('/')), { recursive: true });
  await fs.writeFile(tmpPath, JSON.stringify(newSchema, null, 2) + '\n', 'utf-8');
  await fs.rename(tmpPath, schemaPath);
  return { version: newSchema.version, path: schemaPath };
}

/**
 * Toggle publish flag (soft delete/restore)
 */
export async function setActionPublished(actionName: string, isPublished: boolean): Promise<void> {
  const { schemaPath } = resolveActionSchemaPath(actionName);
  let original: any = {};
  try {
    const content = await fs.readFile(schemaPath, 'utf-8');
    original = JSON.parse(content);
  } catch {
    throw new Error('schema.json not found for action');
  }
  const updated = {
    ...original,
    isPublished: Boolean(isPublished)
  };
  const parsed = ActionSchemaZ.safeParse(updated);
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Invalid schema: ${msg}`);
  }
  const tmpPath = `${schemaPath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
  await fs.rename(tmpPath, schemaPath);
}

/**
 * Resolve the widget/widget-schema.json path for an action.
 * Ensures the final resolved path stays under the expected actions directory.
 */
function resolveWidgetSchemaPath(actionName: string): { baseDir: string; widgetSchemaPath: string } {
  const serverRoot = resolveServerRoot();
  const baseDir = resolve(serverRoot, 'server', 'src', 'actions');
  const targetDir = resolve(baseDir, actionName, 'widget');
  const widgetSchemaPath = resolve(targetDir, 'widget-schema.json');

  // Prevent path traversal - ensure both are within actions dir
  if (!targetDir.startsWith(baseDir) || !widgetSchemaPath.startsWith(baseDir)) {
    throw new Error('Invalid action name or path traversal detected');
  }
  return { baseDir, widgetSchemaPath };
}

/**
 * Widget metadata schema for validation
 */
const WidgetMetaZ = z.object({
  uri: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(0),
  mimeType: z.literal('text/html+skybridge'),
  htmlFile: z.literal('template.html'),
  _meta: z.record(z.any()).optional()
});

/**
 * Write widget metadata to widget/widget-schema.json from a resource draft
 */
export async function writeResourceWidgetMetadata(
  actionName: string,
  payload: { 
    name: string; 
    uri: string; 
    description: string;
    _meta?: Record<string, any>;
  }
): Promise<{ path: string }> {
  const { widgetSchemaPath } = resolveWidgetSchemaPath(actionName);

  // Read existing widget-schema.json if present
  let existing: any = {
    uri: payload.uri,
    name: payload.name,
    description: payload.description,
    mimeType: 'text/html+skybridge',
    htmlFile: 'template.html',
    _meta: {}
  };

  try {
    const content = await fs.readFile(widgetSchemaPath, 'utf-8');
    console.log(`[Schema Writer] Read existing widget-schema.json (${content.length} bytes):`, content.substring(0, 100));
    
    if (!content || content.trim().length === 0) {
      console.log('[Schema Writer] File is empty, using default scaffold');
    } else {
      existing = JSON.parse(content);
      console.log('[Schema Writer] Parsed existing widget metadata:', existing);
    }
  } catch (err) {
    console.log('[Schema Writer] Failed to read/parse existing widget-schema.json:', err instanceof Error ? err.message : err);
    // If not found or invalid, continue with default scaffold
  }

  // Build updated widget metadata
  const updatedMeta = {
    uri: payload.uri,
    name: payload.name,
    description: payload.description,
    mimeType: 'text/html+skybridge' as const,
    htmlFile: 'template.html' as const,
    _meta: {
      ...(existing._meta || {}),
      ...(payload._meta || {})
    }
  };

  // Validate
  const parsed = WidgetMetaZ.safeParse(updatedMeta);
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Invalid widget metadata: ${msg}`);
  }

  // Ensure directory exists
  const dir = widgetSchemaPath.substring(0, widgetSchemaPath.lastIndexOf('/'));
  await fs.mkdir(dir, { recursive: true });

  // Write atomically
  const tmpPath = `${widgetSchemaPath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(updatedMeta, null, 2) + '\n', 'utf-8');
  await fs.rename(tmpPath, widgetSchemaPath);

  return { path: widgetSchemaPath };
}


