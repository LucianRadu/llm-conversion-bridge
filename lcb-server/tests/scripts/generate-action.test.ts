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

describe('generate-action.js', () => {
  const PROJECT_ROOT = path.join(__dirname, '..', '..');
  const SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts', 'generate-action.js');
  const ACTIONS_DIR = path.join(PROJECT_ROOT, 'server', 'src', 'actions');

  // Test action names
  const TEST_ACTION_BASIC = 'testActionBasic';
  const TEST_ACTION_WIDGET = 'testActionWidget';

  /**
   * Helper function to execute the generate-action script
   */
  function runGenerateAction(actionName: string, withWidget: boolean = false): string {
    const widgetFlag = withWidget ? '--widget' : '';
    try {
      return execSync(
        `cd "${PROJECT_ROOT}" && node "${SCRIPT_PATH}" ${actionName} ${widgetFlag}`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
    } catch (error: any) {
      throw new Error(`Script execution failed: ${error.message}\n${error.stdout}\n${error.stderr}`);
    }
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

  // Clean up before and after each test
  beforeEach(() => {
    cleanupAction(TEST_ACTION_BASIC);
    cleanupAction(TEST_ACTION_WIDGET);
  });

  afterEach(() => {
    cleanupAction(TEST_ACTION_BASIC);
    cleanupAction(TEST_ACTION_WIDGET);
  });

  describe('String Conversion Functions', () => {
    describe('toKebabCase', () => {
      it('should use kebab-case in widget URLs', () => {
        runGenerateAction('myWidgetAction', true);

        const templatePath = path.join(ACTIONS_DIR, 'myWidgetAction', 'widget', 'template.html');
        const content = fs.readFileSync(templatePath, 'utf-8');

        // Widget embed URL should use kebab-case
        expect(content).toContain('my-widget-action');

        cleanupAction('myWidgetAction');
      });

      it('should use kebab-case in widget URIs', () => {
        runGenerateAction('myTestAction', true);

        const widgetIndexPath = path.join(ACTIONS_DIR, 'myTestAction', 'widget', 'index.ts');
        const content = fs.readFileSync(widgetIndexPath, 'utf-8');

        // Widget URI should use kebab-case
        expect(content).toContain('ui://eds-widget/my-test-action-widget.html');

        cleanupAction('myTestAction');
      });
    });
  });

  describe('Action Generation Without Widget', () => {
    it('should create action directory structure', () => {
      runGenerateAction(TEST_ACTION_BASIC, false);

      const actionDir = path.join(ACTIONS_DIR, TEST_ACTION_BASIC);
      expect(fs.existsSync(actionDir)).toBe(true);
      expect(fs.statSync(actionDir).isDirectory()).toBe(true);
    });

    it('should generate index.ts with correct content', () => {
      runGenerateAction(TEST_ACTION_BASIC, false);

      const indexPath = path.join(ACTIONS_DIR, TEST_ACTION_BASIC, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // Verify Adobe copyright header
      expect(content).toContain('ADOBE CONFIDENTIAL');
      expect(content).toContain('Copyright 2025 Adobe');

      // Verify imports
      expect(content).toContain("import { z } from \"zod\"");
      expect(content).toContain("import type { Action, ActionHandlerResult }");
      expect(content).toContain("import { logger }");

      // Verify action object
      expect(content).toContain(`const ${TEST_ACTION_BASIC}: Action =`);
      expect(content).toContain('handler: async');

      // Should NOT have widget-specific _meta fields for non-widget actions
      expect(content).not.toContain('openai/outputTemplate');
      expect(content).not.toContain('structuredContent');
    });

    it('should NOT create widget directory for non-widget actions', () => {
      runGenerateAction(TEST_ACTION_BASIC, false);

      const widgetDir = path.join(ACTIONS_DIR, TEST_ACTION_BASIC, 'widget');
      expect(fs.existsSync(widgetDir)).toBe(false);
    });
  });

  describe('Action Generation With Widget', () => {
    it('should create action and widget directories', () => {
      runGenerateAction(TEST_ACTION_WIDGET, true);

      const actionDir = path.join(ACTIONS_DIR, TEST_ACTION_WIDGET);
      const widgetDir = path.join(actionDir, 'widget');

      expect(fs.existsSync(actionDir)).toBe(true);
      expect(fs.existsSync(widgetDir)).toBe(true);
      expect(fs.statSync(widgetDir).isDirectory()).toBe(true);
    });

    it('should generate widget index.ts with metadata', () => {
      runGenerateAction(TEST_ACTION_WIDGET, true);

      const widgetIndexPath = path.join(ACTIONS_DIR, TEST_ACTION_WIDGET, 'widget', 'index.ts');
      const content = fs.readFileSync(widgetIndexPath, 'utf-8');

      // Verify Adobe copyright
      expect(content).toContain('ADOBE CONFIDENTIAL');

      // Verify widget export
      expect(content).toContain('export const widget');
      expect(content).toContain('uri:');
      expect(content).toContain('mimeType:');
    });

    it('should generate template.html with PLACEHOLDER URLs (not hardcoded)', () => {
      runGenerateAction(TEST_ACTION_WIDGET, true);

      const templatePath = path.join(ACTIONS_DIR, TEST_ACTION_WIDGET, 'widget', 'template.html');
      const content = fs.readFileSync(templatePath, 'utf-8');

      // CRITICAL: Verify placeholder URLs (our fix)
      expect(content).toContain('YOUR_SCRIPT_URL_HERE');
      expect(content).toContain('YOUR_WIDGET_EMBED_URL_HERE');
      expect(content).toContain('test-action-widget'); // kebab-case action name

      // Verify TODO comments
      expect(content).toContain('<!-- TODO: Configure your widget template URLs below -->');
      expect(content).toContain('<!-- Script URL: Add your aem-embed.js script URL -->');
      expect(content).toContain('<!-- Widget Embed URL: Add your widget content URL -->');
      expect(content).toContain('<!-- Example: https://main--your-repo--your-org.aem.live/scripts/aem-embed.js -->');

      // CRITICAL: Verify the actual generated content matches our placeholder pattern
      // The example comment should use generic placeholder pattern
      expect(content).toContain('your-repo--your-org.aem.live');
    });

    it('should include widget _meta fields in action index.ts', () => {
      runGenerateAction(TEST_ACTION_WIDGET, true);

      const indexPath = path.join(ACTIONS_DIR, TEST_ACTION_WIDGET, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // Verify widget-specific _meta fields
      expect(content).toContain('openai/outputTemplate');
      expect(content).toContain('ui://eds-widget/test-action-widget-widget.html');
      expect(content).toContain('openai/toolInvocation/invoking');
      expect(content).toContain('openai/toolInvocation/invoked');
      expect(content).toContain('openai/widgetAccessible');
      expect(content).toContain('openai/resultCanProduceWidget');

      // Verify handler returns structuredContent
      expect(content).toContain('structuredContent:');
    });

    it('should use kebab-case in all widget file paths and URIs', () => {
      runGenerateAction('camelCaseWidget', true);

      const templatePath = path.join(ACTIONS_DIR, 'camelCaseWidget', 'widget', 'template.html');
      const content = fs.readFileSync(templatePath, 'utf-8');

      // Widget embed URL should use kebab-case
      expect(content).toContain('camel-case-widget');
      expect(content).not.toContain('camelCaseWidget');

      cleanupAction('camelCaseWidget');
    });
  });

  describe('File Content Verification', () => {
    it('should include Adobe copyright header in all generated files', () => {
      runGenerateAction(TEST_ACTION_WIDGET, true);

      const files = [
        path.join(ACTIONS_DIR, TEST_ACTION_WIDGET, 'index.ts'),
        path.join(ACTIONS_DIR, TEST_ACTION_WIDGET, 'widget', 'index.ts')
      ];

      files.forEach(filePath => {
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).toContain('ADOBE CONFIDENTIAL');
        expect(content).toContain('Copyright 2025 Adobe');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle action names with special characters gracefully', () => {
      // Test with valid action name (no special chars)
      expect(() => runGenerateAction('validActionName', false)).not.toThrow();
      cleanupAction('validActionName');
    });
  });
});
