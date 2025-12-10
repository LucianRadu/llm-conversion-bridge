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

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContainer,
  Heading,
  Content,
  Button,
  ButtonGroup,
  StatusLight,
  ProgressCircle,
  Text
} from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Close from '@react-spectrum/s2/icons/Close';
import Ansi from 'ansi-to-react';
import type { MCPServer } from '../../../shared/types';
import { apiClient } from '../services/api';
import { toastService } from '../services/toast';
import { APP_EVENTS } from '../constants/events';

interface DeployChangesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  connectedServer: MCPServer;
  shouldStartDeployment: boolean;
  onDeploymentStarted?: () => void; // Callback to reset trigger in parent
}

export default function DeployChangesDialog({
  isOpen,
  onClose,
  connectedServer,
  shouldStartDeployment,
  onDeploymentStarted
}: DeployChangesDialogProps) {
  // State variables
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentOutput, setDeploymentOutput] = useState('');
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [deploymentSessionId, setDeploymentSessionId] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Ref for auto-scroll
  const outputRef = useRef<HTMLDivElement>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setHasStarted(false);
      setDeploymentStatus('idle');
      setDeploymentOutput('');
      setDeploymentSessionId(null);
      setIsDeploying(false);
    }
  }, [isOpen]);

  // Start deployment ONLY when explicitly triggered by shouldStartDeployment prop
  useEffect(() => {
    console.log('[DeployChangesDialog] useEffect triggered - isOpen:', isOpen, 'shouldStartDeployment:', shouldStartDeployment, 'hasStarted:', hasStarted, 'deploymentStatus:', deploymentStatus);

    if (isOpen && shouldStartDeployment && !hasStarted && deploymentStatus === 'idle') {
      console.log('[DeployChangesDialog] ✅ All conditions met - Starting deployment');
      setHasStarted(true);
      handleDeploy();
      // IMMEDIATELY reset the trigger in parent to prevent re-triggering
      if (onDeploymentStarted) {
        onDeploymentStarted();
      }
    } else {
      console.log('[DeployChangesDialog] ❌ Conditions not met - NOT starting deployment');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, shouldStartDeployment]);

  // Auto-scroll terminal to bottom when output changes
  useEffect(() => {
    if (outputRef.current && deploymentOutput) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [deploymentOutput]);

  // Handle kill deployment
  const handleKillDeployment = async () => {
    if (!deploymentSessionId) {
      toastService.error('No active deployment to kill');
      return;
    }

    try {
      // Kill the bash process
      const response = await fetch(`/api/bash/kill/${deploymentSessionId}`, {
        method: 'POST'
      });

      if (response.ok) {
        setDeploymentOutput(prev => prev + '\n\n🛑 [Deployment cancelled by user]\n');
        setDeploymentStatus('error');

        // Also kill viceroy/fastly processes
        await fetch('/api/bash/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: 'make kill-fastly',
            description: 'Kill viceroy/fastly processes after deployment cancellation'
          })
        });

        // Dispatch deployment failed event
        window.dispatchEvent(new CustomEvent(APP_EVENTS.DEPLOYMENT_FAILED));

        toastService.success('Deployment stopped successfully');
      }
    } catch (error) {
      toastService.error('Failed to stop deployment');
    } finally {
      setIsDeploying(false);
      setDeploymentSessionId(null);
    }
  };

  // Handle local deployment
  const handleDeploy = async () => {
    console.log('[DeployChangesDialog] handleDeploy called - deploymentStatus:', deploymentStatus, 'isDeploying:', isDeploying);

    // GUARD: Prevent re-entry if already deploying
    if (isDeploying || deploymentStatus === 'running') {
      console.log('[DeployChangesDialog] BLOCKED: Deployment already in progress');
      return;
    }

    try {
      setIsDeploying(true);
      setDeploymentStatus('running');
      setDeploymentOutput('🚀 Starting local deployment...\n\n');

      // Track final output for updates
      let finalOutput = '🚀 Starting local deployment...\n\n';

      // Dispatch deployment started event
      window.dispatchEvent(new CustomEvent(APP_EVENTS.DEPLOYMENT_STARTED));

      // Step 0: Stop any running local server instances
      finalOutput += '🛑 Stopping any running local instances...\n\n';
      setDeploymentOutput(finalOutput);

      try {
        const killResult = await fetch('/api/bash/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: 'make kill-fastly',
            description: 'Stop local server'
          })
        });

        const killData = await killResult.json();
        if (killResult.ok) {
          finalOutput += (killData.output || killData.stdout || 'Killing any existing Fastly processes...\n');
          finalOutput += '✅ Local instances stopped\n\n';
        } else {
          finalOutput += '⚠️  No running instances found (or already stopped)\n\n';
        }
        setDeploymentOutput(finalOutput);
      } catch (killError) {
        finalOutput += `⚠️  Could not stop instances: ${killError instanceof Error ? killError.message : 'Unknown error'}\n\n`;
        setDeploymentOutput(finalOutput);
      }

      // Step 0.5: Generate new actions from database
      finalOutput += '📦 Generating new actions from database...\n\n';
      setDeploymentOutput(finalOutput);

      try {
        const generateActionsResult = await fetch('/api/bash/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: 'make generate-new-actions',
            description: 'Generate new actions from UI database',
            cwd: connectedServer.sourceProjectPath
          })
        });

        const generateActionsData = await generateActionsResult.json();
        if (generateActionsResult.ok) {
          finalOutput += (generateActionsData.output || generateActionsData.stdout || 'Actions generated successfully\n') + '\n';
        } else {
          finalOutput += `⚠️  ${generateActionsData.error || generateActionsData.stderr || 'No new actions to generate'}\n\n`;
        }
        setDeploymentOutput(finalOutput);
      } catch (generateError) {
        finalOutput += `⚠️  Could not generate new actions: ${generateError instanceof Error ? generateError.message : 'Unknown error'}\n\n`;
        setDeploymentOutput(finalOutput);
      }

      // Step 0.55: Generate widget actions from database
      finalOutput += '📦 Generating widget actions from database...\n\n';
      setDeploymentOutput(finalOutput);

      try {
        const generateWidgetsResult = await fetch('/api/bash/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: 'make generate-eds-widgets-from-db',
            description: 'Generate EDS widget actions from UI database',
            cwd: connectedServer.sourceProjectPath
          })
        });

        const generateWidgetsData = await generateWidgetsResult.json();
        if (generateWidgetsResult.ok) {
          finalOutput += (generateWidgetsData.output || generateWidgetsData.stdout || 'Widget actions generated successfully\n') + '\n';
        } else {
          finalOutput += `⚠️  ${generateWidgetsData.error || generateWidgetsData.stderr || 'No new widget actions to generate'}\n\n`;
        }
        setDeploymentOutput(finalOutput);
      } catch (generateWidgetsError) {
        finalOutput += `⚠️  Could not generate widget actions: ${generateWidgetsError instanceof Error ? generateWidgetsError.message : 'Unknown error'}\n\n`;
        setDeploymentOutput(finalOutput);
      }

      // Step 0.6: Delete actions marked for deletion
      finalOutput += '🗑️  Deleting marked actions...\n\n';
      setDeploymentOutput(finalOutput);

      try {
        const deleteActionsResult = await fetch('/api/bash/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: 'make delete-actions-from-db',
            description: 'Delete actions marked for deletion',
            cwd: connectedServer.sourceProjectPath
          })
        });

        const deleteActionsData = await deleteActionsResult.json();
        if (deleteActionsResult.ok) {
          finalOutput += (deleteActionsData.output || deleteActionsData.stdout || 'Actions deleted successfully\n') + '\n';
        } else {
          finalOutput += `⚠️  ${deleteActionsData.error || deleteActionsData.stderr || 'No actions to delete'}\n\n`;
        }
        setDeploymentOutput(finalOutput);
      } catch (deleteError) {
        finalOutput += `⚠️  Could not delete actions: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}\n\n`;
        setDeploymentOutput(finalOutput);
      }

      // Step 1: Write all action drafts to schema.json files
      finalOutput += '📝 Updating action schemas...\n\n';
      setDeploymentOutput(finalOutput);

      try {
        const draftsResponse = await fetch(`/api/actions/${connectedServer.id}/drafts`);
        const draftsData = await draftsResponse.json();
        const drafts = draftsData.drafts || [];

        if (drafts.length > 0) {
          finalOutput += `Found ${drafts.length} draft(s) to write:\n`;
          for (const draft of drafts) {
            finalOutput += `  - ${draft.name}/schema.json\n`;
          }
          finalOutput += '\n';
          setDeploymentOutput(finalOutput);

          const writeResponse = await fetch(`/api/actions/${connectedServer.id}/drafts/deploy`, {
            method: 'POST'
          });

          if (!writeResponse.ok) {
            const writeError = await writeResponse.json();
            throw new Error(writeError.message || 'Failed to write schemas');
          }

          const writeData = await writeResponse.json();
          finalOutput += `✅ Successfully wrote ${writeData.written.length} schema(s)\n\n`;
          setDeploymentOutput(finalOutput);
        } else {
          finalOutput += 'No drafts to write\n\n';
          setDeploymentOutput(finalOutput);
        }
      } catch (schemaError) {
        finalOutput += `❌ Schema write failed: ${schemaError instanceof Error ? schemaError.message : 'Unknown error'}\n\n`;
        setDeploymentOutput(finalOutput);
        setDeploymentStatus('error');
        setIsDeploying(false);
        window.dispatchEvent(new CustomEvent(APP_EVENTS.DEPLOYMENT_FAILED));
        toastService.error('Failed to write schemas');
        return;
      }

      // Step 2: Deploy resource drafts
      try {
        const resourceDrafts = await apiClient.getResourceDrafts(connectedServer.id);
        if (resourceDrafts.length > 0) {
          finalOutput += `📝 Writing ${resourceDrafts.length} resource draft(s) to widget-schema.json files...\n`;
          setDeploymentOutput(finalOutput);

          for (const draft of resourceDrafts) {
            finalOutput += `  - ${draft.actionName}/widget/widget-schema.json\n`;
          }
          finalOutput += '\n';
          setDeploymentOutput(finalOutput);

          const resourceDeployResult = await apiClient.deployResourceDrafts(connectedServer.id);
          finalOutput += `✅ Successfully wrote ${resourceDeployResult.written.length} widget-schema.json file(s)\n\n`;
          setDeploymentOutput(finalOutput);

          // Generate template.html files from widget-schema.json
          finalOutput += '🔧 Generating widget templates from widget-schema.json...\n';
          setDeploymentOutput(finalOutput);

          const generateTemplatesResult = await apiClient.executeBashCommand(
            'make generate-widget-templates'
          );

          finalOutput += generateTemplatesResult.output + '\n';
          setDeploymentOutput(finalOutput);
        } else {
          finalOutput += 'No resource drafts to write\n\n';
          setDeploymentOutput(finalOutput);
        }
      } catch (resourceError) {
        finalOutput += `❌ Resource write failed: ${resourceError instanceof Error ? resourceError.message : 'Unknown error'}\n\n`;
        setDeploymentOutput(finalOutput);
        setDeploymentStatus('error');
        setIsDeploying(false);
        window.dispatchEvent(new CustomEvent(APP_EVENTS.DEPLOYMENT_FAILED));
        toastService.error('Failed to write resource schemas');
        return;
      }

      // Step 3: Run make build (FAIL FAST)
      finalOutput += '🏗️  Running make build...\n\n';
      setDeploymentOutput(finalOutput);

      const buildResult = await fetch('/api/bash/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'make build',
          description: 'Build for local deployment'
        })
      });

      const buildData = await buildResult.json();

      if (!buildResult.ok) {
        const failureOutput = buildData.output || buildData.stderr || buildData.error || 'make build failed';
        finalOutput += '\n\n❌ BUILD FAILED\n\n' + failureOutput;
        setDeploymentOutput(finalOutput);
        setDeploymentStatus('error');
        setIsDeploying(false);
        window.dispatchEvent(new CustomEvent(APP_EVENTS.DEPLOYMENT_FAILED));
        toastService.error('Build failed - deployment stopped');
        return;
      }

      finalOutput += (buildData.output || buildData.stdout || 'make build completed') + '\n\n';
      setDeploymentOutput(finalOutput);

      // Step 4: Run make serve (background)
      finalOutput += '🚀 Starting make serve...\n\n';
      setDeploymentOutput(finalOutput);

      const serveResult = await fetch('/api/bash/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'make serve',
          description: 'Serve for local deployment',
          background: true
        })
      });

      const serveData = await serveResult.json();

      if (serveData.sessionId) {
        setDeploymentSessionId(serveData.sessionId);
      }

      if (serveResult.ok) {
        finalOutput += '✅ make serve started in background\n\n⏳ Waiting for server to be ready...\n';
        setDeploymentOutput(finalOutput);

        // Health check polling - use server's URL (path extracted from AEM_COMPUTE_SERVICE)
        const serverUrl = connectedServer.url;
        let isReady = false;
        let attempts = 0;
        const maxAttempts = 15;

        while (!isReady && attempts < maxAttempts) {
          attempts++;

          try {
            const healthCheck = await fetch(`/api/health/check?url=${encodeURIComponent(serverUrl)}`);
            const healthData = await healthCheck.json();

            if (healthData.healthy) {
              isReady = true;
              finalOutput += `✅ Server is ready!\n`;
              setDeploymentOutput(finalOutput);
            } else {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (err) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (!isReady) {
          finalOutput += `\n❌ Server failed to respond within 15 seconds\n`;
          setDeploymentOutput(finalOutput);
          setDeploymentStatus('error');
          setIsDeploying(false);
          window.dispatchEvent(new CustomEvent(APP_EVENTS.DEPLOYMENT_FAILED));
          toastService.error('Server failed to start');
          return;
        }
      } else {
        const errorOutput = serveData.output || serveData.error || serveData.stderr || 'make serve failed';
        finalOutput += errorOutput;
        setDeploymentOutput(finalOutput);
        setDeploymentStatus('error');
        setIsDeploying(false);
        window.dispatchEvent(new CustomEvent(APP_EVENTS.DEPLOYMENT_FAILED));
        toastService.error('make serve failed');
        return;
      }

      // Step 5: Cleanup and reconnection
      finalOutput += '\n🧹 Cleaning up...\n';
      setDeploymentOutput(finalOutput);

      // Clear drafts
      await fetch(`/api/actions/${connectedServer.id}/drafts`, { method: 'DELETE' });

      // Mark actions as deployed
      await fetch(`/api/actions/${connectedServer.id}/mark-deployed`, { method: 'POST' });

      // Mark resources as deployed
      await fetch(`/api/widget-resources/${connectedServer.id}/mark-deployed`, { method: 'POST' });

      // Clear resource drafts
      await apiClient.clearResourceDrafts(connectedServer.id);

      // Clear changelog
      const sessionId = sessionStorage.getItem('lcb-changelog-session-id');
      if (sessionId) {
        await fetch(`/api/changelog/${sessionId}`, { method: 'DELETE' });
        window.dispatchEvent(new CustomEvent('lcb-changelog-updated'));
      }

      finalOutput += '✅ Cleanup complete\n';
      setDeploymentOutput(finalOutput);

      // Success! (reconnection will happen when user closes dialog)
      finalOutput += '\n\n🎉 Deployment completed successfully!\n';
      finalOutput += '💡 Close this dialog to reconnect to the new server\n';
      setDeploymentOutput(finalOutput);
      setDeploymentStatus('success');
      window.dispatchEvent(new CustomEvent(APP_EVENTS.DEPLOYMENT_COMPLETED));
      toastService.success('Deployment completed successfully');

    } catch (error) {
      setDeploymentOutput(prev => prev + `\n\n❌ Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      setDeploymentStatus('error');
      toastService.error('Deployment failed');
      window.dispatchEvent(new CustomEvent(APP_EVENTS.DEPLOYMENT_FAILED));
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <DialogContainer onDismiss={onClose}>
      {isOpen && (
        <Dialog
          size="XL"
          isDismissible={deploymentStatus !== 'running'}
        >
          <Heading>Review Changes</Heading>
          <Content UNSAFE_style={{ width: '90vw', maxWidth: '90vw', height: '80vh', maxHeight: '80vh', overflow: 'hidden' }}>
            <div className={style({ display: 'flex', flexDirection: 'column', gap: 16, height: 'full', overflow: 'hidden' })}>
              {/* Status indicator */}
              {deploymentStatus !== 'idle' && (
                <div className={style({ display: 'flex', alignItems: 'center', gap: 12 })}>
                  <StatusLight
                    variant={
                      deploymentStatus === 'running' ? 'notice' :
                      deploymentStatus === 'success' ? 'positive' :
                      'negative'
                    }
                  >
                    {deploymentStatus === 'running' ? 'Deploying...' :
                     deploymentStatus === 'success' ? 'Deployment Complete' :
                     'Deployment Failed'}
                  </StatusLight>
                  {deploymentStatus === 'running' && (
                    <ProgressCircle isIndeterminate size="S" aria-label="Deploying" />
                  )}
                </div>
              )}

              {/* Terminal output */}
              <div
                style={{
                  border: '1px solid var(--spectrum-global-color-gray-400)',
                  borderRadius: '4px',
                  padding: '16px',
                  backgroundColor: 'var(--spectrum-global-color-gray-800)',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: 'var(--spectrum-global-color-gray-50)',
                  flex: 1,
                  overflow: 'hidden',
                  minHeight: '400px',
                  width: '100%'
                }}
              >
                <div ref={outputRef} style={{
                  height: '100%',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  width: '100%'
                }}>
                  <pre style={{
                    margin: 0,
                    whiteSpace: 'pre',
                    wordWrap: 'normal',
                    width: 'max-content',
                    minWidth: '100%'
                  }}>
                    <Ansi>{deploymentOutput || 'Starting local deployment...'}</Ansi>
                  </pre>
                </div>
              </div>
            </div>
          </Content>

          <ButtonGroup>
            {deploymentStatus === 'running' && (
              <Button variant="negative" onPress={handleKillDeployment}>
                <Close />
                <Text>Stop Deployment</Text>
              </Button>
            )}
            <Button
              variant="secondary"
              onPress={onClose}
              isDisabled={deploymentStatus === 'running'}
            >
              Close
            </Button>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogContainer>
  );
}
