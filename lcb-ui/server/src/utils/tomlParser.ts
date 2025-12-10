import * as fs from 'fs';
import * as path from 'path';

/**
 * Parse AEM_COMPUTE_SERVICE environment variable
 * Format: p<project>-e<env>-<service-name>
 * Service ID is always the first two dash-separated parts: pXXXXXX-eXXXXXX
 * MCP path is everything after the second dash
 */
function parseAemComputeService(envValue: string | undefined): { serviceId: string; mcpPath: string } {
  if (!envValue) {
    throw new Error(
      'AEM_COMPUTE_SERVICE environment variable is required but not set. ' +
      'Format: <service-id>-<mcp-path> (e.g., p<project>-e<env>-<service-name>)'
    );
  }
  
  // Match pattern: pXXXXXX-eXXXXXX-<anything>
  const match = envValue.match(/^([^-]+-[^-]+)-(.+)$/);
  if (!match) {
    throw new Error(
      `Invalid AEM_COMPUTE_SERVICE format: "${envValue}". ` +
      'Expected format: pXXXXXX-eXXXXXX-<mcp-path> (e.g., p<project>-e<env>-<service-name>)'
    );
  }
  
  return {
    serviceId: match[1],  // First two dash-separated parts
    mcpPath: match[2]      // Everything after second dash
  };
}

/**
 * Parse fastly.toml file and extract PUBLISH_BASE_URL
 * This URL is used for the Remote managed server
 */
export function getPublishBaseUrl(lcbServerPath: string): string | null {
  try {
    const tomlPath = path.join(lcbServerPath, 'fastly.toml');

    // Check if file exists
    if (!fs.existsSync(tomlPath)) {
      console.warn(`[TOML Parser] fastly.toml not found at: ${tomlPath}`);
      return null;
    }

    // Read file content
    const content = fs.readFileSync(tomlPath, 'utf-8');

    // Simple regex to extract PUBLISH_BASE_URL from [env] section
    // Pattern: PUBLISH_BASE_URL = "https://..."
    const match = content.match(/PUBLISH_BASE_URL\s*=\s*"([^"]+)"/);

    if (match && match[1]) {
      const url = match[1];
      console.log(`[TOML Parser] Extracted PUBLISH_BASE_URL: ${url}`);
      return url;
    }

    console.warn('[TOML Parser] PUBLISH_BASE_URL not found in fastly.toml');
    return null;
  } catch (error) {
    console.error('[TOML Parser] Error reading fastly.toml:', error);
    return null;
  }
}

/**
 * Get full remote MCP endpoint URL
 * Derives URL from AEM_COMPUTE_SERVICE environment variable
 *
 * @returns Full remote MCP URL (e.g., https://publish-p<project>-e<env>.adobeaemcloud.com/<service-name>)
 */
export function getRemoteMCPUrl(): string {
  const { serviceId, mcpPath: parsedMcpPath } = parseAemComputeService(process.env.AEM_COMPUTE_SERVICE);
  return `https://publish-${serviceId}.adobeaemcloud.com/${parsedMcpPath}`;
}
