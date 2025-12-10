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

import { Button, StatusLight } from "@react-spectrum/s2";
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Connect from '@react-spectrum/s2/icons/Link';
import type { MCPServer } from '../../../../shared/types';

interface ActionsErrorDisplayProps {
  error: string | null;
  selectedServer: MCPServer | null;
  connecting: boolean;
  onConnect: () => void;
}

export default function ActionsErrorDisplay({
  error,
  selectedServer,
  connecting,
  onConnect
}: ActionsErrorDisplayProps) {
  // Show error banner
  if (error) {
    return (
      <div
        className={style({
          borderWidth: 1,
          padding: 16
        })}
        style={{ borderColor: 'inherit', borderRadius: '8px' }}
      >
        <div className={style({ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'center' })}>
          <StatusLight variant="negative">Error</StatusLight>
          <span className="error-banner-text">{error}</span>
        </div>
      </div>
    );
  }

  // Show disconnected notice
  if (selectedServer && selectedServer.status !== 'connected') {
    return (
      <div
        className={style({
          borderWidth: 1,
          padding: 16,
          backgroundColor: 'orange-100'
        })}
        style={{ borderRadius: '8px' }}
      >
        <div className={style({ display: 'flex', flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'space-between' })}>
          <div className={style({ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', flexGrow: 1 })}>
            <StatusLight variant="notice">Notice</StatusLight>
            <span className={style({ color: 'gray-900' })}>
              <strong>{selectedServer.name}</strong> is not connected. Would you like to connect to this server to view available actions?
            </span>
          </div>
          <Button
            variant="accent"
            onPress={onConnect}
            isDisabled={connecting}
          >
            <Connect />
            <span>{connecting ? 'Connecting...' : 'Connect'}</span>
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
