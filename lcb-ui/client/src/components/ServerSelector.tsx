import { useNavigate } from 'react-router-dom';
import { DialogTrigger, Button, Popover, DialogContainer, AlertDialog, Text, ProgressCircle, Divider } from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import ChevronDown from '@react-spectrum/s2/icons/ChevronDown';
import Settings from '@react-spectrum/s2/icons/Settings';
import Checkmark from '@react-spectrum/s2/icons/Checkmark';
import ServerBadge from './ServerBadge';
import ServerStatusIndicator from './ServerStatusIndicator';
import { useServerSelector } from '../hooks/useServerSelector';

export default function ServerSelector() {
  const navigate = useNavigate();
  const {
    servers,
    connectedServer,
    isLoading,
    isConnecting,
    needsConfirmation,
    pendingServerId,
    connectToServer,
    confirmSwitch,
    cancelSwitch
  } = useServerSelector();

  const pendingServer = servers.find(s => s.id === pendingServerId);

  const handleServerSelect = (serverId: string) => {
    if (serverId === 'manage') {
      navigate('/lcbs');
      return;
    }

    connectToServer(serverId);
  };

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  };

  return (
    <>
      <DialogTrigger>
        <Button
          variant="secondary"
          isDisabled={isLoading || isConnecting}
          aria-label="Select server"
          UNSAFE_style={{ minWidth: '280px', justifyContent: 'space-between' }}
        >
          <div className={style({ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 })}>
            {isLoading || isConnecting ? (
              <>
                <ProgressCircle size="S" isIndeterminate aria-label="Loading servers" />
                <Text styles={style({ font: 'body-sm', color: 'gray-600', fontStyle: 'italic', truncate: true })}>
                  {isConnecting ? 'Connecting...' : 'Loading...'}
                </Text>
              </>
            ) : connectedServer ? (
              <>
                <ServerStatusIndicator status="connected" size="M" />
                <Text styles={style({ font: 'body-sm', fontWeight: 'medium', truncate: true })}>
                  {connectedServer.name}
                </Text>
                <ServerBadge serverType={connectedServer.serverType} size="S" />
              </>
            ) : (
              <>
                <ServerStatusIndicator status="disconnected" size="M" />
                <Text styles={style({ font: 'body-sm', color: 'gray-600', fontStyle: 'italic' })}>
                  No server connected
                </Text>
              </>
            )}
          </div>
          <ChevronDown />
        </Button>
        <Popover hideArrow placement="bottom end">
          <div className={style({ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 0 })}>
            {/* Server list with custom styling */}
            {servers.length === 0 && !isLoading ? (
              <div className={style({ padding: 16, textAlign: 'center' })}>
                <Text styles={style({ font: 'body', color: 'gray-600' })}>
                  No servers available
                </Text>
              </div>
            ) : (
              servers.map((server) => (
                <div
                  key={server.id}
                  onClick={() => handleServerSelect(server.id)}
                  className={style({
                    paddingX: 16,
                    paddingY: 12,
                    cursor: 'pointer',
                  })}
                  style={{
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--spectrum-global-color-gray-100)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}>
                    <div className={style({ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' })}>
                      <div className={style({ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 })}>
                        <ServerStatusIndicator status={server.status} size="M" />
                        <div className={style({ font: 'body-sm', fontWeight: 'medium', truncate: true })}>
                          {server.name}
                        </div>
                        <ServerBadge serverType={server.serverType} size="S" />
                      </div>
                      {server.status === 'connected' && (
                        <Checkmark UNSAFE_style={{ color: 'var(--spectrum-global-color-green-600)' }} />
                      )}
                    </div>
                    <div className={style({ font: 'code-xs', color: 'gray-600', truncate: true })}>
                      {truncateUrl(server.url)}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Divider and Manage Servers menu item */}
            <Divider UNSAFE_style={{ marginTop: '4px', marginBottom: '4px' }} />
            <div
              onClick={() => handleServerSelect('manage')}
              className={style({
                paddingX: 16,
                paddingY: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              })}
              style={{
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--spectrum-global-color-gray-100)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Settings />
              <div className={style({ font: 'body-sm' })}>Manage Servers...</div>
            </div>
          </div>
        </Popover>
      </DialogTrigger>

      {/* Confirmation dialog for switching servers */}
      <DialogContainer onDismiss={cancelSwitch}>
        {needsConfirmation && connectedServer && pendingServer && (
          <AlertDialog
            title="Switch Connection"
            variant="confirmation"
            primaryActionLabel="Connect"
            cancelLabel="Cancel"
            onPrimaryAction={confirmSwitch}
            onCancel={cancelSwitch}
          >
            The <strong>{connectedServer.name}</strong> server is already connected.
            Connecting to <strong>{pendingServer.name}</strong> will disconnect from{' '}
            <strong>{connectedServer.name}</strong>.
          </AlertDialog>
        )}
      </DialogContainer>
    </>
  );
}

