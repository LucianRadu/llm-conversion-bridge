import { storageService } from './storage';
import { getRemoteMCPUrl } from '../utils/tomlParser';
import { randomUUID } from 'crypto';
import type { MCPServer } from '../../../shared/types';

/**
 * Extract MCP transport path from AEM_COMPUTE_SERVICE environment variable
 * Format: p<project>-e<env>-<service-name> → /<service-name>
 */
function extractMcpPath(): string {
  const envValue = process.env.AEM_COMPUTE_SERVICE;
  if (!envValue) {
    console.error('[Source Server Initializer] ERROR: AEM_COMPUTE_SERVICE environment variable is required.');
    console.error('[Source Server Initializer] Expected format: p<project>-e<env>-<service-name>');
    throw new Error(
      'AEM_COMPUTE_SERVICE environment variable is required. ' +
      'Format: p<project>-e<env>-<service-name>'
    );
  }
  
  // Extract service name after second dash: pXXXXXX-eXXXXXX-<service-name>
  const match = envValue.match(/^[^-]+-[^-]+-(.+)$/);
  if (!match) {
    console.error(`[Source Server Initializer] ERROR: Invalid AEM_COMPUTE_SERVICE format: "${envValue}"`);
    console.error('[Source Server Initializer] Expected format: p<project>-e<env>-<service-name>');
    throw new Error(
      `Invalid AEM_COMPUTE_SERVICE format: "${envValue}". ` +
      'Expected format: p<project>-e<env>-<service-name>'
    );
  }
  
  return `/${match[1]}`;
}

// Lazy evaluation - extract path only when first needed (after dotenv loads)
let _mcpTransportPath: string | null = null;
function getMcpTransportPath(): string {
  if (_mcpTransportPath === null) {
    _mcpTransportPath = extractMcpPath();
  }
  return _mcpTransportPath;
}

function getLocalMcpUrl(): string {
  const port = process.env.LCB_SERVER_PORT || '7676';
  return `http://localhost:${port}${getMcpTransportPath()}`;
}

// Default source project path (relative to lcb-ui folder)
const DEFAULT_SOURCE_PATH = process.env.LCB_SERVER_PATH || '../lcb-server';

/**
 * Ensure managed LCB servers exist (Local + Remote)
 * Called on server startup to auto-create source project servers
 */
export async function ensureManagedServers(): Promise<void> {
  try {
    console.log('[Source Server Initializer] Checking for managed servers...');

    // CLEAN ROOM: Clear ALL deployments and ALL environments on startup
    console.log('[Source Server Initializer] Clean room: Clearing all deployments and environments...');
    const allDeployments = await storageService.getAllDeployments();
    const allEnvironments = await storageService.getAllEnvironments();
    
    const deploymentKeys = Object.keys(allDeployments);
    const environmentKeys = Object.keys(allEnvironments);
    
    if (deploymentKeys.length > 0) {
      console.log(`[Source Server Initializer] Clearing ${deploymentKeys.length} deployment entries...`);
      await storageService.saveAllDeployments({});
      console.log('[Source Server Initializer] ✓ All deployments cleared');
    }
    
    if (environmentKeys.length > 0) {
      console.log(`[Source Server Initializer] Clearing ${environmentKeys.length} environment entries...`);
      await storageService.saveAllEnvironments({});
      console.log('[Source Server Initializer] ✓ All environments cleared');
    }

    // Get all servers
    const allServers = await storageService.getServers();

    // DELETE ALL EXISTING MANAGED SERVERS (they will be recreated with fresh config)
    const managedServers = allServers.filter(s =>
      s.serverType === 'local-managed' || s.serverType === 'remote-managed'
    );

    if (managedServers.length > 0) {
      console.log(`[Source Server Initializer] Deleting ${managedServers.length} existing managed server(s)...`);
      for (const server of managedServers) {
        console.log(`  - Deleting: ${server.name} (${server.serverType})`);
        await storageService.forceRemoveManagedServer(server.id);
      }
      console.log('[Source Server Initializer] ✓ All managed servers deleted');
    }

    console.log('[Source Server Initializer] Creating fresh managed servers...');

    // Read EDS config from environment variables
    const edsBranch = process.env.EDS_BRANCH || '';
    const edsRepo = process.env.EDS_REPO || '';
    const edsOwner = process.env.EDS_OWNER || '';
    
    console.log('[Source Server Initializer] EDS Config from environment:');
    console.log(`  EDS_BRANCH: ${edsBranch || '(not set)'}`);
    console.log(`  EDS_REPO: ${edsRepo || '(not set)'}`);
    console.log(`  EDS_OWNER: ${edsOwner || '(not set)'}`);
    
    // Create Local managed server
    const localServer: MCPServer = {
      id: randomUUID(),
      name: 'Managed LCB Server (Local)',
      description: 'Local development server for the LCB project. Editable source code.',
      url: getLocalMcpUrl(),
      transport: 'http',
      status: 'disconnected',
      serverType: 'local-managed',
      sourceProjectPath: DEFAULT_SOURCE_PATH,
      edsConfig: edsBranch && edsRepo && edsOwner ? {
        branch: edsBranch,
        repo: edsRepo,
        owner: edsOwner
      } : undefined,
    };

    console.log('[Source Server Initializer] Creating local server with edsConfig:', localServer.edsConfig);

    await storageService.createServer(localServer);
    console.log(`[Source Server Initializer] ✓ Created: ${localServer.name}`);
    console.log(`  URL: ${localServer.url}`);
    console.log(`  Source: ${localServer.sourceProjectPath}`);
    console.log(`  EDS Config: ${localServer.edsConfig ? JSON.stringify(localServer.edsConfig) : '(not set)'}`);

    // Create default environments ONLY for Local Managed server
    await createDefaultEnvironments(localServer.id);

    // Get remote URL from AEM_COMPUTE_SERVICE environment variable
    const remoteUrl = getRemoteMCPUrl();

    // Create Remote managed server (NO environments - deploy disabled)
    const remoteServer: MCPServer = {
      id: randomUUID(),
      name: 'Managed LCB Server (Remote)',
      description: 'Remote production server deployed on Fastly Compute@Edge. Read-only.',
      url: remoteUrl,
      transport: 'http',
      status: 'disconnected',
      serverType: 'remote-managed',
      sourceProjectPath: DEFAULT_SOURCE_PATH,
    };

    await storageService.createServer(remoteServer);
    console.log(`[Source Server Initializer] ✓ Created: ${remoteServer.name}`);
    console.log(`  URL: ${remoteServer.url}`);
    console.log(`  Source: ${remoteServer.sourceProjectPath}`);
    console.log(`  Environments: None (deploy disabled for remote-managed servers)`);

    console.log('[Source Server Initializer] Managed servers initialized successfully!');
  } catch (error) {
    console.error('[Source Server Initializer] Error initializing managed servers:', error);
    // Don't throw - server should continue even if initialization fails
  }
}

/**
 * Get the managed server for a specific type
 */
export async function getManagedServer(serverType: 'local-managed' | 'remote-managed'): Promise<MCPServer | null> {
  try {
    const allServers = await storageService.getServers();
    return allServers.find(s => s.serverType === serverType) || null;
  } catch (error) {
    console.error('[Source Server Initializer] Error getting managed server:', error);
    return null;
  }
}

/**
 * Check if a server is editable (local-managed only)
 */
export function isServerEditable(server: MCPServer | null | undefined): boolean {
  if (!server) return false;
  return server.serverType === 'local-managed';
}

/**
 * Check if a server is managed (local or remote)
 */
export function isManagedServer(server: MCPServer | null | undefined): boolean {
  if (!server) return false;
  return server.serverType === 'local-managed' || server.serverType === 'remote-managed';
}

/**
 * Create default environments for Managed servers
 * Creates 2 managed environments: Local (for testing) and Remote (for Fastly deployment)
 * Managed environments cannot be deleted by users
 */
async function createDefaultEnvironments(serverId: string): Promise<void> {
  try {
    console.log('[Source Server Initializer] Creating default managed environments...');

    const now = new Date().toISOString();

    // Local environment for local testing (MANAGED)
    const localEnv = {
      id: `${serverId}-local`,
      name: 'Local Development',
      description: 'Local development environment for testing builds',
      type: 'local' as const,
      managed: true, // System-created, cannot be deleted
      createdAt: now,
    };

    // Remote environment for Fastly deployment (MANAGED)
    // Use FULL AEM_COMPUTE_SERVICE as Fastly service ID (e.g., p169116-e1811065-lcb-boilerplate)
    const fullServiceId = process.env.AEM_COMPUTE_SERVICE || '';

    const remoteEnv = {
      id: `${serverId}-remote`,
      name: 'Fastly Production',
      description: 'Remote production environment on Fastly Compute@Edge',
      type: 'remote' as const,
      managed: true, // System-created, cannot be deleted
      aemServiceId: fullServiceId, // Full Fastly service ID from AEM_COMPUTE_SERVICE env var
      aemServiceToken: process.env.AEM_COMPUTE_TOKEN || '', // From env var
      createdAt: now,
    };

    // Add each environment individually using addEnvironment
    await storageService.addEnvironment(serverId, localEnv);
    await storageService.addEnvironment(serverId, remoteEnv);

    console.log('[Source Server Initializer] ✓ Created default managed environments:');
    console.log(`  - ${localEnv.name} (local, managed)`);
    console.log(`  - ${remoteEnv.name} (remote, managed - credentials required)`);
  } catch (error) {
    console.error('[Source Server Initializer] Error creating default environments:', error);
    // Don't throw - server creation is more important
  }
}
