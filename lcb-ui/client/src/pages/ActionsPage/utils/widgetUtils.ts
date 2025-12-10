import type { MCPTool } from '../../../../../shared/types';
import { ACTION_META } from '../../../constants/actionMeta';

/**
 * Check if an action has an EDS widget
 */
export function hasWidget(tool: MCPTool | null | undefined): boolean {
  if (!tool) return false;

  return !!(
    tool.hasEdsWidget ||
    tool._meta?.[ACTION_META.WIDGET_ACCESSIBLE] ||
    tool._meta?.[ACTION_META.OUTPUT_TEMPLATE]
  );
}

/**
 * Find the associated resource for an action from a list of resources
 * Tries multiple matching strategies:
 * 1. By actionName property
 * 2. By outputTemplate URI
 * 3. By extracting action name from URI pattern
 */
export function findAssociatedResource(
  actionName: string,
  action: any,
  resources: any[]
): any | null {
  // Try direct match by actionName
  let resource = resources.find((r: any) => r.actionName === actionName);

  // Try matching by outputTemplate URI
  if (!resource && action?._meta?.[ACTION_META.OUTPUT_TEMPLATE]) {
    const outputTemplateUri = action._meta[ACTION_META.OUTPUT_TEMPLATE];
    resource = resources.find((r: any) => r.uri === outputTemplateUri);
  }

  // Try extracting action name from URI pattern (e.g., "ui://eds-widget/action_name.html")
  if (!resource) {
    resource = resources.find((r: any) => {
      if (!r.uri) return false;
      const match = r.uri.match(/\/([^/]+)\.html$/);
      return match && match[1] === actionName;
    });
  }

  return resource || null;
}

/**
 * Extract action name from a widget resource URI
 * Example: "ui://eds-widget/action_4spenj.html" → "action_4spenj"
 */
export function extractActionNameFromUri(uri: string): string | null {
  const match = uri.match(/\/([^/]+)\.html$/);
  return match ? match[1] : null;
}
