import { Hono } from 'hono';
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import { storageService } from '../services/storage';
import type { Deployment } from '../../../shared/types';

export const bashRouter = new Hono();

// Store running processes by session ID
const runningProcesses = new Map<string, ChildProcess>();

// Store deployment info by session ID for kill operations
const deploymentBySession = new Map<string, { environmentId: string; deploymentId: string }>();

// Generate unique session ID
const generateSessionId = () => `bash-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

/**
 * POST /api/bash/execute
 * Execute a bash command and return the output (waits for completion)
 */
bashRouter.post('/execute', async (c) => {
  try {
    const body = await c.req.json();
    const { command, description, environmentId, serverId, background = false } = body;

    if (!command) {
      return c.json({ error: 'Command is required' }, 400);
    }

    console.log(`[Bash] Executing command: ${command} (${description || 'No description'}) [background: ${background}]`);

    // Use LCB_SERVER_PATH environment variable, or calculate from lcb-ui base to lcb-server
    // process.cwd() is typically: /Users/chiriac/Repositories/tmp/lcb/lcb-ui/server
    // We need: /Users/chiriac/Repositories/tmp/lcb/lcb-server
    const cwd = process.env.LCB_SERVER_PATH || `${process.cwd()}/../../lcb-server`;
    console.log(`[Bash] Working directory: ${cwd}`);

    // Generate session ID and deployment ID
    const sessionId = generateSessionId();
    const deploymentId = randomUUID();

    // Create deployment record if environmentId provided
    let deployment: Deployment | null = null;
    if (environmentId && serverId) {
      deployment = await storageService.createDeployment({
        id: deploymentId,
        environmentId,
        serverId,
        status: 'running',
        command,
        output: '',
        startedAt: new Date().toISOString(),
        sessionId
      });
      console.log(`[Bash] Created deployment record: ${deploymentId}`);

      // Store deployment info for kill operations
      deploymentBySession.set(sessionId, { environmentId, deploymentId });
    }

    // Spawn the command with environment variables from parent process
    const child = spawn('bash', ['-c', command], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env // Pass all environment variables from lcb-ui server to bash
    });

    // Store the process so we can kill it later
    runningProcesses.set(sessionId, child);
    console.log(`[Bash] Process stored with session ID: ${sessionId}`);

    // If background mode, return immediately with session ID
    if (background) {
      console.log(`[Bash] Running in background mode, returning immediately`);
      
      // Set up output collection and cleanup for background process
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(`[Bash ${sessionId}] stdout:`, data.toString());
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(`[Bash ${sessionId}] stderr:`, data.toString());
      });

      child.on('close', (code) => {
        runningProcesses.delete(sessionId);
        deploymentBySession.delete(sessionId);
        console.log(`[Bash] Background process completed with code: ${code}, session: ${sessionId}`);
        
        // Update deployment record if exists
        if (deployment && environmentId) {
          const finalStatus: 'success' | 'failed' = (code || 0) === 0 ? 'success' : 'failed';
          const output = stdout + (stderr ? `\n--- STDERR ---\n${stderr}` : '');
          storageService.updateDeployment(environmentId, deploymentId, {
            status: finalStatus,
            output,
            exitCode: code || 0,
            completedAt: new Date().toISOString()
          }).catch(err => console.error(`[Bash] Failed to update deployment:`, err));
        }
      });

      child.on('error', (err) => {
        runningProcesses.delete(sessionId);
        deploymentBySession.delete(sessionId);
        console.error(`[Bash] Background process error:`, err);
      });

      return c.json({
        success: true,
        sessionId,
        deploymentId: deployment ? deploymentId : undefined,
        message: 'Process started in background'
      });
    }

    // Foreground mode: wait for process to complete
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Wait for process to complete
    const exitCode = await new Promise<number>((resolve) => {
      child.on('close', (code) => {
        // Clean up from storage
        runningProcesses.delete(sessionId);
        deploymentBySession.delete(sessionId);
        console.log(`[Bash] Process completed with code: ${code}, session: ${sessionId}`);
        resolve(code || 0);
      });

      child.on('error', () => {
        runningProcesses.delete(sessionId);
        deploymentBySession.delete(sessionId);
        resolve(1);
      });
    });

    // Combine output
    const output = stdout + (stderr ? `\n--- STDERR ---\n${stderr}` : '');

    // Update deployment record with final status
    if (deployment && environmentId) {
      const finalStatus: 'success' | 'failed' = exitCode === 0 ? 'success' : 'failed';
      await storageService.updateDeployment(environmentId, deploymentId, {
        status: finalStatus,
        output,
        exitCode,
        completedAt: new Date().toISOString()
      });
      console.log(`[Bash] Updated deployment ${deploymentId} with status: ${finalStatus}`);
    }

    if (exitCode === 0) {
      return c.json({
        success: true,
        sessionId,
        deploymentId: deployment ? deploymentId : undefined,
        output,
        stdout,
        stderr
      });
    } else {
      return c.json({
        success: false,
        sessionId,
        deploymentId: deployment ? deploymentId : undefined,
        error: `Command exited with code ${exitCode}`,
        stdout,
        stderr,
        output: `${stdout}\n--- ERROR ---\n${stderr}`
      }, 500);
    }
  } catch (error: any) {
    console.error('[Bash] Command execution failed:', error);
    return c.json({
      success: false,
      error: error.message || 'Command execution failed'
    }, 500);
  }
});

/**
 * POST /api/bash/kill/:sessionId
 * Kill a running bash process
 */
bashRouter.post('/kill/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');

    console.log(`[Bash Kill] Received kill request for session: ${sessionId}`);

    if (!sessionId) {
      console.log('[Bash Kill] Error: Session ID is required');
      return c.json({ error: 'Session ID is required' }, 400);
    }

    const child = runningProcesses.get(sessionId);

    if (!child) {
      console.log(`[Bash Kill] Error: Process not found for session: ${sessionId}`);
      return c.json({ error: 'Process not found or already terminated' }, 404);
    }

    console.log(`[Bash Kill] Killing process with session ID: ${sessionId}`);

    // Kill the process and all child processes
    child.kill('SIGKILL');
    console.log(`[Bash Kill] SIGKILL sent to process`);

    // Update deployment status to 'killed' if deployment exists
    const deploymentInfo = deploymentBySession.get(sessionId);
    if (deploymentInfo) {
      const { environmentId, deploymentId } = deploymentInfo;
      console.log(`[Bash Kill] Updating deployment ${deploymentId} status to 'killed'`);

      await storageService.updateDeployment(environmentId, deploymentId, {
        status: 'killed',
        completedAt: new Date().toISOString()
      });

      console.log(`[Bash Kill] Deployment ${deploymentId} marked as killed`);
    } else {
      console.log(`[Bash Kill] No deployment record found for session: ${sessionId}`);
    }

    // Clean up from storage
    runningProcesses.delete(sessionId);
    deploymentBySession.delete(sessionId);
    console.log(`[Bash Kill] Cleaned up session: ${sessionId}`);

    return c.json({ success: true, message: 'Process killed successfully' });
  } catch (error: any) {
    console.error('[Bash Kill] Failed to kill process:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to kill process'
    }, 500);
  }
});
