import type { MCPTool } from '../../../../../shared/types';

/**
 * Sort tools by deployment status
 * Order: newly created (deployed=false) first, then alphabetically
 */
export function sortToolsByDeploymentStatus(tools: MCPTool[]): MCPTool[] {
  return [...tools].sort((a, b) => {
    // Newly created actions go first
    if (a.deployed === false && b.deployed !== false) return -1;
    if (a.deployed !== false && b.deployed === false) return 1;
    // Otherwise sort alphabetically by name
    return a.name.localeCompare(b.name);
  });
}

/**
 * Filter tools by search query (searches name and description)
 */
export function filterToolsByQuery(tools: MCPTool[], query: string): MCPTool[] {
  if (!query) return tools;

  const lowerQuery = query.toLowerCase();
  return tools.filter(tool =>
    tool.name.toLowerCase().includes(lowerQuery) ||
    (tool.description && tool.description.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Count draft actions (actions with badges: draft/not deployed/deleted)
 */
export function countDraftActions(tools: MCPTool[]): Set<string> {
  return new Set(
    tools
      .filter(t => t.draft === true || t.deployed === false || t.deleted === true)
      .map(t => t.name)
  );
}
