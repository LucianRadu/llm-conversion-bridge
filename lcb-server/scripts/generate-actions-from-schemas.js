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

const repoRoot = process.cwd();
const actionsDir = path.join(repoRoot, 'server', 'src', 'actions');
const outIndex = path.join(actionsDir, 'index.ts');

const header = `/*
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
`;

/**
 * Builds a Zod validator string for a string type with constraints.
 * @param {object} schema - JSON Schema for string
 * @returns {string} - Zod validator code
 */
function buildStringValidator(schema) {
  const validators = ['z.string()', 'trim()'];

  if (schema.minLength) {
    validators.push(`min(${schema.minLength}, "Must be at least ${schema.minLength} characters")`);
  }
  if (schema.maxLength) {
    validators.push(`max(${schema.maxLength}, "Must be at most ${schema.maxLength} characters")`);
  }
  if (schema.pattern) {
    validators.push(`regex(/${schema.pattern}/, "Invalid format")`);
  }

  return validators.join('.');
}

/**
 * Builds a Zod validator string for an enum type.
 * @param {array} enumValues - Array of allowed values
 * @returns {string} - Zod enum validator code
 */
function buildEnumValidator(enumValues) {
  const values = enumValues.map(v => JSON.stringify(v)).join(', ');
  return `z.enum([${values}])`;
}

/**
 * Converts JSON Schema to Zod validator code string.
 * Supports: string, number, boolean, array, object, enum
 * @param {object} schema - JSON Schema fragment
 * @returns {string} - Zod validator code
 */
function jsonSchemaToZod(schema) {
  if (!schema) return 'z.any()';

  const schemaType = schema.type;

  // Handle enum first (can be any type)
  if (schema.enum && Array.isArray(schema.enum)) {
    return buildEnumValidator(schema.enum);
  }

  switch (schemaType) {
    case 'string':
      return buildStringValidator(schema);

    case 'number':
    case 'integer':
      return 'z.number()';

    case 'boolean':
      return 'z.boolean()';

    case 'array':
      return `z.array(${jsonSchemaToZod(schema.items || { type: 'any' })})`;

    case 'object': {
      const props = schema.properties || {};
      const requiredFields = new Set(schema.required || []);
      const entries = Object.entries(props).map(([key, val]) => {
        const baseValidator = jsonSchemaToZod(val);
        const finalValidator = requiredFields.has(key) ? baseValidator : `${baseValidator}.optional()`;
        return `${JSON.stringify(key)}: ${finalValidator}`;
      });
      return `z.object({ ${entries.join(', ')} })`;
    }

    default:
      return 'z.any()';
  }
}

function readSchemas() {
  const folders = fs.readdirSync(actionsDir, { withFileTypes: true }).filter(d => d.isDirectory());
  const actions = [];
  for (const dirent of folders) {
    const folder = dirent.name;
    const schemaPath = path.join(actionsDir, folder, 'schema.json');
    if (!fs.existsSync(schemaPath)) continue;
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    actions.push({ folder, schema });
  }
  return actions;
}

function generateIndex(actions) {
  const imports = [
    `import { z } from 'zod';`,
    ...actions.map(a => `import * as ${importVar(a.folder)} from './${a.folder}';`)
  ].join('\n');

  const actionLits = actions
    .filter(a => a.schema.isPublished)
    .map(a => {
      const s = a.schema;
      const def = s.definition || {};
      const defTitle = JSON.stringify(def.title || '');
      const defDesc = JSON.stringify(def.description || '');
      const defAnnotations = JSON.stringify(def.annotations || {});
      const defMeta = JSON.stringify(def._meta || {});
      const inputSchemaJson = def.inputSchema || { type: 'object', properties: {}, required: [] };
      const inputZod = jsonSchemaToZod(inputSchemaJson);
      return `{
    name: ${JSON.stringify(s.name)},
    version: ${JSON.stringify(s.version || '0.0.1')},
    isPublished: ${!!s.isPublished},
    hasAemWidget: ${!!s.hasAemWidget},
    definition: {
      title: ${defTitle},
      description: ${defDesc},
      inputSchema: ${inputZod},
      inputSchemaJson: ${JSON.stringify(inputSchemaJson)},
      annotations: ${defAnnotations},
      _meta: ${defMeta}
    },
    handler: ${importVar(a.folder)}.handler,
    fileName: '${a.folder}/index.ts'
  }`;
    })
    .join(',\n  ');

  const body = `${header}

// This file is auto-generated by scripts/generate-actions-from-schemas.js
// Do not edit this file directly.

${imports}

const actions = [
  ${actionLits}
];

export default actions;
`;
  fs.writeFileSync(outIndex, body.trim() + '\n');
}

function importVar(folder) {
  return `mod_${folder.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

const all = readSchemas();
generateIndex(all);
console.log('Generated actions index from ' + all.length + ' schema.json file(s).');


