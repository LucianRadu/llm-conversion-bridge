import { useEffect, useRef, useState } from 'react';
import { ProgressCircle } from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };

interface AEMWidgetRendererProps {
  componentUrl: string;
  toolName: string;
  toolId: string;
  toolInput: Record<string, any>;
  toolOutput?: any;
  toolResponseMetadata?: Record<string, any>;
  serverId: string;
  onClose?: () => void;
}

/**
 * AEMWidgetRenderer renders AEM Widgets (OpenAI Apps SDK) in an iframe
 * Provides window.openai API bridge for AEM Widget interaction
 */
export function AEMWidgetRenderer({
  componentUrl,
  toolName,
  toolId,
  toolInput,
  toolOutput,
  toolResponseMetadata,
  serverId,
  onClose,
}: AEMWidgetRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aemWidgetUrl, setAemWidgetUrl] = useState<string | null>(null);

  // Storage key for AEM Widget state
  const aemWidgetStateKey = `aem-widget-state:${toolName}:${toolId}`;

  // Store AEM Widget data server-side
  useEffect(() => {
    if (componentUrl.startsWith('ui://') && serverId) {
      const storeAndSetUrl = async () => {
        try {
          await fetch('/api/openai/aem-widget/store', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              serverId,
              uri: componentUrl,
              toolInput,
              toolOutput,
              toolResponseMetadata,
              toolId,
              toolName,
              theme: 'dark', // TODO: Get from theme context
            }),
          });

          // Only set URL after data is stored
          const url = `/api/openai/aem-widget/${toolId}`;
          setAemWidgetUrl(url);
        } catch (error) {
          console.error('Error storing AEM Widget data:', error);
          setError(
            error instanceof Error ? error.message : 'Failed to prepare AEM Widget'
          );
        }
      };

      storeAndSetUrl();
    } else if (
      componentUrl.startsWith('http://') ||
      componentUrl.startsWith('https://')
    ) {
      // External URLs use src directly
      setAemWidgetUrl(componentUrl);
    }
  }, [componentUrl, serverId, toolInput, toolOutput, toolResponseMetadata, toolId, toolName]);

  // Handle postMessage communication with AEM Widget iframe
  useEffect(() => {
    if (!aemWidgetUrl) return;

    const handleMessage = async (event: MessageEvent) => {
      // Only accept messages from our iframe
      if (
        !iframeRef.current ||
        event.source !== iframeRef.current.contentWindow
      ) {
        return;
      }

      switch (event.data.type) {
        case 'openai:setWidgetState':
          try {
            localStorage.setItem(
              aemWidgetStateKey,
              JSON.stringify(event.data.state)
            );
          } catch (err) {
            console.error('Failed to save AEM Widget state:', err);
          }
          break;

        case 'openai:callTool':
          // TODO: Implement tool calling from AEM Widgets
          console.log('AEM Widget requested tool call:', event.data);
          break;

        case 'openai:sendFollowup':
          console.log('AEM Widget sent follow-up message:', event.data);
          break;

        case 'openai:closeWidget':
          if (onClose) {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    const handleLoad = () => {
      setIsReady(true);
      setError(null);
    };

    const handleError = () => {
      setError('Failed to load AEM Widget');
    };

    const iframe = iframeRef.current;
    iframe?.addEventListener('load', handleLoad);
    iframe?.addEventListener('error', handleError as any);

    return () => {
      window.removeEventListener('message', handleMessage);
      iframe?.removeEventListener('load', handleLoad);
      iframe?.removeEventListener('error', handleError as any);
    };
  }, [aemWidgetUrl, aemWidgetStateKey, onClose]);

  return (
    <div style={{ width: '100%', height: '100%' }} id="aem-widget-renderer-container">
      {error && (
        <div
          className="aem-widget-error"
          style={{
            border: '1px solid var(--spectrum-global-color-red-600)',
            backgroundColor: 'var(--spectrum-global-color-red-100)',
            padding: '8px',
            borderRadius: '4px',
            marginBottom: '16px'
          }}
        >
          <span className={style({ color: 'red-900' })}>
            Failed to load AEM Widget: {error}
          </span>
        </div>
      )}

      {!isReady && aemWidgetUrl && (
        <div
          className="aem-widget-loading"
          style={{
            border: '1px solid var(--spectrum-global-color-blue-600)',
            backgroundColor: 'var(--spectrum-global-color-blue-100)',
            padding: '8px',
            borderRadius: '4px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ProgressCircle aria-label="Loading AEM Widget" isIndeterminate />
          <span className={style({ color: 'blue-900' })} style={{ marginLeft: '8px' }}>
            Loading AEM Widget...
          </span>
        </div>
      )}

      {aemWidgetUrl ? (
        <iframe
          ref={iframeRef}
          src={aemWidgetUrl}
          id="aem-widget-iframe"
          className="aem-widget-iframe"
          style={{
            width: '100%',
            height: '600px',
            minHeight: '400px',
            maxHeight: '80vh',
            border: '1px solid var(--spectrum-global-color-gray-400)',
            borderRadius: '4px',
            backgroundColor: 'var(--spectrum-global-color-gray-50)',
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          title={`AEM Widget: ${toolName}`}
          allow="web-share"
        />
      ) : !error ? (
        <div
          className="aem-widget-preparing"
          style={{
            border: '1px solid var(--spectrum-global-color-yellow-600)',
            backgroundColor: 'var(--spectrum-global-color-yellow-100)',
            padding: '8px',
            borderRadius: '4px'
          }}
        >
          <span className={style({ color: 'yellow-900' })}>
            Preparing AEM Widget URL...
          </span>
        </div>
      ) : null}
    </div>
  );
}
