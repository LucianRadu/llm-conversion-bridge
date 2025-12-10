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

import type { MCPServer, ServerType } from '../../../shared/types';

/**
 * Check if a server is remote (remote-managed or remote-external)
 * Remote servers are read-only and cannot be deployed to
 */
export function isRemoteServer(server: MCPServer | null | undefined): boolean {
  if (!server) return false;
  const serverType = server.serverType as ServerType | undefined;
  return serverType === 'remote-managed' || serverType === 'remote-external';
}

/**
 * Check if a server is local-managed
 * Only local-managed servers can be deployed to
 */
export function isLocalManagedServer(server: MCPServer | null | undefined): boolean {
  if (!server) return false;
  const serverType = server.serverType as ServerType | undefined;
  return serverType === 'local-managed';
}

/**
 * Check if a server is remote-managed
 * Remote-managed servers show an info tooltip instead of edit/delete buttons
 */
export function isRemoteManagedServer(server: MCPServer | null | undefined): boolean {
  if (!server) return false;
  const serverType = server.serverType as ServerType | undefined;
  return serverType === 'remote-managed';
}

/**
 * Check if a server is remote-external
 * Remote-external servers have buttons completely hidden
 */
export function isRemoteExternalServer(server: MCPServer | null | undefined): boolean {
  if (!server) return false;
  const serverType = server.serverType as ServerType | undefined;
  return serverType === 'remote-external';
}

/**
 * Get a user-friendly label for server type
 */
export function getServerTypeLabel(serverType?: ServerType): string {
  switch (serverType) {
    case 'local-managed':
      return 'Local (Managed)';
    case 'remote-managed':
      return 'Remote (Managed)';
    case 'remote-external':
      return 'Remote (External)';
    default:
      return 'Unknown';
  }
}

