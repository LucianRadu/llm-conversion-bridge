import { Hono } from 'hono';
import type { MCPClientManager } from '../services/mcpClientManager';

// Type for Hono context with mcpClientManager
type AppContext = {
  Variables: {
    mcpClientManager: MCPClientManager;
  };
};

const openai = new Hono<AppContext>();

// In-memory storage for AEM Widget data (TTL: 1 hour)
interface AEMWidgetData {
  serverId: string;
  uri: string;
  toolInput: Record<string, any>;
  toolOutput: any;
  toolResponseMetadata?: Record<string, any> | null;
  toolId: string;
  toolName: string;
  theme?: 'light' | 'dark';
  timestamp: number;
}

const aemWidgetDataStore = new Map<string, AEMWidgetData>();

// Cleanup expired AEM Widget data every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    for (const [toolId, data] of aemWidgetDataStore.entries()) {
      if (now - data.timestamp > ONE_HOUR) {
        aemWidgetDataStore.delete(toolId);
      }
    }
  },
  5 * 60 * 1000
).unref();

// Store AEM Widget data endpoint
openai.post('/aem-widget/store', async (c) => {
  try {
    const body = await c.req.json();
    const {
      serverId,
      uri,
      toolInput,
      toolOutput,
      toolResponseMetadata,
      toolId,
      toolName,
      theme,
    } = body;

    if (!serverId || !uri || !toolId || !toolName) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    // Store AEM Widget data using toolId as key
    aemWidgetDataStore.set(toolId, {
      serverId,
      uri,
      toolInput,
      toolOutput,
      toolResponseMetadata: toolResponseMetadata ?? null,
      toolId,
      toolName,
      theme: theme ?? 'dark',
      timestamp: Date.now(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Error storing AEM Widget data:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Container page that loads the AEM Widget
// This page changes URL to "/" before loading AEM Widget (for React Router compatibility)
openai.get('/aem-widget/:toolId', async (c) => {
  const toolId = c.req.param('toolId');

  // Check if data exists in storage
  const aemWidgetData = aemWidgetDataStore.get(toolId);
  if (!aemWidgetData) {
    return c.html(
      '<html><body>Error: AEM Widget data not found or expired</body></html>',
      404
    );
  }

  // Return a container page that will fetch and load the actual AEM Widget
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Loading AEM Widget...</title>
    </head>
    <body>
      <script>
        (async function() {
          // Change URL to "/" BEFORE loading AEM Widget (for React Router)
          history.replaceState(null, '', '/');

          // Fetch the actual AEM Widget HTML using toolId
          const response = await fetch('/api/openai/aem-widget-content/${toolId}');
          const html = await response.text();

          // Replace entire document with AEM Widget HTML
          document.open();
          document.write(html);
          document.close();
        })();
      </script>
    </body>
    </html>
  `);
});

// Actual AEM Widget content endpoint with injected OpenAI bridge
openai.get('/aem-widget-content/:toolId', async (c) => {
  try {
    const toolId = c.req.param('toolId');

    // Retrieve AEM Widget data from storage
    const aemWidgetData = aemWidgetDataStore.get(toolId);
    if (!aemWidgetData) {
      return c.html(
        '<html><body>Error: AEM Widget data not found or expired</body></html>',
        404
      );
    }

    const {
      serverId,
      uri,
      toolInput,
      toolOutput,
      toolResponseMetadata,
      toolName,
      theme,
    } = aemWidgetData;

    // Get MCP client manager from context
    const mcpClientManager = c.get('mcpClientManager');
    if (!mcpClientManager) {
      return c.html(
        '<html><body>Error: MCP client manager not available</body></html>',
        500
      );
    }

    // Read the AEM Widget HTML from MCP server
    const contents = await mcpClientManager.readResource(serverId, uri);

    let htmlContent = '';
    if (contents && Array.isArray(contents)) {
      const firstContent = contents[0];
      if (firstContent) {
        if (typeof (firstContent as any).text === 'string') {
          htmlContent = (firstContent as any).text;
        } else if (typeof (firstContent as any).blob === 'string') {
          htmlContent = (firstContent as any).blob;
        }
      }
    } else if (contents && typeof contents === 'object') {
      // Fallback: handle if contents is a single object instead of array
      const recordContent = contents as Record<string, unknown>;
      if (typeof recordContent.text === 'string') {
        htmlContent = recordContent.text;
      } else if (typeof recordContent.blob === 'string') {
        htmlContent = recordContent.blob;
      }
    }

    if (!htmlContent) {
      return c.html(
        '<html><body>Error: No HTML content found</body></html>',
        404
      );
    }

    const aemWidgetStateKey = `aem-widget-state:${toolName}:${toolId}`;

    // OpenAI Apps SDK bridge script
    const apiScript = `
      <script>
        (function() {
          'use strict';

          const openaiAPI = {
            toolInput: ${JSON.stringify(toolInput)},
            toolOutput: ${JSON.stringify(toolOutput)},
            toolResponseMetadata: ${JSON.stringify(toolResponseMetadata ?? null)},
            displayMode: 'inline',
            maxHeight: 600,
            theme: ${JSON.stringify(theme ?? 'dark')},
            locale: 'en-US',
            safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
            userAgent: {
              device: { type: 'desktop' },
              capabilities: { hover: true, touch: false }
            },
            widgetState: null,

            async setWidgetState(state) {
              this.widgetState = state;
              try {
                localStorage.setItem(${JSON.stringify(aemWidgetStateKey)}, JSON.stringify(state));
              } catch (err) {
                console.error('Failed to save AEM Widget state:', err);
              }
              window.parent.postMessage({
                type: 'openai:setWidgetState',
                toolId: ${JSON.stringify(toolId)},
                state
              }, '*');
            },

            async callTool(toolName, params = {}) {
              return new Promise((resolve, reject) => {
                const requestId = \`tool_\${Date.now()}_\${Math.random()}\`;
                const handler = (event) => {
                  if (event.data.type === 'openai:callTool:response' &&
                      event.data.requestId === requestId) {
                    window.removeEventListener('message', handler);
                    if (event.data.error) {
                      reject(new Error(event.data.error));
                    } else {
                      resolve(event.data.result);
                    }
                  }
                };
                window.addEventListener('message', handler);
                window.parent.postMessage({
                  type: 'openai:callTool',
                  requestId,
                  toolName,
                  params
                }, '*');
                setTimeout(() => {
                  window.removeEventListener('message', handler);
                  reject(new Error('Tool call timeout'));
                }, 30000);
              });
            },

            async sendFollowupTurn(message) {
              const payload = typeof message === 'string'
                ? { prompt: message }
                : message;
              window.parent.postMessage({
                type: 'openai:sendFollowup',
                message: payload.prompt || payload
              }, '*');
            },

            async requestDisplayMode(options = {}) {
              const mode = options.mode || 'inline';
              this.displayMode = mode;
              window.parent.postMessage({
                type: 'openai:requestDisplayMode',
                mode
              }, '*');
              return { mode };
            },

            async sendFollowUpMessage(args) {
              const prompt = typeof args === 'string' ? args : (args?.prompt || '');
              return this.sendFollowupTurn(prompt);
            },

            async openExternal(options) {
              const href = typeof options === 'string' ? options : options?.href;
              if (!href) {
                throw new Error('href is required for openExternal');
              }
              window.parent.postMessage({
                type: 'openai:openExternal',
                href
              }, '*');
              window.open(href, '_blank', 'noopener,noreferrer');
            }
          };

          // Define window.openai
          Object.defineProperty(window, 'openai', {
            value: openaiAPI,
            writable: false,
            configurable: false,
            enumerable: true
          });

          // Define window.webplus (alias)
          Object.defineProperty(window, 'webplus', {
            value: openaiAPI,
            writable: false,
            configurable: false,
            enumerable: true
          });

          // Dispatch initial globals event
          setTimeout(() => {
            try {
              const globalsEvent = new CustomEvent('openai:set_globals', {
                detail: {
                  globals: {
                    displayMode: openaiAPI.displayMode,
                    maxHeight: openaiAPI.maxHeight,
                    theme: openaiAPI.theme,
                    locale: openaiAPI.locale,
                    safeArea: openaiAPI.safeArea,
                    userAgent: openaiAPI.userAgent
                  }
                }
              });
              window.dispatchEvent(globalsEvent);
            } catch (err) {
              console.error('[AEM Widget] Failed to dispatch globals event:', err);
            }
          }, 0);

          // Restore AEM Widget state from localStorage
          setTimeout(() => {
            try {
              const stored = localStorage.getItem(${JSON.stringify(aemWidgetStateKey)});
              if (stored && window.openai) {
                window.openai.widgetState = JSON.parse(stored);
              }
            } catch (err) {
              console.error('[AEM Widget] Failed to restore AEM Widget state:', err);
            }
          }, 0);

          // Listen for theme changes from parent
          window.addEventListener('message', (event) => {
            if (event.data.type === 'openai:set_globals') {
              const { globals } = event.data;

              if (globals?.theme && window.openai) {
                window.openai.theme = globals.theme;

                // Dispatch event for widgets that use useTheme() hook
                try {
                  const globalsEvent = new CustomEvent('openai:set_globals', {
                    detail: { globals: { theme: globals.theme } }
                  });
                  window.dispatchEvent(globalsEvent);
                } catch (err) {
                  console.error('[AEM Widget] Failed to dispatch theme change:', err);
                }
              }
            }
          });
        })();
      </script>
    `;

    // Inject the bridge script into the HTML
    let modifiedHtml;
    if (htmlContent.includes('<html>') && htmlContent.includes('<head>')) {
      modifiedHtml = htmlContent.replace(
        '<head>',
        `<head><base href="/">${apiScript}`
      );
    } else {
      modifiedHtml = `<!DOCTYPE html>
<html>
<head>
  <base href="/">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${apiScript}
</head>
<body>
  ${htmlContent}
</body>
</html>`;
    }

    // Security headers
    const trustedCdns = [
      'https://persistent.oaistatic.com',
      'https://*.oaistatic.com',
      'https://unpkg.com',
      'https://cdn.jsdelivr.net',
      'https://cdnjs.cloudflare.com',
      'https://cdn.skypack.dev',
    ].join(' ');

    c.header(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${trustedCdns}`,
        "worker-src 'self' blob:",
        "child-src 'self' blob:",
        `style-src 'self' 'unsafe-inline' ${trustedCdns}`,
        "img-src 'self' data: https: blob:",
        "media-src 'self' data: https: blob:",
        `font-src 'self' data: ${trustedCdns}`,
        "connect-src 'self' https: wss: ws:",
        "frame-ancestors 'self'",
      ].join('; ')
    );
    c.header('X-Frame-Options', 'SAMEORIGIN');
    c.header('X-Content-Type-Options', 'nosniff');

    // Disable caching for AEM Widget content
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');

    return c.html(modifiedHtml);
  } catch (error) {
    console.error('Error serving AEM Widget content:', error);
    return c.html(
      `<html><body>Error: ${error instanceof Error ? error.message : 'Unknown error'}</body></html>`,
      500
    );
  }
});

export default openai;
