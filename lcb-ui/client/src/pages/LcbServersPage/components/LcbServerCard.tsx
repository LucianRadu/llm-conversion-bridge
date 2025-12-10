import { useState } from 'react';
import {
  Button,
  ActionMenu,
  MenuItem,
  DialogTrigger,
  AlertDialog,
  Badge,
  ProgressCircle,
  StatusLight,
  Text
} from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Checkmark from '@react-spectrum/s2/icons/Checkmark';
import type { MCPServer } from '../../../../../shared/types';
import { formatLastConnected } from '../utils/serverUtils';

interface LcbServerCardProps {
  server: MCPServer;
  onDelete: (id: string) => void;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onEdit?: (id: string) => void;
  isConnectionOperationInProgress?: boolean;
}

export default function LcbServerCard({
  server,
  onDelete,
  onConnect,
  onDisconnect,
  onEdit,
  isConnectionOperationInProgress = false
}: LcbServerCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isConnected = server.status === 'connected';

  return (
    <div
      className={style({
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'gray-200',
        borderRadius: 'lg',
        backgroundColor: 'base',
        overflow: 'hidden',
        height: 'full',
        width: 'full'
      })}
      style={{
        transition: 'all 0.2s ease',
        boxShadow: isHovered 
          ? '0 4px 12px rgba(0, 0, 0, 0.15)' 
          : '0 1px 3px rgba(0, 0, 0, 0.1)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        borderColor: isConnected ? '#2680EB' : undefined
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header */}
      <div className={style({ padding: 20 })}>
        <div 
          className={style({ display: 'flex', gap: 12, marginBottom: 8 })}
          style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <div className={style({ display: 'flex', alignItems: 'center', gap: 12, flex: 1 })} style={{ minWidth: 0 }}>
            <Text 
              styles={style({ 
                font: 'heading', 
                fontWeight: 'bold'
              })}
            >
              {server.name}
            </Text>
            {isConnected && (
              <Checkmark UNSAFE_style={{ flexShrink: 0, color: 'var(--spectrum-global-color-blue-600)' }} aria-label="Connected" />
            )}
            {/* Server status indicator (for managed servers) */}
            {(server.serverType === 'local-managed' || server.serverType === 'remote-managed') && (
              <StatusLight 
                variant={server.processState === 'started' ? 'positive' : 'neutral'}
                size="S"
              >
                {server.processState === 'started' ? 'Running' : 'Stopped'}
              </StatusLight>
            )}
          </div>

          {/* Action Menu - always visible */}
          <ActionMenu>
            <MenuItem onAction={() => onEdit?.(server.id)}>Edit</MenuItem>
            {(server.serverType !== 'local-managed' && server.serverType !== 'remote-managed') && (
              <DialogTrigger>
                <MenuItem>Delete</MenuItem>
                <AlertDialog
                  title="Delete Server"
                  variant="destructive"
                  primaryActionLabel="Delete"
                  cancelLabel="Cancel"
                  onPrimaryAction={() => onDelete(server.id)}
                >
                  Are you sure you want to delete "{server.name}"? This action cannot be undone.
                </AlertDialog>
              </DialogTrigger>
            )}
          </ActionMenu>
        </div>

        {/* Description */}
        {server.description && (
          <Text 
            styles={style({ 
              font: 'body-sm',
              color: 'gray-700'
            })}
            UNSAFE_style={{ 
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {server.description}
          </Text>
        )}
      </div>

      {/* Card Body */}
      <div className={style({ padding: 20 })}>
        

        {/* Status and Badges Section */}
        <div 
          className={style({ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12,
            marginBottom: 16
          })}
        >
          <StatusLight
            variant={server.status === 'connected' ? 'positive' : server.status === 'connecting' ? 'notice' : 'neutral'}
            size="S"
          >
            {server.status === 'connected' ? 'Connected' : server.status === 'connecting' ? 'Connecting' : 'Disconnected'}
          </StatusLight>
          {server.serverType === 'local-managed' && (
            <Badge variant="informative" UNSAFE_style={{ fontSize: '11px' }}>LOCAL</Badge>
          )}
          {server.serverType === 'remote-managed' && (
            <Badge variant="neutral" UNSAFE_style={{ fontSize: '11px' }}>REMOTE</Badge>
          )}
          {server.serverType === 'remote-external' && (
            <Badge variant="neutral" UNSAFE_style={{ fontSize: '11px' }}>EXTERNAL</Badge>
          )}
        </div>

        {/* Metadata Section */}
        <div className={style({ marginBottom: 20 })}>
          <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
            <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
              <Text styles={style({ font: 'body-sm', color: 'gray-600', fontWeight: 'medium' })}>
                URL
              </Text>
              <Text styles={style({ font: 'body', color: 'gray-800' })} UNSAFE_style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                {server.url}
              </Text>
            </div>
            
            <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
              <Text styles={style({ font: 'body-sm', color: 'gray-600', fontWeight: 'medium' })}>
                Last Connected
              </Text>
              <Text styles={style({ font: 'body', color: 'gray-800' })}>
                {formatLastConnected(server.lastConnectedAt)}
              </Text>
            </div>
            
            {server.command && (
              <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                <Text styles={style({ font: 'body-sm', color: 'gray-600', fontWeight: 'medium' })}>
                  Command
                </Text>
                <Text styles={style({ font: 'body', color: 'gray-800' })} UNSAFE_style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                  {server.command}
                </Text>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className={style({ display: 'flex', flexDirection: 'column', gap: 12, width: 'full' })}>
          {/* Connect/Disconnect button */}
          {server.status === 'connected' ? (
            <Button
              variant="secondary"
              onPress={() => onDisconnect(server.id)}
              isDisabled={isConnectionOperationInProgress}
              styles={style({ width: 'full' })}
            >
              <Text>Disconnect</Text>
            </Button>
          ) : (
            <Button
              variant="accent"
              onPress={() => onConnect(server.id)}
              isDisabled={isConnectionOperationInProgress}
              styles={style({ width: 'full' })}
            >
              {server.status === 'connecting' && (
                <ProgressCircle aria-label="Connecting" isIndeterminate size="S" />
              )}
              <Text>{server.status === 'connecting' ? 'Connecting...' : 'Connect'}</Text>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
