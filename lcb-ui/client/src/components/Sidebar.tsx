import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ToggleButton, Divider, TooltipTrigger, Tooltip, Button, ProgressCircle, Switch, DialogContainer, Dialog, AlertDialog, Content, Text } from '@react-spectrum/s2';
import {style} from '@react-spectrum/s2/style' with {type: 'macro'};
import { STORAGE_KEYS } from '../constants/storage';
import { safeRemoveSessionStorage } from '../utils/storage';
import GlobeGrid from '@react-spectrum/s2/icons/GlobeGrid';
import Building from '@react-spectrum/s2/icons/Building';
// import FolderOpen from '@react-spectrum/s2/icons/FolderOpen';
// import OpenIn from '@react-spectrum/s2/icons/OpenIn';
import Delete from '@react-spectrum/s2/icons/Delete';
import UserLock from '@react-spectrum/s2/icons/UserLock';
import FullScreenExit from '@react-spectrum/s2/icons/FullScreenExit';
import ReviewLink from '@react-spectrum/s2/icons/ReviewLink';
import MagicWand from '@react-spectrum/s2/icons/MagicWand';
import { toastService } from '../services/toast';
import { imsService } from '../services/ims';
import { useConnectedServer } from '../hooks/useConnectedServer';
import ToolPlannerDialog from './ToolPlannerDialog';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  isDisabled?: boolean;
  disabledTooltip?: string;
  onClick: () => void;
  path?: string | null;
}

function NavItem({ icon: Icon, label, isActive, isDisabled, disabledTooltip, onClick }: NavItemProps) {
  const handlePress = () => {
    // Prevent navigation when disabled
    if (!isDisabled) {
      onClick();
    }
  };

  const button = (
    <ToggleButton
      onPress={handlePress}
      isSelected={isActive}
      isQuiet
      isDisabled={isDisabled}
      UNSAFE_style={{
        width: '100%',
        justifyContent: 'flex-start',
      }}
    >
      <Icon />
      <Text>{label}</Text>
    </ToggleButton>
  );

  if (isDisabled && disabledTooltip) {
    return (
      <TooltipTrigger delay={0}>
        {button}
        <Tooltip>{disabledTooltip}</Tooltip>
      </TooltipTrigger>
    );
  }

  return button;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const connectedServer = useConnectedServer();
  const [hasConnectedServer, setHasConnectedServer] = useState(false);
  const [isCleaningRoom, setIsCleaningRoom] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showMockAuthWarning, setShowMockAuthWarning] = useState(false);
  const [isToolPlannerDialogOpen, setIsToolPlannerDialogOpen] = useState(false);
  const [sandboxMode, setSandboxMode] = useState<boolean>(() => {
    const stored = sessionStorage.getItem(STORAGE_KEYS.SANDBOX_MODE);
    return stored === 'true';
  });
  const [mockAuth, setMockAuth] = useState<boolean>(() => {
    const stored = sessionStorage.getItem(STORAGE_KEYS.MOCK_AUTH_MODE);
    return stored === 'true';
  });

  useEffect(() => {
    // Check if there's a connected server and if it's managed
    const checkConnectedServer = async () => {
      try {
        const { apiClient } = await import('../services/api');
        const servers = await apiClient.getServers();
        const connected = servers.find(s => s.status === 'connected');
        setHasConnectedServer(!!connected);
      } catch (err) {
        setHasConnectedServer(false);
      }
    };

    checkConnectedServer();

    // Listen for server connection changes
    const handleServerStatusChange = () => {
      checkConnectedServer();
    };

    window.addEventListener('lcb-server-selected', handleServerStatusChange);
    window.addEventListener('lcb-server-connected', handleServerStatusChange);
    window.addEventListener('lcb-server-disconnected', handleServerStatusChange);

    // Listen for deployment events
    const handleDeploymentStarted = () => {
      console.log('[Sidebar] Deployment started - disabling navigation links');
      setIsDeploying(true);
    };

    const handleDeploymentCompleted = () => {
      console.log('[Sidebar] Deployment completed - enabling navigation links');
      setIsDeploying(false);
    };

    const handleDeploymentFailed = () => {
      console.log('[Sidebar] Deployment failed - enabling navigation links');
      setIsDeploying(false);
    };

    window.addEventListener('lcb-deployment-started', handleDeploymentStarted);
    window.addEventListener('lcb-deployment-completed', handleDeploymentCompleted);
    window.addEventListener('lcb-deployment-failed', handleDeploymentFailed);

    return () => {
      window.removeEventListener('lcb-server-selected', handleServerStatusChange);
      window.removeEventListener('lcb-server-connected', handleServerStatusChange);
      window.removeEventListener('lcb-server-disconnected', handleServerStatusChange);
      window.removeEventListener('lcb-deployment-started', handleDeploymentStarted);
      window.removeEventListener('lcb-deployment-completed', handleDeploymentCompleted);
      window.removeEventListener('lcb-deployment-failed', handleDeploymentFailed);
    };
  }, []);

  // Check for reopenToolPlanner query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const shouldReopenToolPlanner = searchParams.get('reopenToolPlanner') === 'true';

    if (shouldReopenToolPlanner) {
      searchParams.delete('reopenToolPlanner');
      const newSearch = searchParams.toString();
      const newPath = location.pathname + (newSearch ? `?${newSearch}` : '');
      navigate(newPath, { replace: true });

      setTimeout(() => {
        setIsToolPlannerDialogOpen(true);
      }, 100);
    }
  }, [location.search, location.pathname, navigate]);

  const navItems = [
    { icon: GlobeGrid, label: 'Servers', path: '/lcbs', disabled: false, tooltip: undefined },
    {
      icon: Building,
      label: 'Actions & Widgets',
      path: '/actions',
      disabled: !hasConnectedServer || isDeploying,
      tooltip: isDeploying ? 'Deployment in progress - server unavailable' : !hasConnectedServer ? 'Connect to a server first' : undefined
    },
    {
      icon: MagicWand,
      label: 'Tool Planner',
      path: null,
      onClick: () => setIsToolPlannerDialogOpen(true),
      disabled: !hasConnectedServer || isDeploying,
      tooltip: isDeploying ? 'Deployment in progress - server unavailable' : !hasConnectedServer ? 'Connect to a server first' : undefined
    },
  ];

  const handleCleanRoom = async () => {
    if (isCleaningRoom) return;
    
    try {
      setIsCleaningRoom(true);
      console.log('[Sidebar] Starting clean room cleanup...');
      const { apiClient } = await import('../services/api');

      // Kill any running deployment processes first
      console.log('[Sidebar] Killing any running deployment processes...');
      let hadRunningDeployments = false;
      try {
        const servers = await apiClient.getServers();
        for (const server of servers) {
          const environments = await apiClient.getEnvironments(server.id);
          for (const env of environments) {
            const deployments = await apiClient.getDeployments(env.id);
            const runningDeployment = deployments.find(d => d.status === 'running');
            if (runningDeployment?.sessionId) {
              hadRunningDeployments = true;
              console.log(`[Sidebar] Killing deployment session: ${runningDeployment.sessionId}`);
              try {
                await fetch(`/api/bash/kill/${runningDeployment.sessionId}`, {
                  method: 'POST'
                });
              } catch (killErr) {
                console.warn('[Sidebar] Failed to kill deployment session:', killErr);
              }
            }
          }
        }
        console.log('[Sidebar] ✅ Deployment processes stopped');
        if (hadRunningDeployments) {
          toastService.success('Stopped running deployments');
        }
      } catch (killErr) {
        console.warn('[Sidebar] Failed to kill deployment processes:', killErr);
      }

      // Clear all selection cache keys
      safeRemoveSessionStorage(STORAGE_KEYS.ACTIONS_PAGE_SELECTED_ACTION);
      safeRemoveSessionStorage(STORAGE_KEYS.RESOURCES_PAGE_SELECTED_RESOURCE);
      safeRemoveSessionStorage(STORAGE_KEYS.ENVIRONMENTS_PAGE_SELECTED_ENV);
      toastService.success('Cleared selections');

      // Call the cleanup endpoint
      await apiClient.cleanRoom();
      toastService.success('Cleared database');

      console.log('[Sidebar] Clean room cleanup completed');
      toastService.success('✅ Clean room completed');

      // Navigate to LCBs page after a short delay to show the toast
      setTimeout(() => {
        navigate('/lcbs');
        // Reload the page after navigation to trigger re-init
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }, 1000);
    } catch (error) {
      console.error('[Sidebar] Failed to clean room:', error);
      toastService.error('Failed to clean room');
      setIsCleaningRoom(false);
    }
  };

  const handleClearCache = () => {
    if (isClearingCache) return;
    
    try {
      setIsClearingCache(true);
      
      // Count sessionStorage items BEFORE clearing
      const sessionStorageCount = sessionStorage.length;

      // Clear sessionStorage
      sessionStorage.clear();

      // Clear localStorage (only app-related keys)
      // Get all keys and remove only lcb-related ones
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('lcb-') || key.startsWith('localforage'))) {
          keysToRemove.push(key);
        }
      }

      // Remove collected keys
      keysToRemove.forEach(key => localStorage.removeItem(key));

      const totalCleared = keysToRemove.length + sessionStorageCount;
      console.log('[Sidebar] Browser cache cleared successfully');
      console.log('[Sidebar] Cleared localStorage keys:', keysToRemove);
      console.log('[Sidebar] Cleared sessionStorage items:', sessionStorageCount);
      console.log('[Sidebar] Total items cleared:', totalCleared);

      toastService.success(`Browser cache cleared (${totalCleared} items)`);

      // Reload the page after a short delay to show the toast
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('[Sidebar] Failed to clear browser cache:', error);
      toastService.error('Failed to clear browser cache');
      setIsClearingCache(false);
    }
  };

  const handleSandboxToggle = (isSelected: boolean) => {
    setSandboxMode(isSelected);
    sessionStorage.setItem(STORAGE_KEYS.SANDBOX_MODE, String(isSelected));
  };

  const handleMockAuthToggle = (isSelected: boolean) => {
    if (isSelected) {
      // Trying to enable mock auth
      if (imsService.hasRealAuthentication()) {
        // Show warning dialog instead of enabling
        setShowMockAuthWarning(true);
        return; // Don't change toggle state yet
      }
      // Safe to enable mock
      imsService.enableMockAuth();
      setMockAuth(true);
      toastService.success('Mock authentication enabled');
    } else {
      // Disabling mock auth
      imsService.disableMockAuth();
      setMockAuth(false);
      toastService.info('Mock authentication disabled');
    }
  };

  const handleEnableMockAuthOverride = () => {
    // User confirmed they want to override real auth with mock
    imsService.enableMockAuth();
    setMockAuth(true);
    setShowMockAuthWarning(false);
    toastService.success('Mock authentication enabled (overriding real session)');
  };

  const handleCancelMockAuth = () => {
    // User cancelled, keep toggle off
    setShowMockAuthWarning(false);
    setMockAuth(false);
  };

  const handleLogout = () => {
    console.log('[Sidebar] Performing complete logout');

    // Call IMS service logout (clears ALL tokens)
    imsService.logout();

    // Update UI state
    setMockAuth(false);

    // Show toast notification
    toastService.success('Logged out successfully');

    // Redirect to LCBs page
    navigate('/lcbs');
  };

  return (
    <>
      <div
        className={style({
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '[100%]',
          padding: 12,
          width: 250,
          boxSizing: 'border-box',
          borderEndWidth: 1,
          borderEndColor: 'gray-200',
          overflow: 'auto',
          backgroundColor: 'layer-1'
        })}
      >
      <div>
        <div className={style({ paddingY: 16 })}>
          <nav className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
            {navItems.map((item) => (
              <NavItem
                key={item.path || item.label}
                icon={item.icon}
                label={item.label}
                isActive={item.path ? location.pathname === item.path : false}
                isDisabled={item.disabled}
                disabledTooltip={item.tooltip}
                onClick={item.onClick || (() => item.path && navigate(item.path))}
                path={item.path}
              />
            ))}
          </nav>
          <Divider size="S" UNSAFE_style={{ marginTop: '16px', marginBottom: '8px' }} />
          <nav className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
            <NavItem
              icon={ReviewLink}
              label="Review Changes"
              isActive={location.pathname === '/review-changes'}
              isDisabled={!hasConnectedServer || isDeploying}
              disabledTooltip={isDeploying ? 'Deployment in progress - server unavailable' : !hasConnectedServer ? 'Connect to a server first' : undefined}
              onClick={() => navigate('/review-changes')}
            />
          </nav>
        </div>
      </div>

      {/* Debug Section */}
      <div className={style({ padding: 8 })}>
        <Divider size="S" />
        <Text styles={style({ marginY: 8, font: 'body-sm', color: 'gray-700', fontWeight: 'bold', display: 'block' })}>
          DEBUG
        </Text>
          <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
            <Button
              variant="secondary"
              onPress={() => setShowAuthDialog(true)}
              styles={style({ width: '[100%]' })}
              UNSAFE_style={{ justifyContent: 'flex-start', fontSize: '12px' }}
            >
              <UserLock />
              <Text>Check AuthN</Text>
            </Button>
            <Button
              variant="secondary"
              onPress={handleLogout}
              isDisabled={!imsService.isAuthenticated()}
              styles={style({ width: '[100%]' })}
              UNSAFE_style={{
                justifyContent: 'flex-start',
                fontSize: '12px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '16px'
              }}
            >
              <FullScreenExit />
              <Text>Logout</Text>
            </Button>
            <Button
              variant="secondary"
              onPress={handleCleanRoom}
              isDisabled={isCleaningRoom || isClearingCache}
              styles={style({ width: '[100%]' })}
              UNSAFE_style={{ justifyContent: 'flex-start', fontSize: '12px' }}
            >
              {isCleaningRoom ? (
                <>
                  <ProgressCircle aria-label="Cleaning" isIndeterminate size="S" />
                  <Text>Cleaning...</Text>
                </>
              ) : (
                <>
                  <Delete />
                  <Text>Clean Room</Text>
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              onPress={handleClearCache}
              isDisabled={isCleaningRoom || isClearingCache}
              styles={style({ width: '[100%]' })}
              UNSAFE_style={{ justifyContent: 'flex-start', fontSize: '12px' }}
            >
              {isClearingCache ? (
                <>
                  <ProgressCircle aria-label="Clearing" isIndeterminate size="S" />
                  <Text>Clearing...</Text>
                </>
              ) : (
                <>
                  <Delete />
                  <Text>Clear Browser Cache</Text>
                </>
              )}
            </Button>
            <Switch isSelected={mockAuth} onChange={handleMockAuthToggle}>
              Mock AuthN
            </Switch>
            <Switch isSelected={sandboxMode} onChange={handleSandboxToggle}>
              Sandbox
            </Switch>
          </div>
        </div>
      </div>

      {/* Mock AuthN Warning Dialog */}
      <DialogContainer onDismiss={handleCancelMockAuth}>
        {showMockAuthWarning && (
          <AlertDialog
            variant="warning"
            title="Real Authentication Active"
            primaryActionLabel="Enable Mock"
            secondaryActionLabel="Cancel"
            onPrimaryAction={handleEnableMockAuthOverride}
            onSecondaryAction={handleCancelMockAuth}
          >
            You are currently authenticated with Adobe IMS. Enabling mock authentication will temporarily override your real session. Are you sure you want to continue?
          </AlertDialog>
        )}
      </DialogContainer>

      {/* Authentication Check Dialog */}
      <DialogContainer onDismiss={() => setShowAuthDialog(false)}>
        {showAuthDialog && (
          <Dialog isDismissible>
            <Text slot="title">Authentication Status</Text>
            <Divider />
            <Content>
              <div className={style({ padding: 16 })}>
                <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
                  <div>
                    <Text>
                      <strong>Status:</strong> {imsService.isAuthenticated()
                        ? (imsService.isMockMode() ? '✅ Authenticated (🔧 MOCK MODE)' : '✅ Authenticated')
                        : '❌ Not Authenticated'}
                    </Text>
                  </div>

                  {imsService.isMockMode() && (
                    <div
                      className={style({
                        padding: 16,
                        backgroundColor: 'yellow-200',
                        borderRadius: 'default',
                        borderWidth: 1,
                        borderColor: 'yellow-900'
                      })}
                    >
                      <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                        <Text><strong>⚠️ Mock Authentication Active</strong></Text>
                        <Text styles={style({ font: 'body-sm', color: 'gray-700' })}>
                          This is simulated authentication for testing purposes. Not a real Adobe IMS token.
                        </Text>
                      </div>
                    </div>
                  )}

                  {imsService.isAuthenticated() && (() => {
                    const token = imsService.getAccessToken();
                    if (!token) return null;

                    const expireDate = new Date(token.expire);
                    const now = new Date();
                    const isExpired = expireDate < now;
                    const timeRemaining = expireDate.getTime() - now.getTime();
                    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
                    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

                    return (
                      <>
                        <Divider size="S" />
                        <div>
                          <Text><strong>Expiration:</strong> {expireDate.toLocaleString()}</Text>
                        </div>
                        <div>
                          <Text>
                            <strong>Time Remaining:</strong>{' '}
                            {isExpired ? '⚠️ Expired' : `${hoursRemaining}h ${minutesRemaining}m`}
                          </Text>
                        </div>
                        {token.userId && (
                          <div>
                            <Text><strong>User ID:</strong> {token.userId}</Text>
                          </div>
                        )}
                        {token.sid && (
                          <div>
                            <Text><strong>Session ID:</strong> {token.sid}</Text>
                          </div>
                        )}
                        <Divider size="S" />
                        <div>
                          <Text><strong>Access Token:</strong></Text>
                          <div
                            className={style({
                              padding: 8,
                              marginTop: 8,
                              backgroundColor: 'gray-100',
                              borderRadius: 'default',
                              font: 'code-xs',
                              wordBreak: 'break-all',
                              maxHeight: '[200px]',
                              overflowY: 'auto',
                              borderWidth: 1,
                              borderColor: 'gray-300'
                            })}
                          >
                            {token.token}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {!imsService.isAuthenticated() && (
                    <div>
                      <Text>No active authentication session. Sign in via Tool Planner to authenticate.</Text>
                    </div>
                  )}
                </div>
              </div>
            </Content>
          </Dialog>
        )}
      </DialogContainer>

      {/* Tool Planner Dialog */}
      <ToolPlannerDialog
        isOpen={isToolPlannerDialogOpen}
        onClose={() => setIsToolPlannerDialogOpen(false)}
        serverId={connectedServer?.id || null}
        connectedServer={connectedServer}
        onActionsCreated={() => {
          // Navigate to actions page to show newly created actions
          navigate('/actions');
          // Show success message
          toastService.success('Actions created successfully! They are ready to be deployed.');
        }}
      />
    </>
  );
}
