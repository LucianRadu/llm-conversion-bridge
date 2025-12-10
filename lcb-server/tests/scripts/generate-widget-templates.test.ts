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
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('generate-widget-templates.js', () => {
  const PROJECT_ROOT = path.join(__dirname, '..', '..');
  const SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts', 'generate-widget-templates.js');
  const ACTIONS_DIR = path.join(PROJECT_ROOT, 'server', 'src', 'actions');
  const TEST_FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'temp-actions');

  // Test action names
  const TEST_ACTION_COMPLETE = 'testWidgetComplete';
  const TEST_ACTION_NO_SCRIPT = 'testWidgetNoScript';
  const TEST_ACTION_NO_EMBED = 'testWidgetNoEmbed';
  const TEST_ACTION_NO_META = 'testWidgetNoMeta';
  const TEST_ACTION_NO_SCHEMA = 'testWidgetNoSchema';

  /**
   * Helper function to execute the generate-widget-templates script
   */
  function runGenerateWidgetTemplates(): { stdout: string; stderr: string; combined: string } {
    try {
      const stdout = execSync(
        `cd "${PROJECT_ROOT}" && node "${SCRIPT_PATH}" 2>&1`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      return { stdout, stderr: '', combined: stdout };
    } catch (error: any) {
      throw new Error(`Script execution failed: ${error.message}\n${error.stdout}\n${error.stderr}`);
    }
  }

  /**
   * Helper function to create test action with widget directory and schema
   */
  function createTestAction(actionName: string, widgetSchema: any): void {
    const actionPath = path.join(ACTIONS_DIR, actionName);
    const widgetPath = path.join(actionPath, 'widget');
    const schemaPath = path.join(widgetPath, 'widget-schema.json');

    // Create directories
    fs.mkdirSync(widgetPath, { recursive: true });

    // Write widget-schema.json
    fs.writeFileSync(schemaPath, JSON.stringify(widgetSchema, null, 2), 'utf-8');
  }

  /**
   * Helper function to clean up generated test actions
   */
  function cleanupAction(actionName: string): void {
    const actionPath = path.join(ACTIONS_DIR, actionName);
    if (fs.existsSync(actionPath)) {
      fs.rmSync(actionPath, { recursive: true, force: true });
    }
  }

  /**
   * Helper function to read generated template.html
   */
  function readTemplate(actionName: string): string {
    const templatePath = path.join(ACTIONS_DIR, actionName, 'widget', 'template.html');
    return fs.readFileSync(templatePath, 'utf-8');
  }

  /**
   * Helper function to check if template.html exists
   */
  function templateExists(actionName: string): boolean {
    const templatePath = path.join(ACTIONS_DIR, actionName, 'widget', 'template.html');
    return fs.existsSync(templatePath);
  }

  // Clean up before and after each test
  beforeEach(() => {
    cleanupAction(TEST_ACTION_COMPLETE);
    cleanupAction(TEST_ACTION_NO_SCRIPT);
    cleanupAction(TEST_ACTION_NO_EMBED);
    cleanupAction(TEST_ACTION_NO_META);
    cleanupAction(TEST_ACTION_NO_SCHEMA);
  });

  afterEach(() => {
    cleanupAction(TEST_ACTION_COMPLETE);
    cleanupAction(TEST_ACTION_NO_SCRIPT);
    cleanupAction(TEST_ACTION_NO_EMBED);
    cleanupAction(TEST_ACTION_NO_META);
    cleanupAction(TEST_ACTION_NO_SCHEMA);
  });

  describe('Template Generation with Complete Schema', () => {
    it('should generate template.html with both script_url and widget_embed_url', () => {
      const widgetSchema = {
        _meta: {
          'openai:widget_meta': {
            script_url: 'https://main--repo-001--owner-001.aem.live/scripts/aem-embed.js',
            widget_embed_url: 'https://main--repo-001--owner-001.aem.live/widgets/test-widget'
          }
        }
      };

      createTestAction(TEST_ACTION_COMPLETE, widgetSchema);
      const result = runGenerateWidgetTemplates();

      const template = readTemplate(TEST_ACTION_COMPLETE);

      // Verify script tag
      expect(template).toContain('<script src="https://main--repo-001--owner-001.aem.live/scripts/aem-embed.js" type="module"></script>');

      // Verify aem-embed element
      expect(template).toContain('<aem-embed url="https://main--repo-001--owner-001.aem.live/widgets/test-widget"></aem-embed>');

      // Verify HTML structure
      expect(template).toContain('<div>');
      expect(template).toContain('</div>');
    });

    it('should generate template.html with correct HTML structure', () => {
      const widgetSchema = {
        _meta: {
          'openai:widget_meta': {
            script_url: 'https://main--eds-001--org-001.aem.live/scripts/aem-embed.js',
            widget_embed_url: 'https://main--eds-001--org-001.aem.live/widgets/my-widget'
          }
        }
      };

      createTestAction(TEST_ACTION_COMPLETE, widgetSchema);
      const result = runGenerateWidgetTemplates();

      const template = readTemplate(TEST_ACTION_COMPLETE);

      // Verify exact structure
      expect(template.trim()).toMatch(/^<script src="[^"]+" type="module"><\/script>\n<div>\n\s+<aem-embed url="[^"]+"><\/aem-embed>\n<\/div>$/);
    });

    it('should handle multiple widget actions in same run', () => {
      const schema1 = {
        _meta: {
          'openai:widget_meta': {
            script_url: 'https://main--repo-001--owner-001.aem.live/scripts/aem-embed.js',
            widget_embed_url: 'https://main--repo-001--owner-001.aem.live/widgets/widget1'
          }
        }
      };

      const schema2 = {
        _meta: {
          'openai:widget_meta': {
            script_url: 'https://main--repo-002--owner-002.aem.live/scripts/aem-embed.js',
            widget_embed_url: 'https://main--repo-002--owner-002.aem.live/widgets/widget2'
          }
        }
      };

      createTestAction('testWidget1', schema1);
      createTestAction('testWidget2', schema2);

      const result = runGenerateWidgetTemplates();

      const template1 = readTemplate('testWidget1');
      const template2 = readTemplate('testWidget2');

      // Verify both templates generated with correct URLs
      expect(template1).toContain('repo-001--owner-001.aem.live');
      expect(template2).toContain('repo-002--owner-002.aem.live');

      // Cleanup
      cleanupAction('testWidget1');
      cleanupAction('testWidget2');
    });
  });

  describe('Template Generation with Missing URLs', () => {
    it('should skip generation when script_url is missing', () => {
      const widgetSchema = {
        _meta: {
          'openai:widget_meta': {
            widget_embed_url: 'https://main--repo-001--owner-001.aem.live/widgets/test-widget'
          }
        }
      };

      createTestAction(TEST_ACTION_NO_SCRIPT, widgetSchema);

      const result = runGenerateWidgetTemplates();

      // Verify script reported skipping
      expect(result.combined).toContain(`Skipping ${TEST_ACTION_NO_SCRIPT}`);
      expect(result.combined).toContain('Missing required template URLs');

      // Verify template.html was NOT created
      expect(templateExists(TEST_ACTION_NO_SCRIPT)).toBe(false);
    });

    it('should skip generation when widget_embed_url is missing', () => {
      const widgetSchema = {
        _meta: {
          'openai:widget_meta': {
            script_url: 'https://main--repo-001--owner-001.aem.live/scripts/aem-embed.js'
          }
        }
      };

      createTestAction(TEST_ACTION_NO_EMBED, widgetSchema);

      const result = runGenerateWidgetTemplates();

      // Verify script reported skipping
      expect(result.combined).toContain(`Skipping ${TEST_ACTION_NO_EMBED}`);
      expect(result.combined).toContain('Missing required template URLs');

      // Verify template.html was NOT created
      expect(templateExists(TEST_ACTION_NO_EMBED)).toBe(false);
    });

    it('should skip generation when both URLs are missing', () => {
      const widgetSchema = {
        _meta: {
          'openai:widget_meta': {}
        }
      };

      createTestAction(TEST_ACTION_NO_META, widgetSchema);

      const result = runGenerateWidgetTemplates();

      // Verify script reported skipping
      expect(result.combined).toContain(`Skipping ${TEST_ACTION_NO_META}`);

      // Verify template.html was NOT created
      expect(templateExists(TEST_ACTION_NO_META)).toBe(false);
    });
  });

  describe('Template Generation with Missing or Malformed Schema', () => {
    it('should skip action without widget directory', () => {
      const actionPath = path.join(ACTIONS_DIR, TEST_ACTION_NO_SCHEMA);

      // Create action directory without widget subdirectory
      fs.mkdirSync(actionPath, { recursive: true });

      const result = runGenerateWidgetTemplates();

      // Should not mention this action (silently skipped)
      expect(result.combined).not.toContain(TEST_ACTION_NO_SCHEMA);

      // Verify no template was created
      expect(templateExists(TEST_ACTION_NO_SCHEMA)).toBe(false);
    });

    it('should skip action without widget-schema.json', () => {
      const actionPath = path.join(ACTIONS_DIR, TEST_ACTION_NO_SCHEMA);
      const widgetPath = path.join(actionPath, 'widget');

      // Create widget directory without schema file
      fs.mkdirSync(widgetPath, { recursive: true });

      const result = runGenerateWidgetTemplates();

      // Should not mention this action (silently skipped)
      expect(result.combined).not.toContain(TEST_ACTION_NO_SCHEMA);

      // Verify no template was created
      expect(templateExists(TEST_ACTION_NO_SCHEMA)).toBe(false);
    });

    it('should handle malformed JSON gracefully', () => {
      const actionPath = path.join(ACTIONS_DIR, 'testMalformedJson');
      const widgetPath = path.join(actionPath, 'widget');
      const schemaPath = path.join(widgetPath, 'widget-schema.json');

      // Create directories and write malformed JSON
      fs.mkdirSync(widgetPath, { recursive: true });
      fs.writeFileSync(schemaPath, '{ invalid json }', 'utf-8');

      const result = runGenerateWidgetTemplates();

      // Script should report error for this action (combined output includes stderr)
      expect(result.combined).toContain('Error processing testMalformedJson');
      expect(result.combined).toContain('Expected property name');

      // Verify no template was created
      expect(templateExists('testMalformedJson')).toBe(false);

      // Cleanup
      cleanupAction('testMalformedJson');
    });
  });

  describe('_meta Field Extraction', () => {
    it('should extract URLs from nested _meta structure', () => {
      const widgetSchema = {
        name: 'testWidget',
        version: '1.0.0',
        _meta: {
          'openai:widget_meta': {
            script_url: 'https://main--repo-001--owner-001.aem.live/scripts/aem-embed.js',
            widget_embed_url: 'https://main--repo-001--owner-001.aem.live/widgets/test',
            other_field: 'ignored'
          },
          'other:field': 'ignored'
        },
        other_root_field: 'ignored'
      };

      createTestAction(TEST_ACTION_COMPLETE, widgetSchema);
      const result = runGenerateWidgetTemplates();

      const template = readTemplate(TEST_ACTION_COMPLETE);

      // Verify only script_url and widget_embed_url were used
      expect(template).toContain('repo-001--owner-001.aem.live/scripts/aem-embed.js');
      expect(template).toContain('repo-001--owner-001.aem.live/widgets/test');

      // Verify other fields were ignored
      expect(template).not.toContain('ignored');
      expect(template).not.toContain('other_field');
    });

    it('should handle schema without _meta field', () => {
      const widgetSchema = {
        name: 'testWidget',
        version: '1.0.0'
      };

      createTestAction(TEST_ACTION_NO_META, widgetSchema);

      const result = runGenerateWidgetTemplates();

      // Should skip due to missing _meta
      expect(result.combined).toContain(`Skipping ${TEST_ACTION_NO_META}`);
      expect(templateExists(TEST_ACTION_NO_META)).toBe(false);
    });

    it('should handle schema with _meta but no openai:widget_meta', () => {
      const widgetSchema = {
        _meta: {
          'other:field': 'value'
        }
      };

      createTestAction(TEST_ACTION_NO_META, widgetSchema);

      const result = runGenerateWidgetTemplates();

      // Should skip due to missing openai:widget_meta
      expect(result.combined).toContain(`Skipping ${TEST_ACTION_NO_META}`);
      expect(templateExists(TEST_ACTION_NO_META)).toBe(false);
    });
  });

  describe('Script Output and Reporting', () => {
    it('should report generated count correctly', () => {
      const widgetSchema = {
        _meta: {
          'openai:widget_meta': {
            script_url: 'https://main--repo-001--owner-001.aem.live/scripts/aem-embed.js',
            widget_embed_url: 'https://main--repo-001--owner-001.aem.live/widgets/test'
          }
        }
      };

      createTestAction(TEST_ACTION_COMPLETE, widgetSchema);

      const result = runGenerateWidgetTemplates();

      // Verify success message
      expect(result.combined).toContain(`Generated template.html for ${TEST_ACTION_COMPLETE}`);

      // Verify summary
      expect(result.combined).toContain('Widget Template Generation Complete');
      expect(result.combined).toMatch(/Generated: \d+ template\(s\)/);
    });

    it('should report skipped count correctly', () => {
      const widgetSchema = {
        _meta: {
          'openai:widget_meta': {
            script_url: 'https://main--repo-001--owner-001.aem.live/scripts/aem-embed.js'
            // Missing widget_embed_url
          }
        }
      };

      createTestAction(TEST_ACTION_NO_EMBED, widgetSchema);

      const result = runGenerateWidgetTemplates();

      // Verify skipped message
      expect(result.combined).toContain(`Skipping ${TEST_ACTION_NO_EMBED}`);

      // Verify summary
      expect(result.combined).toMatch(/Skipped: \d+ widget\(s\)/);
    });
  });

  describe('File System Safety', () => {
    it('should not modify non-test action directories', () => {
      // Get list of existing actions before test
      const existingActions = fs.readdirSync(ACTIONS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      const widgetSchema = {
        _meta: {
          'openai:widget_meta': {
            script_url: 'https://main--repo-001--owner-001.aem.live/scripts/aem-embed.js',
            widget_embed_url: 'https://main--repo-001--owner-001.aem.live/widgets/test'
          }
        }
      };

      createTestAction(TEST_ACTION_COMPLETE, widgetSchema);
      const result = runGenerateWidgetTemplates();

      // Verify existing actions still exist
      for (const actionName of existingActions) {
        const actionPath = path.join(ACTIONS_DIR, actionName);
        expect(fs.existsSync(actionPath)).toBe(true);
      }
    });

    it('should only create template.html in widget directory', () => {
      const widgetSchema = {
        _meta: {
          'openai:widget_meta': {
            script_url: 'https://main--repo-001--owner-001.aem.live/scripts/aem-embed.js',
            widget_embed_url: 'https://main--repo-001--owner-001.aem.live/widgets/test'
          }
        }
      };

      createTestAction(TEST_ACTION_COMPLETE, widgetSchema);
      const result = runGenerateWidgetTemplates();

      const widgetPath = path.join(ACTIONS_DIR, TEST_ACTION_COMPLETE, 'widget');
      const files = fs.readdirSync(widgetPath);

      // Should have widget-schema.json (created by us) and template.html (created by script)
      expect(files).toContain('widget-schema.json');
      expect(files).toContain('template.html');
      expect(files.length).toBe(2);
    });
  });
});
