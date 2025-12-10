import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Button,
  Text,
  ActionButton,
  ProgressCircle,
  AlertDialog,
  DialogTrigger,
  Dialog,
  DialogContainer,
  Content,
  Divider,
  TextField,
  TextArea,
  Form,
  Heading,
  TooltipTrigger,
  Tooltip,
  Checkbox,
  Tabs,
  TabList,
  Tab,
  TabPanel
} from '@react-spectrum/s2';
import Edit from '@react-spectrum/s2/icons/Edit';
import Copy from '@react-spectrum/s2/icons/Copy';
import Checkmark from '@react-spectrum/s2/icons/Checkmark';
import Close from '@react-spectrum/s2/icons/Close';
import InfoCircle from '@react-spectrum/s2/icons/InfoCircle';
import Link from '@react-spectrum/s2/icons/Link';
import AlertDiamond from '@react-spectrum/s2/icons/AlertDiamond';
import type { MCPResource, MCPServer, ResourceContent } from '../../../shared/types';
import { apiClient } from '../services/api';
import type { HistoryEntry } from '../services/history';
import { toastService } from '../services/toast';
import { changelogService } from '../services/changelog';
import ToastContainer from '../components/ToastContainer';
import { STORAGE_KEYS } from '../constants/storage';
import { EVENTS } from '../constants/events';
import { UI } from '../constants/ui';
import { ACTION_META } from '../constants/actionMeta';
import { EDS_WIDGET_META } from '../constants/edsWidgetMeta';
import {
  safeGetSessionStorage,
  safeSetSessionStorage,
  safeRemoveSessionStorage
} from '../utils/storage';
import { handleApiError, ErrorMessages, SuccessMessages } from '../utils/errorHandler';
import { useErrorNotification } from '../hooks/useErrorNotification';
import { useRequireConnectedServer } from '../hooks/useRequireConnectedServer';
import { isLocalManagedServer } from '../utils/serverUtils';
// Import refactored components
// import WidgetResourcesHeader from './WidgetResourcesPage/WidgetResourcesHeader';
import { DomainListEditor } from '../components/DomainListEditor';
// import WidgetResourcesErrorDisplay from './WidgetResourcesPage/WidgetResourcesErrorDisplay';
// import AvailableWidgetResourcesList from './WidgetResourcesPage/AvailableWidgetResourcesList';
// import ReviewResourceDraftsModal from '../components/ReviewResourceDraftsModal';

export default function WidgetResourcesPage() {
  // Require connected server - redirects to /lcbs if not connected
  useRequireConnectedServer();

  // Error notification hook
  const { handleAsync } = useErrorNotification();

  const [resources, setResources] = useState<MCPResource[]>([]);
  const [selectedResource, setSelectedResource] = useState<MCPResource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<MCPResource | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Resource content state
  const [isGettingContent, setIsGettingContent] = useState(false);
  const [resourceContent, setResourceContent] = useState<ResourceContent | null>(null);

  // EDS URL state (for "Edit in EDS" button)
  const [edsUrl, setEdsUrl] = useState<string | null>(null);
  const [edsError, setEdsError] = useState<{ message: string; templatePath?: string } | null>(null);

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<HistoryEntry | null>(null);

  // Copy to clipboard state
  const [copyStatus, setCopyStatus] = useState<{
    request: 'idle' | 'success' | 'error',
    response: 'idle' | 'success' | 'error'
  }>({
    request: 'idle',
    response: 'idle'
  });

  // Dialog form state
  const [formName, setFormName] = useState('');
  const [formUri, setFormUri] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMimeType, setFormMimeType] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Meta fields state
  const [formWidgetDescription, setFormWidgetDescription] = useState('');
  const [formWidgetPrefersBorder, setFormWidgetPrefersBorder] = useState(false);
  const [formWidgetCSPConnectDomains, setFormWidgetCSPConnectDomains] = useState<string[]>([]);
  const [formWidgetCSPResourceDomains, setFormWidgetCSPResourceDomains] = useState<string[]>([]);
  const [formWidgetDomain, setFormWidgetDomain] = useState('');

  // Template URL state
  const [formScriptUrl, setFormScriptUrl] = useState('');
  const [formWidgetEmbedUrl, setFormWidgetEmbedUrl] = useState('');

  // Tab state for Edit dialog
  const [selectedEditTab, setSelectedEditTab] = useState<string>('tab1');

  // Search query for filtering resources
  const [searchQuery, _setSearchQuery] = useState('');

  // Auto-open AEM Resources toggle (default disabled)
  const [autoOpenAEMResources, _setAutoOpenAEMResources] = useState<boolean>(() => {
    const stored = safeGetSessionStorage(STORAGE_KEYS.AUTO_OPEN_AEM_RESOURCES);
    return stored === null ? false : stored === 'true';
  });

  // History modal state
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  
  // Review Drafts modal state
  const [_isReviewDraftsOpen, _setIsReviewDraftsOpen] = useState(false);
  
  // Track draft resource URIs
  const [_draftResourceUris, setDraftResourceUris] = useState<Set<string>>(new Set());

  // AEM Resource modal state
  const [isAEMResourceModalOpen, setIsAEMResourceModalOpen] = useState(false);
  const [aemResourceData, setAEMResourceData] = useState<{
    name: string;
    uri: string;
    htmlContent: string;
  } | null>(null);

  // Save toggle state to sessionStorage
  useEffect(() => {
    safeSetSessionStorage(STORAGE_KEYS.AUTO_OPEN_AEM_RESOURCES, autoOpenAEMResources.toString());
  }, [autoOpenAEMResources]);

  // Reset content when selected resource URI changes (not when _meta is updated)
  useEffect(() => {
    setResourceContent(null);
  }, [selectedResource?.uri]);

  // Scroll to selected resource in the list
  useEffect(() => {
    if (selectedResource) {
      // Wait for DOM to update, then scroll to selected item
      setTimeout(() => {
        const selectedElement = document.querySelector('[role="row"][aria-selected="true"]');
        if (selectedElement) {
          selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, UI.SCROLL_DELAY_MS);
    }
  }, [selectedResource]);

  // Auto-select last history entry when modal opens
  useEffect(() => {
    if (isHistoryDialogOpen && history.length > 0) {
      setSelectedHistoryEntry(history[0]); // history[0] is most recent (highest number)
    }
  }, [isHistoryDialogOpen]);

  // Listen for changelog updates to mark resources as deleted OR reload when changelog is cleared
  useEffect(() => {
    const handleChangelogUpdate = async () => {
      const changelogEntries = await changelogService.getUncommittedEntries();
      
      // If changelog is empty (cleared after deployment), reload resources to clear drafts
      if (changelogEntries.length === 0) {
        console.log('[Widget Resources] Changelog cleared, reloading resources to clear drafts');
        await loadResources(true, false);
        return;
      }
      
      const deletedResourceUris = new Set(
        changelogEntries
          .filter(e => e.type === 'resource_deleted')
          .map(e => e.resourceUri)
      );

      // Update resources with deleted state
      setResources(prevResources =>
        Array.isArray(prevResources) ? prevResources.map(resource => ({
          ...resource,
          deleted: deletedResourceUris.has(resource.uri)
        })) : []
      );
    };

    window.addEventListener('lcb-changelog-updated', handleChangelogUpdate);
    return () => {
      window.removeEventListener('lcb-changelog-updated', handleChangelogUpdate);
    };
  }, []);

  const loadResources = async (forceRefresh = false, clearContent = false) => {
    try {
      // Get the connected server from API
      const servers = await apiClient.getServers();
      const connectedServer = servers.find(s => s.status === 'connected');

      if (!connectedServer) {
        setResources([]);
        setSelectedResource(null);
        setSelectedServer(null);
        setError('No LCB server connected');
        safeRemoveSessionStorage(STORAGE_KEYS.RESOURCES_LOADED_FOR_SERVER);
        return;
      }

      setSelectedServer(connectedServer);
      const serverId = connectedServer.id;

      // Clear content if requested (from refresh button click)
      if (clearContent) {
        setResourceContent(null);
      }

      setLoading(true);
      setError(null);

      // Check if resources already loaded for this server+session combination
      const cacheKey = `${serverId}:${connectedServer.sessionId || 'no-session'}`;
      const sessionLoadedServer = safeGetSessionStorage(STORAGE_KEYS.RESOURCES_LOADED_FOR_SERVER);
      const shouldFetchFromServer = forceRefresh || sessionLoadedServer !== cacheKey;

      // Load resources from MCP server if connected and not already loaded
      let serverResources: MCPResource[] = [];
      if (connectedServer.status === 'connected' && shouldFetchFromServer) {
        try {
          serverResources = await apiClient.getResourcesForServer(serverId);

          // Load actions to correlate widgets with action folders
          const actions = await apiClient.getToolsForServer(serverId);

          console.log('[Widget Resources] Actions loaded for correlation:', actions.length);
          console.log('[Widget Resources] First action structure:', JSON.stringify(actions[0], null, 2));

          // Map resources to action names by matching URIs
          // Actions have _meta["openai/outputTemplate"] that matches widget URIs
          serverResources = serverResources.map(resource => {
            const matchingAction = actions.find(action =>
              action._meta?.[ACTION_META.OUTPUT_TEMPLATE] === resource.uri
            );
            
            console.log('[Widget Resources] Server resource correlation:', {
              uri: resource.uri,
              actionName: matchingAction?.name,
              matchedAction: matchingAction?.name,
              totalActions: actions.length,
              firstActionMeta: actions[0]?._meta
            });
            
            return {
              ...resource,
              actionName: matchingAction?.name || undefined
            };
          });

          // Add resources/list request to history (check for duplicates within 1 second)
          const resourcesListEntry: HistoryEntry = {
            id: Date.now().toString(),
            timestamp: new Date(),
            operationName: 'resources/list',
            request: {
              method: 'resources/list',
              params: {}
            },
            response: {
              resources: serverResources
            }
          };

          setHistory(prev => {
            // Check if last entry is resources/list within 1 second (React StrictMode duplicate)
            if (prev.length > 0) {
              const lastEntry = prev[0];
              const timeDiff = resourcesListEntry.timestamp.getTime() - lastEntry.timestamp.getTime();
              if (lastEntry.operationName === 'resources/list' && timeDiff < UI.HISTORY_DUPLICATE_THRESHOLD_MS) {
                return prev; // Skip duplicate
              }
            }
            return [resourcesListEntry, ...prev];
          });

          // Mark as loaded in sessionStorage
          safeSetSessionStorage(STORAGE_KEYS.RESOURCES_LOADED_FOR_SERVER, cacheKey);
        } catch (err) {
          console.warn('[Widget Resources] Failed to load MCP resources:', err);
        }
      }

      // Load resource drafts and overlay onto live server resources
      const drafts: MCPResource[] = await apiClient.getResourceDrafts(serverId);
      const draftMap = new Map(drafts.map(d => [d.uri, d]));

      // Overlay allowed fields from drafts onto live server resources
      const serverResourcesOverlaid: MCPResource[] = serverResources.map(r => {
        const d = draftMap.get(r.uri);
        if (!d) return r;
        
        const overlaid = {
          ...r,
          name: d.name ?? r.name,
          description: d.description ?? r.description,
          mimeType: d.mimeType ?? r.mimeType,
          actionName: r.actionName, // Preserve actionName from correlation
          _meta: d._meta ?? r._meta, // Overlay _meta from draft
          draft: true
        };
        
        console.log('[Widget Resources] Overlaying draft onto server resource:', {
          uri: r.uri,
          serverActionName: r.actionName,
          draftName: d.name,
          draftDescription: d.description,
          draftMeta: d._meta,
          overlaidActionName: overlaid.actionName
        });
        
        return overlaid;
      });

      // Load widget resources from database (exclude drafts)
      const dbResources: MCPResource[] = (await apiClient.getWidgetResources(serverId)).filter(r => !r.draft);

      // ALWAYS load actions for correlation (needed for both server and DB resources)
      let actions: any[] = [];
      try {
        actions = await apiClient.getToolsForServer(serverId);
        console.log('[Widget Resources] Loaded actions for correlation:', actions.length);
      } catch (err) {
        console.warn('[Widget Resources] Failed to load actions for correlation:', err);
      }

      // Correlate dbResources with actions (same logic as serverResources)
      const dbResourcesWithActionNames = dbResources.map(resource => {
        // Skip if already has actionName
        if (resource.actionName) return resource;

        const matchingAction = actions.find(action =>
          action._meta?.[ACTION_META.OUTPUT_TEMPLATE] === resource.uri
        );
        
        const correlatedResource = {
          ...resource,
          actionName: matchingAction?.name || undefined
        };
        
        console.log('[Widget Resources] DB resource correlation:', {
          uri: resource.uri,
          actionName: correlatedResource.actionName,
          matchedAction: matchingAction?.name
        });
        
        return correlatedResource;
      });

      // Get deleted resource URIs from changelog
      const changelogEntries = await changelogService.getUncommittedEntries();
      const deletedResourceUris = new Set(
        changelogEntries
          .filter(e => e.type === 'resource_deleted')
          .map(e => e.resourceUri)
      );

      // Deduplicate resources by URI: prefer database version (has deployment metadata), fall back to server version
      const resourceMap = new Map<string, MCPResource>();
      
      // Add server resources first
      serverResourcesOverlaid.forEach(r => resourceMap.set(r.uri, r));
      
      // Overlay database resources (overwrites server resources with same URI)
      dbResourcesWithActionNames.forEach(r => resourceMap.set(r.uri, r));
      
      // Convert map back to array and apply deleted flags
      // Check both changelog and database resource's deleted property
      const allResources = Array.from(resourceMap.values()).map(resource => ({
        ...resource,
        deleted: resource.deleted || deletedResourceUris.has(resource.uri)
      }));

      // Sort: newly created resources (deployed === false) first, then alphabetically
      allResources.sort((a, b) => {
        // Newly created resources go first
        if (a.deployed === false && b.deployed !== false) return -1;
        if (a.deployed !== false && b.deployed === false) return 1;
        // Otherwise sort alphabetically by name (or URI if no name)
        const aName = a.name || a.uri;
        const bName = b.name || b.uri;
        return aName.localeCompare(bName);
      });

      setResources(allResources);
      
      // Update draft resource URIs for the "Review Drafts" button count
      // Include: newly created (deployed: false), deleted (deleted: true), and modified (draft: true)
      const draftUris = new Set(
        allResources
          .filter(r => r.deployed === false || r.deleted === true || r.draft === true)
          .map(r => r.uri)
      );
      setDraftResourceUris(draftUris);

      // Try to restore selected resource only on page refresh
      const storedResourceUri = safeGetSessionStorage(STORAGE_KEYS.RESOURCES_PAGE_SELECTED_RESOURCE);
      let resourceToSelect = null;
      if (storedResourceUri) {
        resourceToSelect = allResources.find(r => r.uri === storedResourceUri);
      }

      // Restore selected resource on page refresh (but don't auto-select first resource)
      if (allResources.length > 0 && resourceToSelect) {
        setSelectedResource(resourceToSelect);

        // Automatically fetch content for restored resource
        if (connectedServer.status === 'connected') {
          fetchResourceContent(resourceToSelect, serverId, false, false);
        }
      }
      
      // Return the loaded resources for use by callers
      return allResources;
    } catch (error) {
      handleApiError(error, {
        context: 'loadResources',
        fallback: ErrorMessages.LOAD_RESOURCES,
        setError,
      });
      setResources([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchResourceContent = async (resource: MCPResource, serverId: string, showToast: boolean = true, shouldAutoOpenModal: boolean = true) => {
    setIsGettingContent(true);
    setResourceContent(null);

    try {
      await handleAsync(
        () => apiClient.readWidgetResourceContent(serverId, resource.uri),
        {
          successMessage: showToast ? SuccessMessages.READ_RESOURCE(resource.name || resource.uri) : undefined,
          onSuccess: (result) => {
            console.log('[Widget Resources] Resource content received:', result);

            setResourceContent(result);

            // Update selectedResource with _meta from the response
            // BUT: Don't overwrite _meta if the resource has uncommitted draft changes
            if (Array.isArray(result) && result.length > 0 && result[0]._meta) {
              setSelectedResource(prev => {
                if (!prev) return prev;
                
                // If resource has a draft, keep the draft _meta (don't overwrite with server _meta)
                if (prev.draft === true) {
                  console.log('[Widget Resources] Skipping _meta update for draft resource');
                  return prev;
                }
                
                // Otherwise, update with server _meta
                return {
                ...prev,
                _meta: result[0]._meta
                };
              });
            }

            // Add to history
            const newEntry: HistoryEntry = {
              id: Date.now().toString(),
              timestamp: new Date(),
              operationName: 'resources/read',
              request: {
                method: 'resources/read',
                params: {
                  uri: resource.uri
                }
              },
              response: result
            };

            // Add to history with duplicate prevention (check for same resource within 1 second)
            setHistory(prev => {
              if (prev.length > 0) {
                const lastEntry = prev[0];
                const timeDiff = newEntry.timestamp.getTime() - lastEntry.timestamp.getTime();
                if (lastEntry.operationName === 'resources/read' &&
                    lastEntry.request.params.uri === resource.uri &&
                    timeDiff < UI.HISTORY_DUPLICATE_THRESHOLD_MS) {
                  return prev; // Skip duplicate
                }
              }
              return [newEntry, ...prev];
            });

            // Check if auto-open AEM Resources is enabled and resource has HTML content
            if (shouldAutoOpenModal && autoOpenAEMResources && Array.isArray(result) && result.length > 0 && result[0].text) {
              setAEMResourceData({
                name: resource.name || resource.uri,
                uri: resource.uri,
                htmlContent: result[0].text
              });
              setIsAEMResourceModalOpen(true);
            }
          },
          onError: (error) => {
            const errorMessage = error.message;
            setResourceContent({ error: errorMessage });
          },
          errorContext: ErrorMessages.READ_RESOURCE
        }
      );
    } finally {
      setIsGettingContent(false);
    }
  };

  // Load connected server and resources on mount and when server changes
  useEffect(() => {
    // Detect if this is a page refresh vs navigation
    const navigationType = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const isBrowserReload = navigationType?.type === 'reload';
    const hasStoredSelection = safeGetSessionStorage(STORAGE_KEYS.RESOURCES_PAGE_SELECTED_RESOURCE) !== null;
    const isPageRefresh = isBrowserReload && hasStoredSelection;

    // If NOT a refresh, clear the stored selection (fresh navigation)
    if (!isPageRefresh) {
      safeRemoveSessionStorage(STORAGE_KEYS.RESOURCES_PAGE_SELECTED_RESOURCE);
    }

    // Load resources on mount
    loadResources(false);

    // Listen for server connection to load resources
    const handleServerConnected = () => {
      loadResources(true); // Force refresh on connect
    };

    // Listen for server disconnection to clear cache
    const handleServerDisconnected = () => {
      safeRemoveSessionStorage(STORAGE_KEYS.RESOURCES_LOADED_FOR_SERVER);
      safeRemoveSessionStorage(STORAGE_KEYS.RESOURCES_PAGE_SELECTED_RESOURCE);
      setHistory([]);
      setResources([]);
      setSelectedResource(null);
    };

    window.addEventListener(EVENTS.SERVER_CONNECTED, handleServerConnected);
    window.addEventListener(EVENTS.SERVER_DISCONNECTED, handleServerDisconnected);

    return () => {
      window.removeEventListener(EVENTS.SERVER_CONNECTED, handleServerConnected);
      window.removeEventListener(EVENTS.SERVER_DISCONNECTED, handleServerDisconnected);
    };
  }, []);

  // Reload resources when navigating back to this page
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === '/widget-resources') {
      // On every navigation TO widget-resources page, force reload
      loadResources(true); // Force refresh to bypass cache
    } else {
      // When navigating AWAY from widget-resources page, clear the cache
      safeRemoveSessionStorage(STORAGE_KEYS.RESOURCES_LOADED_FOR_SERVER);
    }
  }, [location.pathname]);

  const handleResourceSelection = async (keys: Set<React.Key>) => {
    const resourceUri = Array.from(keys)[0] as string;
    const resource = resources.find(r => r.uri === resourceUri);
    if (resource) {
      setSelectedResource(resource);
      // Store selected resource for refresh restoration
      safeSetSessionStorage(STORAGE_KEYS.RESOURCES_PAGE_SELECTED_RESOURCE, resource.uri);

      // Skip fetching content for DELETED or NOT DEPLOYED resources
      // (they don't exist on the MCP server yet)
      const isDeleted = (resource as any).deleted === true;
      const isNotDeployed = (resource as any).deployed === false;

      if (!isDeleted && !isNotDeployed && selectedServer) {
        // Only fetch content for deployed, non-deleted resources
        await fetchResourceContent(resource, selectedServer.id);
      } else {
        // Clear any previous content for deleted/not-deployed resources
        setResourceContent(null);
        setIsGettingContent(false);
      }

      // Fetch EDS URL for "Edit in EDS" button (graceful handling - show error icon on failure)
      if (selectedServer) {
        const result = await apiClient.getEdsUrlForResource(selectedServer.id, resource.uri);

        if (result.url) {
          setEdsUrl(result.url);
          setEdsError(null);
        } else if (result.error) {
          setEdsUrl(null);
          setEdsError({
            message: result.error,
            templatePath: result.templatePath
          });
        } else {
          setEdsUrl(null);
          setEdsError(null);
        }
      }
    }
  };

  /* TODO: Restore when WidgetResourcesHeader is restored
  const _handleOpenAddDialog = () => {
    // Generate random test data for easier testing
    const randomId = Math.random().toString(36).substring(2, 8);
    setFormName(`Test Widget ${randomId}`);
    setFormUri(`ui://eds-widget/test-widget-${randomId}.html`);
    setFormDescription(`Auto-generated test widget ${randomId} for quick testing and validation`);
    setFormMimeType('text/html+skybridge');
    setFormWidgetDescription(`ChatGPT widget description for test-${randomId}`);
    setFormWidgetPrefersBorder(true);
    setFormWidgetCSPConnectDomains(['api.example.com']);
    setFormWidgetCSPResourceDomains(['cdn.example.com']);
    setFormWidgetDomain('https://web-sandbox.oaiusercontent.com');
    setIsAddDialogOpen(true);
  };
  */

  const handleAddResource = async () => {
    const servers = await apiClient.getServers();
    const connectedServer = servers.find(s => s.status === "connected");
    if (!connectedServer) {
      setError("No LCB server connected");
      return;
    }
    const serverId = connectedServer.id;

    if (!serverId) {
      toastService.error('No LCB server selected');
      return;
    }

    if (!formUri.trim()) {
      toastService.error('URI is required');
      return;
    }

    if (!formDescription.trim()) {
      toastService.error('Description is required (MCP standard field)');
      return;
    }

    const newResource: MCPResource = {
      uri: formUri,
      name: formName || undefined,
      description: formDescription, // MANDATORY - MCP standard description
      mimeType: formMimeType || undefined,
      deployed: false, // Mark as not deployed (newly created)
      _meta: {
        [EDS_WIDGET_META.WIDGET_DESCRIPTION]: formWidgetDescription || undefined,
        [EDS_WIDGET_META.WIDGET_PREFERS_BORDER]: formWidgetPrefersBorder,
        [EDS_WIDGET_META.WIDGET_CSP]: (formWidgetCSPConnectDomains.length > 0 || formWidgetCSPResourceDomains.length > 0) ? {
          [EDS_WIDGET_META.CSP_CONNECT_DOMAINS]: formWidgetCSPConnectDomains,
          [EDS_WIDGET_META.CSP_RESOURCE_DOMAINS]: formWidgetCSPResourceDomains
        } : undefined,
        [EDS_WIDGET_META.WIDGET_DOMAIN]: formWidgetDomain || undefined
      }
    };

    // Check if resource with same URI already exists
    if (resources.find(r => r.uri === newResource.uri)) {
      toastService.error(`Resource with URI "${newResource.uri}" already exists`);
      return;
    }

    setIsSaving(true);

    try {
      await handleAsync(
        () => apiClient.addWidgetResource(serverId, newResource),
        {
          successMessage: SuccessMessages.ADD_RESOURCE(newResource.name || newResource.uri),
          onSuccess: async () => {
            // Add to changelog
            await changelogService.addEntry(
              'resource_added',
              newResource.uri,
              `Resource "${newResource.name || newResource.uri}" created`,
              {
                newValue: newResource
              }
            );

            // Reload resources to update counts and apply proper sorting
            await loadResources(true); // forceRefresh = true

            // Select the new resource after reload
            // Wait a bit for state to update
            setTimeout(() => {
              setSelectedResource(newResource);
            }, 100);

            // Close dialog
            setIsAddDialogOpen(false);
          },
          errorContext: ErrorMessages.ADD_RESOURCE
        }
      );
    } finally {
      setIsSaving(false);
    }
  };

  // URL validation function
  const validateHttpsUrl = (url: string): boolean => {
    if (!url) return true; // Allow empty (optional field)
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Tab validation function for Edit dialog
  const validateEditTab = (tabKey: string): boolean => {
    if (tabKey === 'tab1') {
      if (!formDescription.trim()) {
        toastService.error('Description is required');
        return false;
      }
    }
    if (tabKey === 'tab3') {
      if (formScriptUrl && !validateHttpsUrl(formScriptUrl)) {
        toastService.error('Script URL must be HTTPS');
        return false;
      }
      if (formWidgetEmbedUrl && !validateHttpsUrl(formWidgetEmbedUrl)) {
        toastService.error('Widget Embed URL must be HTTPS');
        return false;
      }
    }
    return true;
  };

  // Handle tab change with validation
  const handleEditTabChange = (key: React.Key) => {
    const currentTab = selectedEditTab;
    if (!validateEditTab(currentTab)) {
      return;
    }
    setSelectedEditTab(key as string);
  };

  const handleEditResource = () => {
    if (selectedResource) {
      console.log('[Widget Resources] Opening edit dialog for resource:', {
        uri: selectedResource.uri,
        draft: selectedResource.draft,
        widget_embed_url: selectedResource._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.WIDGET_EMBED_URL],
        full_meta: selectedResource._meta
      });
      
      setEditingResource(selectedResource);
      setFormName(selectedResource.name || '');
      setFormUri(selectedResource.uri);
      setFormDescription(selectedResource.description || '');

      // Populate meta fields
      setFormWidgetDescription(selectedResource._meta?.[EDS_WIDGET_META.WIDGET_DESCRIPTION] || '');
      setFormWidgetPrefersBorder(selectedResource._meta?.[EDS_WIDGET_META.WIDGET_PREFERS_BORDER] || false);
      setFormWidgetCSPConnectDomains(selectedResource._meta?.[EDS_WIDGET_META.WIDGET_CSP]?.[EDS_WIDGET_META.CSP_CONNECT_DOMAINS] || []);
      setFormWidgetCSPResourceDomains(selectedResource._meta?.[EDS_WIDGET_META.WIDGET_CSP]?.[EDS_WIDGET_META.CSP_RESOURCE_DOMAINS] || []);
      setFormWidgetDomain(selectedResource._meta?.[EDS_WIDGET_META.WIDGET_DOMAIN] || '');

      // Populate Template URLs
      const scriptUrl = selectedResource._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.SCRIPT_URL] || '';
      const widgetEmbedUrl = selectedResource._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.WIDGET_EMBED_URL] || '';
      
      console.log('[Widget Resources] Loading Template URLs:', { scriptUrl, widgetEmbedUrl });
      
      setFormScriptUrl(scriptUrl);
      setFormWidgetEmbedUrl(widgetEmbedUrl);

      // Try to get mimeType from resourceContent first (if available), then from selectedResource
      let mimeType = selectedResource.mimeType || '';
      if (!mimeType && resourceContent && Array.isArray(resourceContent) && resourceContent.length > 0) {
        mimeType = resourceContent[0].mimeType || '';
      }
      setFormMimeType(mimeType);

      // Reset to first tab
      setSelectedEditTab('tab1');

      setIsEditDialogOpen(true);
    }
  };

  const handleSaveResource = async () => {
    if (!editingResource) return;

    const servers = await apiClient.getServers();
    const connectedServer = servers.find(s => s.status === "connected");
    if (!connectedServer) {
      setError("No LCB server connected");
      return;
    }
    const serverId = connectedServer.id;

    if (!serverId) return;

    if (!formUri.trim()) {
      toastService.error('URI is required');
      return;
    }

    if (!formDescription.trim()) {
      toastService.error('Description is required (MCP standard field)');
      return;
    }

    // Validate Template URLs - MANDATORY
    if (!formScriptUrl.trim()) {
      toastService.error('Script URL is required');
      return;
    }
    if (!validateHttpsUrl(formScriptUrl)) {
      toastService.error('Script URL must be HTTPS');
      return;
    }
    if (!formWidgetEmbedUrl.trim()) {
      toastService.error('Widget Embed URL is required');
      return;
    }
    if (!validateHttpsUrl(formWidgetEmbedUrl)) {
      toastService.error('Widget Embed URL must be HTTPS');
      return;
    }

    const updates: Partial<MCPResource> = {
      name: formName || undefined,
      description: formDescription, // MANDATORY - MCP standard description
      mimeType: formMimeType || undefined,
      actionName: editingResource.actionName, // Preserve actionName for deployment
      _meta: {
        [EDS_WIDGET_META.WIDGET_DESCRIPTION]: formWidgetDescription || undefined,
        [EDS_WIDGET_META.WIDGET_PREFERS_BORDER]: formWidgetPrefersBorder,
        [EDS_WIDGET_META.WIDGET_CSP]: (formWidgetCSPConnectDomains.length > 0 || formWidgetCSPResourceDomains.length > 0) ? {
          [EDS_WIDGET_META.CSP_CONNECT_DOMAINS]: formWidgetCSPConnectDomains,
          [EDS_WIDGET_META.CSP_RESOURCE_DOMAINS]: formWidgetCSPResourceDomains
        } : undefined,
        [EDS_WIDGET_META.WIDGET_DOMAIN]: formWidgetDomain || undefined,
        [EDS_WIDGET_META.LCB_WIDGET_META]: (formScriptUrl || formWidgetEmbedUrl) ? {
          [EDS_WIDGET_META.SCRIPT_URL]: formScriptUrl || undefined,
          [EDS_WIDGET_META.WIDGET_EMBED_URL]: formWidgetEmbedUrl || undefined
        } : undefined
      }
    };

    setIsSaving(true);

    try {
      // Save as draft instead of updating directly
      // Note: We use the ORIGINAL URI as the key, not formUri
      await apiClient.upsertResourceDraft(serverId, editingResource.uri, updates);

      // Track changes to standard MCP description
      if (editingResource.description !== formDescription) {
        await changelogService.addEntry(
          'resource_description_changed',
          '', // No actionName for resources
          `Updated MCP description for resource "${editingResource.name || editingResource.uri}"`,
          {
            resourceUri: editingResource.uri,
            oldValue: editingResource.description,
            newValue: formDescription
          }
        );
      }

      // Track changes to OpenAI widget description
      if (editingResource._meta?.[EDS_WIDGET_META.WIDGET_DESCRIPTION] !== formWidgetDescription) {
        await changelogService.addEntry(
          'resource_widget_description_changed',
          '', // No actionName for resources
          `Updated OpenAI widget description for resource "${editingResource.name || editingResource.uri}"`,
          {
            resourceUri: editingResource.uri,
            oldValue: editingResource._meta?.[EDS_WIDGET_META.WIDGET_DESCRIPTION],
            newValue: formWidgetDescription
          }
        );
      }

      // Track changes to Template URLs
      const originalScriptUrl = editingResource._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.SCRIPT_URL] || '';
      const originalWidgetEmbedUrl = editingResource._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.WIDGET_EMBED_URL] || '';

      if (originalScriptUrl !== formScriptUrl) {
        await changelogService.addEntry(
          'resource_script_url_changed',
          '', // No actionName for resources
          `Updated Script URL for resource "${editingResource.name || editingResource.uri}"`,
          {
            resourceUri: editingResource.uri,
            oldValue: originalScriptUrl,
            newValue: formScriptUrl
          }
        );
      }

      if (originalWidgetEmbedUrl !== formWidgetEmbedUrl) {
        await changelogService.addEntry(
          'resource_widget_embed_url_changed',
          '', // No actionName for resources
          `Updated Widget Embed URL for resource "${editingResource.name || editingResource.uri}"`,
          {
            resourceUri: editingResource.uri,
            oldValue: originalWidgetEmbedUrl,
            newValue: formWidgetEmbedUrl
          }
        );
      }

      // Reload resources to show draft and get the refreshed list
      console.log('[Widget Resources] Reloading resources after save...');
      const refreshedResources = await loadResources(true, false);
      console.log('[Widget Resources] Refreshed resources count:', refreshedResources?.length);
      console.log('[Widget Resources] All refreshed resources:', refreshedResources?.map(r => ({
        uri: r.uri,
        draft: r.draft,
        widget_embed_url: r._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.WIDGET_EMBED_URL]
      })));
      
      // Update selectedResource with the refreshed data from DB
      const updatedResource = refreshedResources?.find(r => r.uri === editingResource.uri);
      console.log('[Widget Resources] Found updated resource:', {
        found: !!updatedResource,
        uri: updatedResource?.uri,
        draft: updatedResource?.draft,
        widget_embed_url: updatedResource?._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.WIDGET_EMBED_URL],
        full_meta: JSON.stringify(updatedResource?._meta, null, 2)
      });
      
      if (updatedResource) {
        setSelectedResource(updatedResource);
        console.log('[Widget Resources] Updated selectedResource state');
      }

      toastService.success(SuccessMessages.UPDATE_RESOURCE());
      setIsEditDialogOpen(false);
    } catch (error) {
      handleApiError(error, { context: 'updateResource', fallback: 'Failed to update resource' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResource = async () => {
    if (!selectedResource) return;

    const servers = await apiClient.getServers();
    const connectedServer = servers.find(s => s.status === "connected");
    if (!connectedServer) {
      setError("No LCB server connected");
      return;
    }
    const serverId = connectedServer.id;

    if (!serverId) return;

    const resourceUri = selectedResource.uri;

    await handleAsync(
      () => apiClient.deleteWidgetResource(serverId, resourceUri),
      {
        successMessage: SuccessMessages.DELETE_RESOURCE(),
        onSuccess: () => {
          // Update local state
          const updatedResources = Array.isArray(resources) ? resources.filter(r => r.uri !== resourceUri) : [];
          setResources(updatedResources);

          // Clear selection
          setSelectedResource(null);
        },
      }
    );

    setIsDeleteDialogOpen(false);
  };

  /* TODO: Restore when AvailableWidgetResourcesList is restored
  const _handleRevertResource = async (resourceUri: string, revertType: 'draft' | 'deleted') => {
    const servers = await apiClient.getServers();
    const connectedServer = servers.find(s => s.status === "connected");
    if (!connectedServer) return;

    await handleAsync(
      async () => {
        // Get all entries before deletion
        const entries = await changelogService.getUncommittedEntries();

        if (revertType === 'deleted') {
          // For deleted reversions, find and delete the specific resource_deleted entry
          const entryToDelete = entries.find(
            e => e.resourceUri === resourceUri && e.type === 'resource_deleted'
          );

          if (entryToDelete) {
            await changelogService.deleteEntry(entryToDelete.id);
          }
        } else if (revertType === 'draft') {
          // For draft reversions, delete ALL changelog entries for this resource
          const entriesToDelete = entries.filter(e => e.resourceUri === resourceUri);

          for (const entry of entriesToDelete) {
            await changelogService.deleteEntry(entry.id);
          }

          // Also delete the draft via API (remove from drafts list)
          const drafts = await apiClient.getResourceDrafts(connectedServer.id);
          const updatedDrafts = drafts.filter(d => d.uri !== resourceUri);
          
          // Clear all drafts and re-add the filtered ones (workaround since we don't have deleteResourceDraft)
          await apiClient.clearResourceDrafts(connectedServer.id);
          for (const draft of updatedDrafts) {
            await apiClient.upsertResourceDraft(connectedServer.id, draft.uri, draft);
          }
        }

        // Reload resources to update draft and deleted states
        await loadResources(true, false);

        // If the reverted resource was selected, update selection
        if (selectedResource?.uri === resourceUri) {
          const updatedResource = Array.isArray(resources) ? resources.find(r => r.uri === resourceUri) : null;
          setSelectedResource(updatedResource || null);
        }
      },
      {
        successMessage: revertType === 'deleted' ? `Resource "${resourceUri}" restored` : `Draft changes reverted for "${resourceUri}"`,
        onSuccess: () => {
          // Changelog will be automatically updated via event
        },
        errorContext: 'Failed to revert'
      }
    );
  };
  */

  const clearHistory = () => {
    setHistory([]);
  };

  /* TODO: Restore when WidgetResourcesHeader is restored
  const _handleRefresh = () => {
    safeRemoveSessionStorage(STORAGE_KEYS.RESOURCES_LOADED_FOR_SERVER); // Clear sessionStorage to force refresh
    loadResources(true, true); // Force refresh AND clear content
  };
  */

  const handleCopyToClipboard = async (content: any, type: 'request' | 'response') => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
      setCopyStatus(prev => ({ ...prev, [type]: 'success' }));
      setTimeout(() => {
        setCopyStatus(prev => ({ ...prev, [type]: 'idle' }));
      }, 2000);
    } catch (err) {
      setCopyStatus(prev => ({ ...prev, [type]: 'error' }));
      setTimeout(() => {
        setCopyStatus(prev => ({ ...prev, [type]: 'idle' }));
      }, 2000);
    }
  };

  /* TODO: Restore when WidgetResourcesErrorDisplay is restored
  const _handleConnectServer = async () => {
    if (!selectedServer) return;

    setConnecting(true);
    setError(null);

    // Clear cache and history when connecting
    const serverId = selectedServer.id;
    safeRemoveSessionStorage(STORAGE_KEYS.RESOURCES_LOADED_FOR_SERVER);
    setHistory([]);
    setResources([]);
    setSelectedResource(null);

    try {
      await handleAsync(
        async () => {
          // Connect to server (just initialize MCP session)
          await apiClient.connectServer(serverId);

          // Dispatch event for successful connection
          dispatchAppEvent('SERVER_CONNECTED', { serverId });

          // Reload the page state to reflect connection status
          const servers = await apiClient.getServers();
          const server = servers.find(s => s.id === serverId);
          if (server) {
            setSelectedServer(server);
          }

          // Now load resources since server is connected (force refresh to bypass session cache)
          return await loadResources(true);
        },
        {
          errorContext: ErrorMessages.CONNECT_SERVER,
          onError: () => {
            setError(ErrorMessages.CONNECT_SERVER);
          }
        }
      );
    } finally {
      setConnecting(false);
    }
  };
  */

  /**
   * Filter resources based on search query
   */
  const filteredResources = Array.isArray(resources) ? resources.filter(resource =>
    (resource.name && resource.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (resource.description && resource.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    resource.uri.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div style={{ padding: '24px', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
        {/* Header - TODO: Restore WidgetResourcesHeader component */}
        <div>
          <h2>Widget Resources</h2>
          {selectedServer && <p>Server: {selectedServer.name}</p>}
        </div>

        {/* Error Display - TODO: Restore WidgetResourcesErrorDisplay component */}
        {error && (
          <div style={{ color: 'red', padding: '16px', border: '1px solid red', borderRadius: '8px' }}>
            {error}
          </div>
        )}

        {/* Main content area - Only show when server is connected */}
        {selectedServer && selectedServer.status === 'connected' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: '16px',
            height: 'calc(100% - 100px)',
            overflow: 'hidden'
          }}
        >
          {/* Widget Resources List - TODO: Restore AvailableWidgetResourcesList component */}
          <div style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h3>Resources ({filteredResources.length})</h3>
            {loading && <p>Loading...</p>}
            {!loading && filteredResources.length === 0 && <p>No resources found</p>}
            {!loading && filteredResources.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {filteredResources.map(r => (
                  <li key={r.uri} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                      onClick={() => handleResourceSelection(new Set([r.uri]))}>
                    {r.name || r.uri}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Resource Details - Col 2 */}
          <div
            style={{
              gridColumn: '2',
              overflow: 'auto',
              resize: 'both',
              minWidth: '300px',
              minHeight: '400px',
              border: '1px solid var(--spectrum-global-color-gray-400)',
              borderRadius: '8px',
              padding: '24px',
              backgroundColor: 'var(--spectrum-global-color-gray-50)'
            }}
          >
            {selectedResource ? (
              isGettingContent ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <ProgressCircle aria-label="Getting resource content" isIndeterminate />
                  <Text UNSAFE_style={{ marginTop: '16px' }}>Getting {selectedResource.name || selectedResource.uri}...</Text>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ position: 'sticky', top: '-24px', backgroundColor: '#ffffff', zIndex: 10, padding: '24px 0 8px 0', marginTop: '-24px', marginLeft: '-24px', marginRight: '-24px', paddingLeft: '24px', paddingRight: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Heading level={3} UNSAFE_style={{ margin: 0 }}>{selectedResource.name || selectedResource.uri}</Heading>
                      {!(selectedResource as any).deleted ? (
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                          {/* Edit in EDS button - show for both local and remote managed servers if EDS URL available */}
                          {edsUrl && (
                            <TooltipTrigger delay={0}>
                              <ActionButton
                               
                                aria-label="Edit in EDS"
                                onPress={() => window.open(edsUrl, '_blank')}
                              >
                                <Link />
                              </ActionButton>
                              <Tooltip>Open in EDS: {edsUrl}</Tooltip>
                            </TooltipTrigger>
                          )}

                          {/* Edit in EDS error - show error icon with tooltip */}
                          {!edsUrl && edsError && (
                            <TooltipTrigger delay={0}>
                              <ActionButton
                               
                                aria-label="EDS URL error"
                              >
                                <AlertDiamond />
                              </ActionButton>
                              <Tooltip>
                                <strong>Error:</strong> {edsError.message}
                                {edsError.templatePath && (
                                  <>
                                    <br />
                                    <br />
                                    <strong>Path:</strong> {edsError.templatePath}
                                  </>
                                )}
                              </Tooltip>
                            </TooltipTrigger>
                          )}

                          {/* Edit button - only for local-managed servers */}
                          {isLocalManagedServer(selectedServer) && (
                            <>
                              {/* TODO: Re-enable Delete and Preview buttons when ready */}
                              {/* <ActionButton
                               
                                aria-label="Delete resource"
                                onPress={() => setIsDeleteDialogOpen(true)}
                                isDisabled={!selectedResource || resources.length === 0}
                                UNSAFE_className="delete-button"
                              >
                                <Delete />
                              </ActionButton>
                              <ActionButton
                               
                                aria-label="Preview AEM resource"
                                onPress={() => {
                                  if (aemResourceData) {
                                    setIsAEMResourceModalOpen(true);
                                  }
                                }}
                                isDisabled={!aemResourceData || !resourceContent}
                              >
                                <Preview />
                              </ActionButton> */}
                              <ActionButton
                               
                                aria-label="Edit resource"
                                onPress={handleEditResource}
                                isDisabled={!selectedResource || resources.length === 0}
                              >
                                <Edit />
                              </ActionButton>
                            </>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant="accent"
                          onPress={() => {
                            // Store the action name in session storage for auto-selection
                            if ((selectedResource as any).actionName) {
                              safeSetSessionStorage(STORAGE_KEYS.ACTIONS_PAGE_SELECTED_ACTION, (selectedResource as any).actionName);
                            }
                            // Navigate to Actions page
                            window.location.href = '/actions';
                          }}
                        >
                          Revert from Actions page
                        </Button>
                      )}
                    </div>
                    <hr style={{ margin: '12px 0 0 0', border: 'none', borderTop: '1px solid var(--spectrum-global-color-gray-300)' }} />
                  </div>
                  {/* Show message for deleted resources */}
                  {(selectedResource as any).deleted && (
                    <div
                      style={{
                        border: '1px solid var(--spectrum-global-color-red-600)',
                        borderRadius: '4px',
                        padding: '16px',
                        marginBottom: '16px',
                        backgroundColor: 'var(--spectrum-global-color-red-100)'
                      }}
                    >
                      <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-red-900)' }}>
                        This resource was deleted with its associated action. To restore it, navigate to the Actions page and restore the action.
                      </Text>
                    </div>
                  )}
                  {/* Display standard MCP description */}
                  {selectedResource.description && (
                    <Text UNSAFE_style={{ marginBottom: '16px' }}>
                      {selectedResource.description}
                    </Text>
                  )}
                  <Text UNSAFE_style={{ fontSize: '0.9em', color: '#666', fontFamily: 'monospace' }}>
                    URI: {selectedResource.uri}
                  </Text>

                  {/* Show helpful message for DELETED or NOT DEPLOYED resources */}
                  {((selectedResource as any).deleted === true || (selectedResource as any).deployed === false) && (
                    <div
                      style={{
                        border: '1px solid var(--spectrum-global-color-blue-600)',
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: 'var(--spectrum-global-color-gray-50)',
                        marginTop: '24px'
                      }}
                    >
                      <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-blue-900)' }}>
                        {(selectedResource as any).deleted === true ? (
                          <>
                            <strong>ℹ️ This EDS Widget resource was deleted</strong><br />
                            The resource files will be permanently removed during deployment.
                            You can restore this resource by restoring its associated action from the Actions page.
                          </>
                        ) : (
                          <>
                            <strong>ℹ️ This EDS Widget resource will be available after deployment</strong><br />
                            The resource is saved in the database but hasn't been deployed to the server yet.
                            Click Deploy to generate the widget files and make it available.
                          </>
                        )}
                      </Text>
                    </div>
                  )}

                  {/* Resource Content */}
                  {resourceContent && (
                    <>
                      {'error' in resourceContent ? (
                        <>
                          <Heading level={4} UNSAFE_style={{ marginTop: '24px', marginBottom: '4px' }}>Error</Heading>
                          <div
                            style={{
                              border: '1px solid var(--spectrum-global-color-red-600)',
                              borderRadius: '8px',
                              padding: '16px',
                              backgroundColor: 'var(--spectrum-global-color-gray-50)'
                            }}
                          >
                            <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-red-900)' }}>
                              {resourceContent.error}
                            </Text>
                          </div>
                        </>
                      ) : (
                        <>
                          <Heading level={4} UNSAFE_style={{ marginTop: '24px', marginBottom: '4px' }}>Response</Heading>
                          <div
                            style={{
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              const btn = e.currentTarget.querySelector('.copy-button-resource-content') as HTMLElement;
                              if (btn) btn.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                              const btn = e.currentTarget.querySelector('.copy-button-resource-content') as HTMLElement;
                              if (btn) btn.style.opacity = '0';
                            }}
                          >
                            <div
                              style={{
                                border: '1px solid var(--spectrum-global-color-gray-400)',
                                borderRadius: '4px',
                                padding: '16px',
                                backgroundColor: 'var(--spectrum-global-color-gray-800)',
                                fontFamily: 'monospace',
                                fontSize: '13px',
                                color: 'var(--spectrum-global-color-gray-50)',
                                overflowX: 'auto'
                              }}
                            >
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {JSON.stringify(resourceContent, null, 2)}
                              </pre>
                            </div>
                            <button
                              onClick={() => handleCopyToClipboard(resourceContent, 'response')}
                              className="copy-button-resource-content"
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                opacity: '0',
                                transition: 'opacity 0.2s ease',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff'
                              }}
                            >
                              <span style={{ color: '#ffffff', fill: '#ffffff', display: 'flex' }}>
                                {copyStatus.response === 'success' ? (
                                  <Checkmark />
                                ) : copyStatus.response === 'error' ? (
                                  <Close />
                                ) : (
                                  <Copy />
                                )}
                              </span>
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Text>Select a widget resource to view details</Text>
              </div>
            )}
          </div>

        </div>
        )}

        {/* Delete Resource Confirmation Dialog */}
        <DialogTrigger isOpen={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <ActionButton UNSAFE_style={{ display: 'none' }}>Hidden</ActionButton>
          <AlertDialog
            variant="destructive"
            title="Delete Widget Resource"
            primaryActionLabel="Delete"
            cancelLabel="Cancel"
            onPrimaryAction={handleDeleteResource}
          >
            Are you sure you want to delete the widget resource "{selectedResource?.name || selectedResource?.uri}"?
          </AlertDialog>
        </DialogTrigger>

        {/* Add Widget Resource Dialog */}
        <DialogContainer onDismiss={() => setIsAddDialogOpen(false)}>
          {isAddDialogOpen && (
            <Dialog isDismissible>
              <Heading>Add Widget Resource</Heading>
              <Divider />
              <Content>
                <Form>
                  <TextField
                    label="Name"
                    value={formName}
                    onChange={setFormName}
                    UNSAFE_style={{ width: '100%' }}
                  />
                  <TextField
                    label="URI"
                    value={formUri}
                    onChange={setFormUri}
                    isRequired
                    UNSAFE_style={{ width: '100%' }}
                  />
                  <TextArea
                    label="Description"
                    description="MANDATORY - Standard MCP resource description (displayed in list)"
                    value={formDescription}
                    onChange={setFormDescription}
                    UNSAFE_style={{ width: '100%', height: '100px' }}
                    isRequired
                  />
                  <TextField
                    label="MIME Type"
                    value={formMimeType}
                    onChange={setFormMimeType}
                    UNSAFE_style={{ width: '100%' }}
                    isDisabled
                    isReadOnly
                  />

                  {/* OpenAI Metadata Section */}
                  <Divider UNSAFE_style={{ marginTop: '24px', marginBottom: '16px' }} />
                  <Heading level={4} UNSAFE_style={{ margin: 0, marginBottom: '16px' }}>OpenAI Metadata</Heading>

                  {/* Widget Description (maps to _meta["openai/widgetDescription"]) */}
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                    <TextArea
                      label="Widget Description"
                      description="ChatGPT-specific widget description (OPTIONAL)"
                      value={formWidgetDescription}
                      onChange={setFormWidgetDescription}
                      UNSAFE_style={{ width: '100%', height: '100px' }}
                    />
                    <TooltipTrigger delay={0}>
                      <ActionButton aria-label="Widget Description info">
                        <InfoCircle />
                      </ActionButton>
                      <Tooltip>
                        Human-readable summary surfaced to the model when the component loads, reducing redundant
                        assistant narration.
                      </Tooltip>
                    </TooltipTrigger>
                  </div>

                  {/* Widget Prefers Border */}
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                    <Checkbox
                      isSelected={formWidgetPrefersBorder}
                      onChange={setFormWidgetPrefersBorder}
                    >
                      Prefers Border
                    </Checkbox>
                    <TooltipTrigger delay={0}>
                      <ActionButton aria-label="Prefers Border info">
                        <InfoCircle />
                      </ActionButton>
                      <Tooltip>
                        Hint that the component should render inside a bordered card when supported.
                      </Tooltip>
                    </TooltipTrigger>
                  </div>

                  {/* Widget CSP */}
                  <div style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Text UNSAFE_style={{ fontWeight: 'bold' }}>Widget CSP</Text>
                      <TooltipTrigger delay={0}>
                        <ActionButton aria-label="Widget CSP info">
                          <InfoCircle />
                        </ActionButton>
                        <Tooltip>
                          Define connect_domains and resource_domains arrays for the component's CSP snapshot.
                        </Tooltip>
                      </TooltipTrigger>
                    </div>
                    <DomainListEditor
                      label="Connect Domains"
                      domains={formWidgetCSPConnectDomains}
                      onChange={setFormWidgetCSPConnectDomains}
                    />
                    <DomainListEditor
                      label="Resource Domains"
                      domains={formWidgetCSPResourceDomains}
                      onChange={setFormWidgetCSPResourceDomains}
                    />
                  </div>

                  {/* Widget Domain */}
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                    <TextField
                      label="Widget Domain"
                      value={formWidgetDomain}
                      onChange={setFormWidgetDomain}
                      UNSAFE_style={{ width: '100%' }}
                      placeholder="https://web-sandbox.oaiusercontent.com"
                    />
                    <TooltipTrigger delay={0}>
                      <ActionButton aria-label="Widget Domain info">
                        <InfoCircle />
                      </ActionButton>
                      <Tooltip>
                        Optional dedicated subdomain for hosted components (defaults to
                        https://web-sandbox.oaiusercontent.com).
                      </Tooltip>
                    </TooltipTrigger>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', justifyContent: 'end', marginTop: '24px' }}>
                    <Button variant="secondary" onPress={() => setIsAddDialogOpen(false)} isDisabled={isSaving}>
                      Cancel
                    </Button>
                    <Button variant="accent" onPress={handleAddResource} isDisabled={isSaving}>
                      {isSaving ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                </Form>
              </Content>
            </Dialog>
          )}
        </DialogContainer>

        {/* Edit Widget Resource Dialog */}
        <DialogContainer onDismiss={() => setIsEditDialogOpen(false)}>
          {isEditDialogOpen && (
            <Dialog isDismissible UNSAFE_style={{ width: '70vw' }}>
              <Heading>Edit Widget Resource</Heading>
              <Divider />
              <Content>
                <Tabs selectedKey={selectedEditTab} onSelectionChange={handleEditTabChange}>
                  <TabList>
                    <Tab id="tab1">Basic Info</Tab>
                    <Tab id="tab2">OpenAI Metadata</Tab>
                    <Tab id="tab3">Template URLs</Tab>
                  </TabList>
                    {/* Tab 1: Basic Info (2 columns) */}
                    <TabPanel id="tab1">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '16px' }}>
                        <div>
                <Form>
                  <TextField
                    label="Name"
                    value={formName}
                    onChange={setFormName}
                    UNSAFE_style={{ width: '100%' }}
                              isDisabled
                  />
                  <TextField
                    label="URI"
                    value={formUri}
                    UNSAFE_style={{ width: '100%' }}
                              isDisabled
                  />
                  <TextArea
                    label="Description"
                    description="MANDATORY - Standard MCP resource description (displayed in list)"
                    value={formDescription}
                    onChange={setFormDescription}
                    UNSAFE_style={{ width: '100%', height: '100px' }}
                    isRequired
                  />
                  <TextField
                    label="MIME Type"
                    value={formMimeType}
                    UNSAFE_style={{ width: '100%' }}
                    isDisabled
                  />
                          </Form>
                        </div>
                        <div>
                          {/* Empty right column for future use */}
                        </div>
                      </div>
                    </TabPanel>

                    {/* Tab 2: OpenAI Metadata (2 columns) */}
                    <TabPanel id="tab2">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '16px' }}>
                        <div>
                    <TextArea
                      label="Widget Description"
                      description="ChatGPT-specific widget description (OPTIONAL)"
                      value={formWidgetDescription}
                      onChange={setFormWidgetDescription}
                      UNSAFE_style={{ width: '100%', height: '100px' }}
                    />
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                    <Checkbox
                      isSelected={formWidgetPrefersBorder}
                      onChange={setFormWidgetPrefersBorder}
                    >
                      Prefers Border
                    </Checkbox>
                    <TooltipTrigger delay={0}>
                      <ActionButton aria-label="Prefers Border info">
                        <InfoCircle />
                      </ActionButton>
                      <Tooltip>
                        Hint that the component should render inside a bordered card when supported.
                      </Tooltip>
                    </TooltipTrigger>
                  </div>
                        </div>
                        <div>
                          <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Text UNSAFE_style={{ fontWeight: 'bold' }}>Widget CSP</Text>
                      <TooltipTrigger delay={0}>
                        <ActionButton aria-label="Widget CSP info">
                          <InfoCircle />
                        </ActionButton>
                        <Tooltip>
                          Define connect_domains and resource_domains arrays for the component's CSP snapshot.
                        </Tooltip>
                      </TooltipTrigger>
                    </div>
                    <DomainListEditor
                      label="Connect Domains"
                      domains={formWidgetCSPConnectDomains}
                      onChange={setFormWidgetCSPConnectDomains}
                    />
                    <DomainListEditor
                      label="Resource Domains"
                      domains={formWidgetCSPResourceDomains}
                      onChange={setFormWidgetCSPResourceDomains}
                    />
                  </div>
                    <TextField
                      label="Widget Domain"
                      value={formWidgetDomain}
                      onChange={setFormWidgetDomain}
                      UNSAFE_style={{ width: '100%' }}
                      placeholder="https://web-sandbox.oaiusercontent.com"
                    />
                        </div>
                      </div>
                    </TabPanel>

                    {/* Tab 3: Template URLs (1 column) */}
                    <TabPanel id="tab3">
                      <Form UNSAFE_style={{ marginTop: '16px' }}>
                        <TextField
                          label="Script URL"
                          value={formScriptUrl}
                          onChange={setFormScriptUrl}
                          UNSAFE_style={{ width: '100%' }}
                          placeholder="https://<branch>--<repo>--<owner>.aem.page/scripts/aem-embed.js"
                          description="URL for the widget script (HTTPS required)"
                          isRequired
                        />
                        <TextField
                          label="Widget Embed URL"
                          value={formWidgetEmbedUrl}
                          onChange={setFormWidgetEmbedUrl}
                          UNSAFE_style={{ width: '100%' }}
                          placeholder="https://<branch>--<repo>--<owner>.aem.page/eds-widgets/<action-name>"
                          description="URL for the aem-embed component (HTTPS required)"
                          isRequired
                        />
                      </Form>
                    </TabPanel>
                </Tabs>

                  <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', justifyContent: 'end', marginTop: '24px' }}>
                    <Button variant="secondary" onPress={() => setIsEditDialogOpen(false)} isDisabled={isSaving}>
                      Cancel
                    </Button>
                    <Button variant="accent" onPress={handleSaveResource} isDisabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
              </Content>
            </Dialog>
          )}
        </DialogContainer>

        {/* History Dialog */}
        <DialogContainer onDismiss={() => { setIsHistoryDialogOpen(false); setSelectedHistoryEntry(null); }}>
          {isHistoryDialogOpen && (
            <Dialog UNSAFE_style={{ width: '90vw', maxWidth: '90vw', height: '85vh', maxHeight: '85vh' }}>
              <Heading>
                Request History ({history.length})
              </Heading>
              <Divider />
              <Content>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', height: '60vh', overflow: 'hidden' }}>
                    {/* LEFT: History List (30%) */}
                    <div style={{ width: '30%', borderRight: '1px solid #D3D3D3', overflowY: 'auto', paddingRight: '16px' }}>
                      {history.length === 0 ? (
                        <Text>No request history</Text>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {history.map((entry, index) => (
                            <div
                              key={entry.id}
                              style={{
                                border: selectedHistoryEntry?.id === entry.id ? '2px solid #1473E6' : '1px solid #D3D3D3',
                                borderRadius: '8px',
                                padding: '12px',
                                backgroundColor: selectedHistoryEntry?.id === entry.id ? '#F0F7FF' : 'transparent',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onClick={() => setSelectedHistoryEntry(entry)}
                              onMouseEnter={(e) => {
                                if (selectedHistoryEntry?.id !== entry.id) {
                                  e.currentTarget.style.backgroundColor = '#F5F5F5';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedHistoryEntry?.id !== entry.id) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold' }}>
                                  {history.length - index}. {entry.operationName}
                                </Text>
                                <Text UNSAFE_style={{ fontSize: '11px', color: 'var(--spectrum-global-color-gray-700)' }}>
                                  {entry.timestamp.toLocaleTimeString()}
                                </Text>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* RIGHT: Details (70%) */}
                    <div style={{ width: '70%', overflowY: 'auto', paddingLeft: '16px', maxWidth: '100%' }}>
                      {selectedHistoryEntry ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          {/* Request Section */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-900)', fontWeight: 'bold', fontSize: '14px' }}>
                              Request
                            </Text>
                            <div style={{ position: 'relative' }}>
                              <div
                                style={{
                                  border: '1px solid var(--spectrum-global-color-gray-400)',
                                  borderRadius: '4px',
                                  padding: '16px',
                                  backgroundColor: 'var(--spectrum-global-color-gray-800)',
                                  fontFamily: 'monospace',
                                  fontSize: '12px',
                                  color: 'var(--spectrum-global-color-gray-50)',
                                  overflowX: 'auto',
                                  maxHeight: '25vh',
                                  overflowY: 'auto'
                                }}
                              >
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                  {JSON.stringify(selectedHistoryEntry.request, null, 2)}
                                </pre>
                              </div>
                              <button
                                onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedHistoryEntry.request, null, 2))}
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  right: '8px',
                                  opacity: '0',
                                  transition: 'opacity 0.2s ease',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                              >
                                <span style={{ color: '#ffffff', fill: '#ffffff', display: 'flex' }}>
                                  <Copy />
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Response Section */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-900)', fontWeight: 'bold', fontSize: '14px' }}>
                              Response
                            </Text>
                            <div style={{ position: 'relative' }}>
                              <div
                                style={{
                                  border: '1px solid var(--spectrum-global-color-gray-400)',
                                  borderRadius: '4px',
                                  padding: '16px',
                                  backgroundColor: 'var(--spectrum-global-color-gray-800)',
                                  fontFamily: 'monospace',
                                  fontSize: '12px',
                                  color: 'var(--spectrum-global-color-gray-50)',
                                  overflowX: 'auto',
                                  maxHeight: '45vh',
                                  overflowY: 'auto'
                                }}
                              >
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                  {JSON.stringify(selectedHistoryEntry.response, null, 2)}
                                </pre>
                              </div>
                              <button
                                onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedHistoryEntry.response, null, 2))}
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  right: '8px',
                                  opacity: '0',
                                  transition: 'opacity 0.2s ease',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                              >
                                <span style={{ color: '#ffffff', fill: '#ffffff', display: 'flex' }}>
                                  <Copy />
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Text>Select a history entry to view details</Text>
                      )}
                    </div>
                  </div>

                  {/* Buttons - INSIDE Content at bottom */}
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', justifyContent: 'end', marginTop: '8px' }}>
                    <Button variant="secondary" onPress={() => { setIsHistoryDialogOpen(false); setSelectedHistoryEntry(null); }}>
                      Cancel
                    </Button>
                    <Button variant="accent" onPress={() => { clearHistory(); setSelectedHistoryEntry(null); }} isDisabled={history.length === 0}>
                      Clear
                    </Button>
                  </div>
                </div>
              </Content>
            </Dialog>
          )}
        </DialogContainer>


        {/* AEM Resource Modal */}
        <DialogContainer onDismiss={() => setIsAEMResourceModalOpen(false)}>
          {isAEMResourceModalOpen && aemResourceData && (
            <Dialog UNSAFE_style={{ width: '75vw', maxWidth: '75vw', height: '80vh', maxHeight: '80vh' }}>
              <Heading>{aemResourceData.name}</Heading>
              <Divider />
              <Content UNSAFE_style={{ overflowY: 'auto', padding: 0 }}>
                <iframe
                  srcDoc={aemResourceData.htmlContent}
                  title={aemResourceData.name}
                  style={{
                    width: '100%',
                    height: '70vh',
                    border: 'none',
                    backgroundColor: 'white'
                  }}
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              </Content>
            </Dialog>
          )}
        </DialogContainer>

        {/* Review Resource Drafts Modal - TODO: Restore ReviewResourceDraftsModal component */}
        {/* {selectedServer && (
          <ReviewResourceDraftsModal
            serverId={selectedServer.id}
            isOpen={isReviewDraftsOpen}
            onClose={() => {
              setIsReviewDraftsOpen(false);
              loadResources(true);
            }}
          />
        )} */}

        {/* Toast Container */}
        <ToastContainer />
      </div>
    </div>
  );
}
