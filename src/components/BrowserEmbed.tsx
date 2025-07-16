import React, { useEffect, useRef, useState } from 'react';

interface BrowserEmbedProps {
  browserUrl: string;
  sessionId: string;
  isActive: boolean;
  liveUrl?: string;
  isBrowserless?: boolean;
  onError?: (error: string) => void;
}

/**
 * BrowserEmbed component that displays the actual browser window
 * Uses Chrome DevTools Protocol to get a live view of the browser
 */
export const BrowserEmbed: React.FC<BrowserEmbedProps> = ({
  browserUrl,
  sessionId,
  isActive,
  liveUrl,
  isBrowserless = false,
  onError
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageUrl, setPageUrl] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isActive || !browserUrl) return;

    const connectToBrowser = async () => {
      try {
        // If using Browserless and have a live URL, use it directly
        if (isBrowserless && liveUrl) {
          setPageUrl(liveUrl);
          setIsConnecting(false);
          return;
        }

        // For local browsers, use CDP
        const url = new URL(browserUrl);
        const port = url.port || '9222';
        
        // First, get the WebSocket debugger URL for the page
        const response = await fetch(`http://localhost:${port}/json`);
        if (!response.ok) throw new Error('Failed to fetch browser pages');
        
        const pages = await response.json();
        const page = pages.find((p: any) => p.type === 'page') || pages[0];
        
        if (!page || !page.webSocketDebuggerUrl) {
          throw new Error('No debuggable page found');
        }

        // For local browsers, we'll use the page URL
        setPageUrl(page.url);
        setIsConnecting(false);

        // Connect to Chrome DevTools Protocol via WebSocket for control
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('Connected to browser via CDP');
          
          // Enable necessary domains
          ws.send(JSON.stringify({
            id: 1,
            method: 'Page.enable'
          }));
          
          ws.send(JSON.stringify({
            id: 2,
            method: 'Runtime.enable'
          }));
        };

        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          
          // Handle page navigation events
          if (message.method === 'Page.frameNavigated' && message.params.frame.parentId === undefined) {
            setPageUrl(message.params.frame.url);
          }
        };

        ws.onerror = (err) => {
          console.error('WebSocket error:', err);
          setError('Failed to connect to browser');
        };

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        setIsConnecting(false);
        onError?.(errorMsg);
      }
    };

    connectToBrowser();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [browserUrl, isActive, liveUrl, isBrowserless, onError]);

  if (!isActive) return null;

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'var(--color-background-secondary)',
        color: 'var(--color-text-secondary)',
        padding: '2rem',
        textAlign: 'center',
        borderRadius: '0.5rem'
      }}>
        <div>
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
            Browser Connection Error
          </h3>
          <p>{error}</p>
          <p style={{ fontSize: '0.875rem', marginTop: '1rem', opacity: 0.7 }}>
            The browser window cannot be embedded directly due to security restrictions.
            The browser is running at {browserUrl}
          </p>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'var(--color-background-secondary)',
        color: 'var(--color-text-secondary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ marginBottom: '1rem' }} />
          <p>Connecting to browser...</p>
        </div>
      </div>
    );
  }

  // If we have a Browserless live URL, we can embed it directly
  if (isBrowserless && liveUrl) {
    return (
      <div ref={containerRef} style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'var(--color-background-primary)',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '1rem',
          background: 'var(--color-background-secondary)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: '#4ade80',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Browserless Live Session
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
            {pageUrl && new URL(pageUrl).hostname}
          </div>
        </div>
        
        <iframe
          src={liveUrl}
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: 'white'
          }}
          title="Browserless Live Session"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    );
  }

  // For local browsers, show connection info
  return (
    <div ref={containerRef} style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      background: 'var(--color-background-primary)',
      borderRadius: '0.5rem',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        padding: '1rem',
        background: 'var(--color-background-secondary)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            background: '#4ade80',
            display: 'inline-block'
          }} />
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Browser Connected
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
          {pageUrl && new URL(pageUrl).hostname}
        </div>
      </div>
      
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div>
          <h3 style={{ marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
            Browser Window Active
          </h3>
          <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary)' }}>
            The browser is running at:
          </p>
          <code style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: 'var(--color-background-tertiary)',
            borderRadius: '0.25rem',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            marginBottom: '1.5rem'
          }}>
            {browserUrl}
          </code>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
            Current page: {pageUrl || 'Loading...'}
          </p>
          
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'var(--color-background-tertiary)',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)'
          }}>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Note:</strong> For security reasons, local browser windows cannot be embedded directly.
            </p>
            <p>
              The AI agent is controlling the browser in the background. You can see screenshots in the main view.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 