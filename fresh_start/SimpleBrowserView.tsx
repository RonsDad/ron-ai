import React, { useState, useEffect, useRef } from 'react';

interface BrowserViewProps {
  sessionId: string;
  onClose: () => void;
}

export const SimpleBrowserView: React.FC<BrowserViewProps> = ({ sessionId, onClose }) => {
  const [screenshot, setScreenshot] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [isHumanControl, setIsHumanControl] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket(`ws://localhost:8000/ws/${sessionId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'browser_update') {
        setScreenshot(data.screenshot);
        setUrl(data.url);
        setTitle(data.title);
        setIsHumanControl(data.is_human_control);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  const toggleControl = async () => {
    const newControlState = !isHumanControl;
    
    const response = await fetch('/api/control-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        human_control: newControlState,
        additional_context: newControlState ? undefined : additionalContext
      })
    });

    if (response.ok) {
      setIsHumanControl(newControlState);
      if (!newControlState) {
        setAdditionalContext('');
      }
    }
  };

  const stopAgent = async () => {
    await fetch(`/api/stop-agent/${sessionId}`, {
      method: 'POST'
    });
    onClose();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 500 }}>Browser View</span>
          {url && (
            <span style={{ fontSize: '12px', color: '#666' }}>
              {new URL(url).hostname}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={toggleControl}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: isHumanControl ? '#4CAF50' : '#2196F3',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {isHumanControl ? '👤 Human Control' : '🤖 AI Control'}
          </button>
          
          <button
            onClick={stopAgent}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Stop
          </button>
        </div>
      </div>

      {/* Additional Context Input (shown when switching to AI control) */}
      {isHumanControl && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fff9c4',
          borderBottom: '1px solid #f0e68c'
        }}>
          <input
            type="text"
            placeholder="Additional context for AI when resuming control..."
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          />
        </div>
      )}

      {/* Screenshot Display */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflow: 'auto'
      }}>
        {screenshot ? (
          <img
            src={`data:image/png;base64,${screenshot}`}
            alt="Browser view"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          />
        ) : (
          <div style={{
            textAlign: 'center',
            color: '#666'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              🌐
            </div>
            <p>Waiting for browser content...</p>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {(url || title) && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: 'white',
          borderTop: '1px solid #e0e0e0',
          fontSize: '12px',
          color: '#666',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{title || 'Untitled'}</span>
          <span>{url}</span>
        </div>
      )}
    </div>
  );
}; 