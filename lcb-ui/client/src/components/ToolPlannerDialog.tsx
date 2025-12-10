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

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContainer,
  Heading,
  Content,
  Button,
  Text,
  ProgressCircle,
  TextArea,
  Checkbox,
  Tabs,
  TabList,
  Tab,
  TabPanel
} from '@react-spectrum/s2';
import {style} from '@react-spectrum/s2/style' with {type: 'macro'};
import { imsService } from '../services/ims';
import { apiClient } from '../services/api';
import type { MCPTool, MCPResource } from '../../../shared/types';
import { changelogService } from '../services/changelog';
import { toastService } from '../services/toast';
import { ACTION_META } from '../constants/actionMeta';
import { EDS_WIDGET_META } from '../constants/edsWidgetMeta';

interface ToolPlannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string | null;
  connectedServer?: any; // For EDS config
  onActionsCreated?: () => void; // Callback when actions are created
}

interface ParsedAction {
  name: string;
  description: string;
  hasEdsWidget: boolean;
  inputSchema?: any;
  annotations?: {
    destructiveHint?: boolean;
    openWorldHint?: boolean;
    readOnlyHint?: boolean;
  };
  widgetMetadata?: {
    invokingText: string;
    invokedText: string;
    widgetDescription?: string;
    prefersBorder?: boolean;
  };
}

interface ToolPlannerData {
  summary?: {
    domain: string;
    businessGoal: string;
    websiteAnalyzed?: string;
    totalActionsProposed: number;
    generatedAt: string;
  };
  actions: ParsedAction[];
  conversationFlow?: {
    description: string;
    mermaidDiagram?: string;
    steps: any[];
  };
  rationale?: {
    whyMultipleTools: string;
    designPattern: string;
    industryInsights: string[];
  };
}

export default function ToolPlannerDialog({
  isOpen,
  onClose,
  serverId,
  connectedServer,
  onActionsCreated
}: ToolPlannerDialogProps) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);

  // Authentication state
  const [imsLoaded, setImsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Tool Planner state
  const [promptText, setPromptText] = useState('Suggest some tools for bitdefender.com based on what you find on their website.');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [toolPlannerResponse, setToolPlannerResponse] = useState<any>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retrySucceeded, setRetrySucceeded] = useState(false);
  
  // Parsed actions state
  const [parsedData, setParsedData] = useState<ToolPlannerData | null>(null);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [selectedTab, setSelectedTab] = useState<string>('actions');
  
  // Creating actions state
  const [isCreatingActions, setIsCreatingActions] = useState(false);
  const [creationProgress, setCreationProgress] = useState<string>('');

  // Load IMS library and check authentication when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      loadIMS();
    }
  }, [isOpen]);

  // Automatically advance to step 1 after successful authentication (real or mock)
  useEffect(() => {
    if (isOpen && step === 0 && (isAuthenticated || imsService.isMockMode())) {
      console.log('[ToolPlannerDialog] Authentication active, advancing to step 1');
      setStep(1);
    }
  }, [isOpen, isAuthenticated, step]);

  /**
   * Load IMS library and check authentication status
   */
  const loadIMS = async () => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      console.log('[ToolPlannerDialog] Loading IMS library');
      await imsService.loadLibrary();
      setImsLoaded(true);

      // Check if user is already authenticated
      const authenticated = imsService.isAuthenticated();
      setIsAuthenticated(authenticated);

      console.log('[ToolPlannerDialog] IMS loaded, authenticated:', authenticated);
    } catch (error) {
      console.error('[ToolPlannerDialog] Failed to load IMS:', error);
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Failed to load authentication library'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * Handle sign-in button click
   * Saves context and initiates OAuth flow
   */
  const handleSignIn = () => {
    try {
      console.log('[ToolPlannerDialog] Initiating sign-in');

      // Save context for restoration after OAuth redirect
      imsService.signIn({
        returnPath: '/actions',
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[ToolPlannerDialog] Sign-in error:', error);
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Failed to initiate sign-in'
      );
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 0: return 'Authentication';
      case 1: return 'Step 1 - Define Your Goal';
      case 2: return 'Step 2 - Review Suggested Actions';
      case 3: return 'Step 3 - Creating Actions';
      default: return '';
    }
  };
  
  /**
   * Parse the tool planner JSON response
   */
  const parseToolPlannerResponse = (response: any): ToolPlannerData | null => {
    try {
      // Check if response contains output_text with JSON
      let jsonData;
      
      if (response?.response?.payload?.output_text) {
        // Try to parse the output_text as JSON
        const outputText = response.response.payload.output_text;
        
        // Remove markdown code blocks if present
        const jsonMatch = outputText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         outputText.match(/```\s*([\s\S]*?)\s*```/);
        
        if (jsonMatch) {
          jsonData = JSON.parse(jsonMatch[1]);
        } else {
          // Try parsing directly
          jsonData = JSON.parse(outputText);
        }
      } else if (response?.actions) {
        // Already parsed JSON
        jsonData = response;
      }
      
      if (jsonData && jsonData.actions && Array.isArray(jsonData.actions)) {
        console.log('[ToolPlannerDialog] Successfully parsed tool planner data:', jsonData);
        return jsonData as ToolPlannerData;
      }
      
      console.warn('[ToolPlannerDialog] Response does not contain valid actions array');
      return null;
    } catch (error) {
      console.error('[ToolPlannerDialog] Failed to parse tool planner response:', error);
      return null;
    }
  };
  
  /**
   * Handle action selection toggle
   */
  const toggleActionSelection = (actionName: string) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(actionName)) {
      newSelected.delete(actionName);
    } else {
      newSelected.add(actionName);
    }
    setSelectedActions(newSelected);
  };

  const handleBack = () => {
    if (step > 1) {
      const nextStep = (step - 1) as 1 | 2 | 3;
      setStep(nextStep);

      // Reset retry states when returning TO step 2 (from any higher step)
      if (nextStep === 2) {
        setIsRetrying(false);
        setRetrySucceeded(false);
      }
    }
  };

  /**
   * Call the Tool Planner API
   */
  const callToolPlannerAPI = async (isRetryAttempt: boolean = false) => {
    setIsLoadingResponse(true);

    try {
      // Get IMS access token
      const tokenInfo = imsService.getAccessToken();

      if (!tokenInfo || !tokenInfo.token) {
        console.error('[ToolPlannerDialog] No IMS token available');
        setToolPlannerResponse({
          error: 'Authentication Error',
          message: 'No access token available. Please re-authenticate.',
          details: 'IMS token is required to call the Tool Planner API'
        });
        setIsLoadingResponse(false);
        return;
      }

      console.log('[ToolPlannerDialog] Calling Tool Planner API with prompt:', promptText);
      const response = await apiClient.callToolPlanner(promptText, tokenInfo.token);
      setToolPlannerResponse(response);
      console.log('[ToolPlannerDialog] Tool Planner response received:', response);

      // Parse the response
      const parsed = parseToolPlannerResponse(response);
      if (parsed) {
        setParsedData(parsed);
        // Select all actions by default
        setSelectedActions(new Set(parsed.actions.map(a => a.name)));
      } else {
        setParsedData(null);
        setSelectedActions(new Set());
      }

      // Check if retry succeeded
      if (isRetryAttempt && (response.success !== false && !response.response?.payload?.error)) {
        setRetrySucceeded(true);
      }
    } catch (error) {
      console.error('[ToolPlannerDialog] Tool Planner API error:', error);
      // Even on error, the backend should return structured data
      // If we get here, it's a network/frontend error
      setToolPlannerResponse({
        error: 'Network Error',
        message: error instanceof Error ? error.message : 'Failed to connect to backend API',
        details: 'Check that the backend server is running on port 3000'
      });
    } finally {
      setIsLoadingResponse(false);
      if (isRetryAttempt) {
        setIsRetrying(false);
      }
    }
  };

  const handleNext = async () => {
    if (step < 3) {
      const nextStep = (step + 1) as 1 | 2 | 3;
      setStep(nextStep);

      // When moving from Step 1 to Step 2, call the Tool Planner API
      if (step === 1 && nextStep === 2) {
        await callToolPlannerAPI();
      }
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetrySucceeded(false);
    await callToolPlannerAPI(true);
  };

  /**
   * Create the selected actions
   */
  const handleSave = async () => {
    if (!parsedData || !serverId) {
      toastService.error('Missing required data to create actions');
      return;
    }
    
    const actionsToCreate = parsedData.actions.filter(a => selectedActions.has(a.name));
    
    if (actionsToCreate.length === 0) {
      toastService.error('Please select at least one action to create');
      return;
    }
    
    setIsCreatingActions(true);
    setCreationProgress('Preparing to create actions...');
    
    try {
      for (let i = 0; i < actionsToCreate.length; i++) {
        const action = actionsToCreate[i];
        setCreationProgress(`Creating action ${i + 1} of ${actionsToCreate.length}: ${action.name}...`);
        
        // Build MCPTool object
        const newAction: MCPTool = {
          name: action.name,
          description: action.description,
          inputSchema: action.inputSchema,
          deployed: false,
          hasEdsWidget: action.hasEdsWidget,
          annotations: action.annotations || {
            destructiveHint: false,
            openWorldHint: false,
            readOnlyHint: true
          }
        };
        
        // Add widget metadata if present
        if (action.hasEdsWidget && action.widgetMetadata) {
          const kebabName = action.name
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
            .toLowerCase();
          
          const outputTemplateUri = `ui://eds-widget/${kebabName}-widget.html`;
          
          newAction._meta = {
            [ACTION_META.OUTPUT_TEMPLATE]: outputTemplateUri,
            [ACTION_META.WIDGET_ACCESSIBLE]: true,
            [ACTION_META.TOOL_INVOCATION_INVOKING]: action.widgetMetadata.invokingText,
            [ACTION_META.TOOL_INVOCATION_INVOKED]: action.widgetMetadata.invokedText,
            [ACTION_META.RESULT_CAN_PRODUCE_WIDGET]: true
          };
          
          // Log action changelog
          await changelogService.addEntry(
            'action_added',
            action.name,
            `Created action "${action.name}" from Tool Planner`,
            { newValue: newAction }
          );
          
          // Create action
          await apiClient.addCustomAction(serverId, newAction);
          
          // Create widget resource
          const newResource: MCPResource = {
            uri: outputTemplateUri,
            name: `${kebabName}Widget`,
            description: action.widgetMetadata.widgetDescription || action.description,
            mimeType: 'text/html+skybridge',
            actionName: action.name,
            deployed: false,
            _meta: {
              [EDS_WIDGET_META.WIDGET_DESCRIPTION]: action.widgetMetadata.widgetDescription,
              [EDS_WIDGET_META.WIDGET_PREFERS_BORDER]: action.widgetMetadata.prefersBorder ?? true,
              [EDS_WIDGET_META.WIDGET_DOMAIN]: 'https://web-sandbox.oaiusercontent.com'
            }
          };
          
          // Add EDS config if available
          if (connectedServer?.edsConfig) {
            const { branch, repo, owner } = connectedServer.edsConfig;
            const baseUrl = `https://${branch}--${repo}--${owner}.aem.page`;
            
            newResource._meta![EDS_WIDGET_META.WIDGET_CSP] = {
              [EDS_WIDGET_META.CSP_CONNECT_DOMAINS]: [baseUrl],
              [EDS_WIDGET_META.CSP_RESOURCE_DOMAINS]: [baseUrl]
            };
            
            newResource._meta![EDS_WIDGET_META.LCB_WIDGET_META] = {
              [EDS_WIDGET_META.SCRIPT_URL]: `${baseUrl}/scripts/aem-embed.js`,
              [EDS_WIDGET_META.WIDGET_EMBED_URL]: `${baseUrl}/eds-widgets/${kebabName}`
            };
          }
          
          // Log resource changelog
          await changelogService.addEntry(
            'resource_added',
            newResource.uri,
            `Created widget resource for "${action.name}"`,
            { resourceUri: newResource.uri, newValue: newResource }
          );
          
          // Save resource
          await apiClient.addWidgetResource(serverId, newResource);
        } else {
          // No widget - just create action
          await changelogService.addEntry(
            'action_added',
            action.name,
            `Created action "${action.name}" from Tool Planner`,
            { newValue: newAction }
          );
          
          await apiClient.addCustomAction(serverId, newAction);
        }
        
        console.log(`[ToolPlannerDialog] Created action: ${action.name}`);
      }
      
      setCreationProgress('All actions created successfully!');
      toastService.success(`Created ${actionsToCreate.length} action(s) successfully`);
      
      // Wait a moment to show success message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Callback to refresh actions list
      if (onActionsCreated) {
        onActionsCreated();
      }
      
      handleClose();
    } catch (error) {
      console.error('[ToolPlannerDialog] Error creating actions:', error);
      toastService.error(error instanceof Error ? error.message : 'Failed to create actions');
      setCreationProgress('Error creating actions');
    } finally {
      setIsCreatingActions(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setPromptText('Suggest some tools for bitdefender.com based on what you find on their website.');
    setIsLoadingResponse(false);
    setToolPlannerResponse(null);
    setIsRetrying(false);
    setRetrySucceeded(false);
    setParsedData(null);
    setSelectedActions(new Set());
    setSelectedTab('actions');
    setIsCreatingActions(false);
    setCreationProgress('');
    onClose();
  };


  return (
    <>
      {/* Main Dialog */}
      <DialogContainer onDismiss={handleClose}>
        {isOpen && (
          <Dialog size="XL" isDismissible>
            {({close}) => (
              <>
                <Heading slot="title">{getStepTitle()}</Heading>
                <Content styles={style({ padding: 24 })}>
              {/* Loading State */}
              {authLoading && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: '24px'
                  }}
                >
                  <ProgressCircle aria-label="Loading authentication" isIndeterminate />
                  <Text>Loading authentication...</Text>
                </div>
              )}

              {/* Error State */}
              {!authLoading && authError && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: '24px'
                  }}
                >
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="24" cy="24" r="24" fill="#D7373F" />
                    <path
                      d="M18 18L30 30M30 18L18 30"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <Heading level={3}>Authentication Error</Heading>
                  <Text>{authError}</Text>
                  <Button variant="accent" onPress={loadIMS}>
                    Retry
                  </Button>
                </div>
              )}

              {/* Not Authenticated - Show Sign In */}
              {!authLoading && !authError && imsLoaded && !isAuthenticated && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: '32px'
                  }}
                >
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="32" cy="32" r="32" fill="#E1251B" />
                    <path
                      d="M32 8C26.6667 8 22 11.3333 18 18C14 24.6667 12 32 12 40C12 48 14 52 18 52H46C50 52 52 48 52 40C52 32 50 24.6667 46 18C42 11.3333 37.3333 8 32 8Z"
                      fill="white"
                    />
                  </svg>
                  <div style={{ padding: '32px', width: '100%', maxWidth: '500px', textAlign: 'center' }}>
                    <Heading level={2} UNSAFE_style={{ marginBottom: '16px' }}>
                      Sign In Required
                    </Heading>
                    <Text>
                      Please sign in with your Adobe ID to access the Tool Planner.
                    </Text>
                    <br />
                    <Text UNSAFE_style={{ color: '#6E6E6E', fontSize: '14px' }}>
                      You will be redirected to Adobe IMS for secure authentication.
                      After signing in, you will be returned to this dialog.
                    </Text>
                  </div>
                  <Button variant="accent" onPress={handleSignIn} UNSAFE_style={{ fontSize: '16px', padding: '12px 24px' }}>
                    Sign In with Adobe ID
                  </Button>
                </div>
              )}

              {/* Authenticated - Show Wizard Steps */}
              {!authLoading && !authError && (isAuthenticated || imsService.isMockMode()) && (
                <>
                  {/* Scrollable Content Area */}
                  <div style={{ flex: 1, overflow: 'auto', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      {/* Step 1 Content */}
                      {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          {/* Info Section */}
                          <Text UNSAFE_style={{ lineHeight: '1.6' }}>
                            Describe your business objective and website. Our AI-powered Tool Planner will analyze
                            your site, understand your goals, and generate tailored MCP tool suggestions and
                            conversion flow recommendations to help you achieve measurable results.
                          </Text>

                          {/* Example Prompts */}
                          <div style={{ 
                            backgroundColor: 'var(--spectrum-gray-100)',
                            borderRadius: '8px',
                            padding: '16px',
                            border: '1px solid var(--spectrum-gray-300)'
                          }}>
                            <Text UNSAFE_style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                              Example Goals:
                            </Text>
                            <Text
                              UNSAFE_style={{
                                fontStyle: 'italic',
                                fontSize: '14px',
                                lineHeight: '1.6',
                                display: 'block',
                                marginBottom: '8px',
                                color: 'var(--spectrum-gray-800)'
                              }}
                            >
                              "I want to increase trial conversion rates for consumer products from www.cybersecureplus.example.com"
                            </Text>
                            <Text
                              UNSAFE_style={{
                                fontStyle: 'italic',
                                fontSize: '14px',
                                lineHeight: '1.6',
                                display: 'block',
                                marginBottom: '8px',
                                color: 'var(--spectrum-gray-800)'
                              }}
                            >
                              "I want to sell more shirts these Holidays from www.trendythreads.example.com"
                            </Text>
                            <Text
                              UNSAFE_style={{
                                fontStyle: 'italic',
                                fontSize: '14px',
                                lineHeight: '1.6',
                                display: 'block',
                                color: 'var(--spectrum-gray-800)'
                              }}
                            >
                              "I want to have more bookings this Summer at all hotels from www.luxstayhotels.example.com"
                            </Text>
                          </div>

                          {/* TextArea for User Prompt */}
                          <TextArea
                            label="Describe your goal"
                            value={promptText}
                            onChange={setPromptText}
                            isRequired
                            maxLength={1024}
                            description={`${promptText.length}/1024 characters`}
                            UNSAFE_style={{ minHeight: '200px', width: '100%' }}
                          />
                        </div>
                      )}

                  {/* Step 2 Content */}
                  {step === 2 && (
                    <>
                      {isLoadingResponse ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            gap: '24px'
                          }}
                        >
                          <ProgressCircle aria-label="Processing your request" isIndeterminate />
                          <Text>Processing your request...</Text>
                        </div>
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            overflow: 'auto',
                            boxSizing: 'border-box'
                          }}
                        >
                          {/* Parsed Actions Display */}
                          {parsedData && parsedData.actions.length > 0 && (
                            <>
                              {/* Summary Section */}
                              {parsedData.summary && (
                                <div style={{
                                  borderRadius: '8px',
                                  padding: '16px',
                                  border: '1px solid var(--spectrum-global-color-blue-600)',
                                  backgroundColor: 'var(--spectrum-global-color-blue-100)',
                                  marginBottom: '24px'
                                }}>
                                  <Heading level={4} UNSAFE_style={{ margin: 0, marginBottom: '8px' }}>
                                    Analysis Summary
                                  </Heading>
                                  <Text><strong>Domain:</strong> {parsedData.summary.domain}</Text>
                                  <br />
                                  <Text><strong>Goal:</strong> {parsedData.summary.businessGoal}</Text>
                                  {parsedData.summary.websiteAnalyzed && (
                                    <>
                                      <br />
                                      <Text><strong>Website:</strong> {parsedData.summary.websiteAnalyzed}</Text>
                                    </>
                                  )}
                                  <br />
                                  <Text><strong>Actions Proposed:</strong> {parsedData.summary.totalActionsProposed}</Text>
                                </div>
                              )}
                              
                              {/* Tabs for Actions and Flow */}
                              <Tabs
                                aria-label="Tool planner results"
                                selectedKey={selectedTab}
                                onSelectionChange={(key) => setSelectedTab(key as string)}
                                UNSAFE_style={{ width: '100%' }}
                              >
                                <TabList>
                                  <Tab id="actions">Suggested Actions</Tab>
                                  <Tab id="flow">Conversation Flow</Tab>
                                </TabList>
                                
                                {/* Actions Tab */}
                                <TabPanel id="actions">
                              <div style={{ paddingTop: '16px' }}>
                              {/* Actions List */}
                              <Heading level={3} UNSAFE_style={{ marginBottom: '16px' }}>
                                Suggested Actions
                              </Heading>
                              <Text UNSAFE_style={{ marginBottom: '16px', color: 'var(--spectrum-global-color-gray-700)' }}>
                                Select the actions you want to create:
                              </Text>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {parsedData.actions.map((action, index) => (
                                  <div
                                    key={action.name}
                                    style={{
                                      borderWidth: '2px',
                                      borderStyle: 'solid',
                                      borderColor: selectedActions.has(action.name) 
                                        ? 'var(--spectrum-global-color-blue-600)' 
                                        : 'var(--spectrum-global-color-gray-300)',
                                      borderRadius: '8px',
                                      padding: '16px',
                                      backgroundColor: selectedActions.has(action.name)
                                        ? 'var(--spectrum-global-color-blue-100)'
                                        : 'var(--spectrum-gray-50)',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s'
                                    }}
                                    onClick={() => toggleActionSelection(action.name)}
                                  >
                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '12px' }}>
                                      <div style={{ marginTop: '4px' }}>
                                        <Checkbox
                                          isSelected={selectedActions.has(action.name)}
                                          onChange={() => toggleActionSelection(action.name)}
                                          aria-label={`Select ${action.name}`}
                                        />
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                          <Text UNSAFE_style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                            {index + 1}. {action.name}
                                          </Text>
                                          {action.hasEdsWidget && (
                                            <span style={{
                                              backgroundColor: 'var(--spectrum-global-color-purple-600)',
                                              color: 'white',
                                              padding: '2px 8px',
                                              borderRadius: '4px',
                                              fontSize: '11px',
                                              fontWeight: 'bold'
                                            }}>
                                              WIDGET
                                            </span>
                                          )}
                                        </div>
                                        <Text UNSAFE_style={{ marginBottom: '12px', lineHeight: '1.5' }}>
                                          {action.description}
                                        </Text>
                                        
                                        {/* Input Parameters */}
                                        {action.inputSchema?.properties && Object.keys(action.inputSchema.properties).length > 0 && (
                                          <div style={{ marginTop: '12px' }}>
                                            <Text UNSAFE_style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                                              Parameters:
                                            </Text>
                                            <div style={{
                                              backgroundColor: 'white',
                                              borderRadius: '4px',
                                              padding: '8px',
                                              fontSize: '12px'
                                            }}>
                                              {Object.entries(action.inputSchema.properties).map(([key, value]: [string, any]) => (
                                                <div key={key} style={{ marginBottom: '4px' }}>
                                                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{key}</span>
                                                  <span style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
                                                    {' '}({value.type})
                                                    {action.inputSchema.required?.includes(key) ? ' *' : ''}
                                                  </span>
                                                  {value.description && (
                                                    <div style={{ marginLeft: '16px', color: 'var(--spectrum-global-color-gray-700)' }}>
                                                      {value.description}
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Widget Metadata */}
                                        {action.hasEdsWidget && action.widgetMetadata && (
                                          <div style={{ marginTop: '12px' }}>
                                            <Text UNSAFE_style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                                              Widget Info:
                                            </Text>
                                            <div style={{
                                              backgroundColor: 'white',
                                              borderRadius: '4px',
                                              padding: '8px',
                                              fontSize: '12px'
                                            }}>
                                              <Text>Loading: "{action.widgetMetadata.invokingText}"</Text>
                                              <br />
                                              <Text>Complete: "{action.widgetMetadata.invokedText}"</Text>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Rationale Section */}
                              {parsedData.rationale && (
                                <div style={{
                                  marginTop: '24px',
                                  borderRadius: '8px',
                                  padding: '16px',
                                  border: '1px solid var(--spectrum-global-color-gray-400)',
                                  backgroundColor: 'var(--spectrum-global-color-gray-75)'
                                }}>
                                  <Heading level={4} UNSAFE_style={{ margin: 0, marginBottom: '8px' }}>
                                    Design Rationale
                                  </Heading>
                                  <Text><strong>Pattern:</strong> {parsedData.rationale.designPattern}</Text>
                                  <br />
                                  <Text><strong>Why Multiple Tools:</strong> {parsedData.rationale.whyMultipleTools}</Text>
                                  {parsedData.rationale.industryInsights && parsedData.rationale.industryInsights.length > 0 && (
                                    <>
                                      <br />
                                      <br />
                                      <Text UNSAFE_style={{ fontWeight: 'bold' }}>Industry Insights:</Text>
                                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                        {parsedData.rationale.industryInsights.map((insight, idx) => (
                                          <li key={idx}>
                                            <Text>{insight}</Text>
                                          </li>
                                        ))}
                                      </ul>
                                    </>
                                  )}
                                </div>
                              )}
                                </div>
                                </TabPanel>
                                
                                {/* Flow Diagram Tab */}
                                <TabPanel id="flow">
                                  <div style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {parsedData.conversationFlow && (
                                      <>
                                        {/* Description */}
                                        <Text UNSAFE_style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                          {parsedData.conversationFlow.description}
                                        </Text>
                                        
                                        {/* Mermaid Diagram */}
                                        {parsedData.conversationFlow.mermaidDiagram && (
                                          <div style={{
                                            width: '100%',
                                            backgroundColor: 'white',
                                            borderRadius: '8px',
                                            border: '1px solid var(--spectrum-global-color-gray-300)',
                                            overflow: 'auto',
                                            position: 'relative',
                                            padding: '24px',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                          }}>
                                            <img
                                              src={`https://mermaid.ink/svg/${btoa(parsedData.conversationFlow.mermaidDiagram)}`}
                                              alt="Conversation Flow Diagram"
                                              style={{
                                                maxWidth: '100%',
                                                height: 'auto',
                                                display: 'block'
                                              }}
                                            />
                                          </div>
                                        )}
                                        
                                        {/* Info text */}
                                        <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-700)', textAlign: 'center' }}>
                                          This diagram shows how ChatGPT will use the suggested actions in conversation.
                                        </Text>
                                      </>
                                    )}
                                  </div>
                                </TabPanel>
                              </Tabs>
                            </>
                          )}
                          
                          {/* Error Display */}
                          {toolPlannerResponse && (toolPlannerResponse.success === false || toolPlannerResponse.response?.payload?.error) && (
                            <>
                              <Heading level={3} UNSAFE_style={{ marginBottom: '12px' }}>
                                Error
                              </Heading>
                              <div
                                style={{
                                  borderWidth: '1px',
                                  borderColor: '#d7373f',
                                  borderRadius: '8px',
                                  borderStyle: 'solid',
                                  padding: '24px',
                                  backgroundColor: '#fef4f4',
                                  marginBottom: '20px'
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                      <circle cx="10" cy="10" r="10" fill="#D7373F" />
                                      <path d="M10 5v6M10 13v1" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    <Text UNSAFE_style={{ fontWeight: 600, color: '#D7373F', fontSize: '15px' }}>
                                      {toolPlannerResponse.response?.payload?.error || 'Request Failed'}
                                    </Text>
                                  </div>
                                  <Text UNSAFE_style={{ fontSize: '14px', lineHeight: '1.5', color: '#555' }}>
                                    {toolPlannerResponse.response?.payload?.message || 'An error occurred while processing your request. Please try again.'}
                                  </Text>
                                  {toolPlannerResponse.response?.status && (
                                    <Text UNSAFE_style={{ fontSize: '13px', color: '#777', fontFamily: 'monospace' }}>
                                      Status: {toolPlannerResponse.response.status} {toolPlannerResponse.response.statusText}
                                    </Text>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Step 3 Content */}
                  {step === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {isCreatingActions ? (
                        <div style={{ 
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '16px',
                          paddingTop: '48px',
                          paddingBottom: '48px'
                        }}>
                          <ProgressCircle aria-label="Creating actions" isIndeterminate />
                          <Text UNSAFE_style={{ fontSize: '16px' }}>
                            {creationProgress}
                          </Text>
                        </div>
                      ) : (
                        <>
                          <Heading level={3}>
                            Ready to Create Actions
                          </Heading>
                          <Text>
                            You have selected <strong>{selectedActions.size}</strong> action(s) to create:
                          </Text>
                          <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {parsedData?.actions
                              .filter(a => selectedActions.has(a.name))
                              .map(action => (
                                <li key={action.name} style={{ marginBottom: '8px' }}>
                                  <Text>
                                    <strong>{action.name}</strong>
                                    {action.hasEdsWidget && ' (with widget)'}
                                  </Text>
                                </li>
                              ))}
                          </ul>
                          <div style={{
                            borderRadius: '8px',
                            padding: '16px',
                            border: '1px solid var(--spectrum-global-color-gray-400)',
                            backgroundColor: 'var(--spectrum-global-color-gray-75)'
                          }}>
                            <Text UNSAFE_style={{ fontSize: '14px', lineHeight: '1.6' }}>
                              These actions will be created as drafts (undeployed). You will need to deploy them
                              to make them available for use. Widget resources will also be created for actions
                              that include widgets.
                            </Text>
                          </div>
                        </>
                      )}
                    </div>
                      )}
                    </div>
                  </div>

                  {/* Fixed Footer */}
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', justifyContent: 'space-between' }}>
                    <div>
                      {step > 1 && (
                        <Button
                          variant="secondary"
                          onPress={handleBack}
                          isDisabled={step === 2 && isLoadingResponse}
                        >
                          Back
                        </Button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
                      <Button variant="secondary" onPress={close}>
                        Cancel
                      </Button>
                      {/* Retry button - only on step 2 when there's an error */}
                      {/* Retry button - only on step 2 when there's an error */}
                      {step === 2 && toolPlannerResponse && (toolPlannerResponse.success === false || toolPlannerResponse.response?.payload?.error) && (
                        <Button
                          variant="primary"
                          onPress={handleRetry}
                          isDisabled={isLoadingResponse || isRetrying || retrySucceeded}
                        >
                          {isRetrying ? 'Retrying...' : 'Retry'}
                        </Button>
                      )}
                      {/* Next button for step 1 */}
                      {step === 1 && (
                        <Button
                          variant="accent"
                          onPress={handleNext}
                          isDisabled={promptText.trim().length === 0}
                        >
                          <Text>Next</Text>
                        </Button>
                      )}
                      {step === 2 && parsedData && parsedData.actions.length > 0 && (
                        <Button
                          variant="accent"
                          onPress={handleNext}
                          isDisabled={selectedActions.size === 0 || isLoadingResponse}
                        >
                          <Text>Next</Text>
                        </Button>
                      )}
                      {/* Create button for step 3 */}
                      {step === 3 && (
                        <Button 
                          variant="accent" 
                          onPress={handleSave}
                          isDisabled={isCreatingActions}
                        >
                          <Text>{isCreatingActions ? 'Creating...' : `Create ${selectedActions.size} Action${selectedActions.size !== 1 ? 's' : ''}`}</Text>
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </Content>
              </>
            )}
          </Dialog>
          )}
        </DialogContainer>
    </>
  );
}
