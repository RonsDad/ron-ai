import React, { useEffect, useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Maximize2, Minimize2, Monitor, User, Bot, X, ExternalLink, MessageSquare } from 'lucide-react';
import { BrowserEmbed } from './BrowserEmbed';
import { HumanControlModal } from './HumanControlModal';
import { useBrowserWebSocket } from '../services/browserWebSocket';

// Add CSS for spinner animation
const spinnerStyle = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinnerStyle;
  document.head.appendChild(style);
}

interface BrowserSession {
  session_id: string;
  browser_url: string;
  screenshot?: string;
  current_url?: string;
  current_title?: string;
  task?: string;
  last_update?: string;
  userControl?: boolean;
}

interface BrowserViewPanelProps {
  isActive: boolean;
  sessions: BrowserSession[];
  isAutomating?: boolean;
  onUserControlChange?: (sessionId: string, hasControl: boolean) => void;
  onCloseSession?: (sessionId: string) => void;
  onCloseAll?: () => void;
}

export const BrowserViewPanel: React.FC<BrowserViewPanelProps> = ({
  isActive,
  sessions = [],
  isAutomating,
  onUserControlChange,
  onCloseSession,
  onCloseAll,
}) => {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showLiveView, setShowLiveView] = useState<Record<string, boolean>>({});
  const [userControlledSessions, setUserControlledSessions] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionTabs, setSessionTabs] = useState<string[]>([]);
  const [embedMode, setEmbedMode] = useState<'screenshot' | 'browser'>('screenshot');
  const [isTransitioningControl, setIsTransitioningControl] = useState<string | null>(null);
  const [showControlModal, setShowControlModal] = useState(false);
  const [pendingControlSession, setPendingControlSession] = useState<string | null>(null);

  // WebSocket integration
  const { 
    isConnected, 
    sessions: wsSessions, 
    requestControlTransition, 
    sendUserFeedback,
    subscribeToSession,
    requestScreenshot 
  } = useBrowserWebSocket();

  // Merge WebSocket sessions with prop sessions
  const allSessions = React.useMemo(() => {
    const sessionMap = new Map();
    
    // Add prop sessions
    sessions.forEach(session => {
      sessionMap.set(session.session_id, session);
    });
    
    // Merge with WebSocket sessions
    wsSessions.forEach(wsSession => {
      const existing = sessionMap.get(wsSession.session_id);
      if (existing) {
        sessionMap.set(wsSession.session_id, { ...existing, ...wsSession });
      } else {
        sessionMap.set(wsSession.session_id, wsSession);
      }
    });
    
    return Array.from(sessionMap.values());
  }, [sessions, wsSessions]);

  // Update active session when sessions change
  useEffect(() => {
    if (allSessions.length > 0) {
      // Keep existing active session if it still exists
      const activeExists = allSessions.some(s => s.session_id === activeSessionId);
      if (!activeExists || !activeSessionId) {
        setActiveSessionId(allSessions[0].session_id);
      }
      
      // Update session tabs
      setSessionTabs(allSessions.map(s => s.session_id));
      
      // Sync user controlled sessions with session state
      const newControlledSessions = new Set<string>();
      allSessions.forEach(session => {
        if (session.userControl) {
          newControlledSessions.add(session.session_id);
        }
      });
      setUserControlledSessions(newControlledSessions);
    } else {
      setActiveSessionId(null);
      setSessionTabs([]);
      setUserControlledSessions(new Set());
    }
  }, [allSessions, activeSessionId]);

  // Subscribe to active session updates
  useEffect(() => {
    if (activeSessionId && isConnected) {
      subscribeToSession(activeSessionId);
    }
  }, [activeSessionId, isConnected, subscribeToSession]);

  // Handle user control toggle with modal
  const handleUserControlToggle = async (sessionId: string) => {
    const hasControl = userControlledSessions.has(sessionId);
    
    if (!hasControl) {
      // Show modal for taking control
      setPendingControlSession(sessionId);
      setShowControlModal(true);
    } else {
      // Release control immediately
      await handleControlTransition(sessionId, false);
    }
  };

  // Handle control transition with WebSocket
  const handleControlTransition = async (sessionId: string, takeControl: boolean, message?: string, actionType?: 'guidance' | 'handoff') => {
    setIsTransitioningControl(sessionId);
    
    try {
      // Use WebSocket for real-time control transition
      await requestControlTransition(sessionId, takeControl, message, actionType);
      
      // Update local state
      const newControlledSessions = new Set(userControlledSessions);
      if (takeControl) {
        newControlledSessions.add(sessionId);
        // Switch to screenshot view when taking control for better responsiveness
        setShowLiveView(prev => ({ ...prev, [sessionId]: false }));
      } else {
        newControlledSessions.delete(sessionId);
        // Switch back to screenshot view when releasing control
        setShowLiveView(prev => ({ ...prev, [sessionId]: false }));
      }
      
      setUserControlledSessions(newControlledSessions);
      
      // Call prop callback for backward compatibility
      await onUserControlChange?.(sessionId, takeControl);
      
    } catch (error) {
      console.error('Failed to toggle control:', error);
      // Revert state on error
      const newControlledSessions = new Set(userControlledSessions);
      if (takeControl) {
        newControlledSessions.delete(sessionId);
      } else {
        newControlledSessions.add(sessionId);
      }
      setUserControlledSessions(newControlledSessions);
    } finally {
      // Clear loading state after a delay
      setTimeout(() => setIsTransitioningControl(null), 1000);
    }
  };

  // Handle modal submission
  const handleModalSubmit = async (message: string, actionType: 'guidance' | 'handoff') => {
    if (!pendingControlSession) return;
    
    try {
      if (actionType === 'guidance') {
        // Send guidance without taking control
        await sendUserFeedback(pendingControlSession, message, actionType);
      } else {
        // Take control with message
        await handleControlTransition(pendingControlSession, true, message, actionType);
      }
    } finally {
      setShowControlModal(false);
      setPendingControlSession(null);
    }
  };

  // Get active session
  const activeSession = allSessions.find(s => s.session_id === activeSessionId);

  if (!isActive || allSessions.length === 0) {
    return (
      <div className="browser-view-panel-empty animate-fade-in" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'var(--background-void-gradient)',
        color: 'var(--text-secondary)',
        fontSize: '14px',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div className="ice-glass animate-pulse-gentle" style={{
          width: '80px',
          height: '80px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem'
        }}>
          <Monitor size={32} style={{ color: 'var(--accent-blue)' }} />
        </div>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: 'var(--text-primary)', 
          marginBottom: '0.5rem' 
        }}>
          No Active Browser Sessions
        </h3>
        <p style={{ 
          opacity: 0.7, 
          lineHeight: 1.5,
          color: 'var(--text-tertiary)'
        }}>
          Start a conversation with Claude to begin browser automation
        </p>
      </div>
    );
  }

  return (
    <div className={`ice-glass-elevated animate-fade-in ${isFullscreen ? 'fullscreen' : ''}`} style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: isFullscreen ? 'fixed' : 'relative',
      top: isFullscreen ? 0 : 'auto',
      left: isFullscreen ? 0 : 'auto',
      right: isFullscreen ? 0 : 'auto',
      bottom: isFullscreen ? 0 : 'auto',
      zIndex: isFullscreen ? 9999 : 'auto',
      borderRadius: isFullscreen ? '16px' : '0',  // No rounded corners when not fullscreen
      borderTopLeftRadius: '16px',  // Keep left corners rounded
      borderBottomLeftRadius: '16px'
    }}>
      {/* Header */}
      <div className="ice-glass animate-slide-down" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid var(--ice-border)',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '0'  // No right rounded corner
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="ice-glass animate-pulse-gentle" style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Monitor size={16} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <span className="text-gradient" style={{ 
            fontWeight: 600, 
            fontSize: '16px'
          }}>
            Browser Control
          </span>
          
          {/* Session tabs */}
          {allSessions.length > 1 && (
            <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
              {allSessions.map((session, idx) => (
                <button
                  key={session.session_id}
                  onClick={() => setActiveSessionId(session.session_id)}
                  className={session.session_id === activeSessionId ? 'ice-glass interactive-scale' : 'glass-accent interactive-scale'}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    color: session.session_id === activeSessionId 
                      ? 'var(--text-primary)' 
                      : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Session {idx + 1}
                  {session.userControl && (
                    <User size={10} style={{ color: 'var(--accent-blue)' }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Connection status indicator */}
          <div 
            className="ice-glass"
            style={{
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: '600',
              color: isConnected ? 'var(--accent-green)' : 'var(--accent-orange)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <div 
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isConnected ? 'var(--accent-green)' : 'var(--accent-orange)',
                animation: isConnected ? 'none' : 'pulse 2s infinite'
              }}
            />
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </div>
          {/* View mode toggle */}
          <div className="ice-glass" style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            borderRadius: '12px'
          }}>
            <button
              onClick={() => setEmbedMode('browser')}
              className={embedMode === 'browser' ? 'ice-glass-elevated interactive-scale' : 'interactive-scale'}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: 'none',
                borderRadius: '8px',
                background: embedMode === 'browser' ? 'var(--ice-highlight)' : 'transparent',
                color: embedMode === 'browser' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontWeight: embedMode === 'browser' ? '600' : '400'
              }}
            >
              Browser
            </button>
            <button
              onClick={() => setEmbedMode('screenshot')}
              className={embedMode === 'screenshot' ? 'ice-glass-elevated interactive-scale' : 'interactive-scale'}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: 'none',
                borderRadius: '8px',
                background: embedMode === 'screenshot' ? 'var(--ice-highlight)' : 'transparent',
                color: embedMode === 'screenshot' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontWeight: embedMode === 'screenshot' ? '600' : '400'
              }}
            >
              Screenshot
            </button>
          </div>

          {/* Control toggle */}
          {activeSession && (
            <button
              onClick={() => handleUserControlToggle(activeSession.session_id)}
              disabled={isTransitioningControl === activeSession.session_id}
              className={userControlledSessions.has(activeSession.session_id) 
                ? 'ice-glass-elevated interactive-scale glow-border' 
                : 'ice-glass interactive-scale'
              }
              style={{ 
                fontSize: '12px',
                fontWeight: '600',
                padding: '8px 16px',
                borderRadius: '12px',
                color: userControlledSessions.has(activeSession.session_id)
                  ? 'var(--accent-blue-bright)'
                  : 'var(--text-primary)',
                border: userControlledSessions.has(activeSession.session_id)
                  ? '1px solid var(--accent-blue)'
                  : '1px solid var(--ice-border)',
                background: userControlledSessions.has(activeSession.session_id)
                  ? 'var(--glass-accent-hover)'
                  : 'transparent',
                cursor: isTransitioningControl === activeSession.session_id ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: isTransitioningControl === activeSession.session_id ? 0.7 : 1
              }}
            >
              {isTransitioningControl === activeSession.session_id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="animate-pulse-gentle" style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid var(--ice-border)',
                    borderTop: '2px solid var(--accent-blue)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Switching...
                </div>
              ) : userControlledSessions.has(activeSession.session_id) ? (
                <>
                  <User size={14} style={{ marginRight: '6px' }} />
                  Human Control
                </>
              ) : (
                <>
                  <Bot size={14} style={{ marginRight: '6px' }} />
                  AI Control
                </>
              )}
            </button>
          )}

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="ice-glass interactive-scale"
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid var(--ice-border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Close button */}
          {onCloseAll && (
            <button
              onClick={onCloseAll}
              className="ice-glass interactive-scale"
              aria-label="Close browser panel"
              title="Close browser panel"
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid var(--ice-border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Browser content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {activeSession && (
          <>
            {/* Status bar */}
            {(activeSession.current_url || activeSession.task || userControlledSessions.has(activeSession.session_id)) && (
              <div className={userControlledSessions.has(activeSession.session_id) ? 'ice-glass-elevated glow-border' : 'ice-glass'} style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: '12px 16px',
                color: userControlledSessions.has(activeSession.session_id) 
                  ? 'var(--accent-blue-bright)'
                  : 'var(--text-primary)',
                fontSize: '12px',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                maxHeight: '48px',
                overflow: 'hidden'
              }}>
                {userControlledSessions.has(activeSession.session_id) && (
                  <div className="animate-pulse-gentle" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    fontWeight: 'bold'
                  }}>
                    <User size={12} />
                    <span className="glow-text-subtle">HUMAN CONTROL ACTIVE</span>
                  </div>
                )}
                {activeSession.current_url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ExternalLink size={12} />
                    <span style={{ color: 'var(--text-secondary)' }}>{activeSession.current_url}</span>
                  </div>
                )}
                {activeSession.task && (
                  <div className="ice-glass" style={{ 
                    marginLeft: 'auto',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    <span style={{ 
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      Task: {activeSession.task.length > 50 ? activeSession.task.substring(0, 50) + '...' : activeSession.task}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Browser embed or screenshot */}
            {embedMode === 'browser' && activeSession.browser_url ? (
              <BrowserEmbed
                browserUrl={activeSession.browser_url}
                sessionId={activeSession.session_id}
                isActive={true}
                onError={(error) => {
                  console.error('Browser embed error:', error);
                  // Fallback to screenshot mode on error
                  setEmbedMode('screenshot');
                }}
              />
            ) : (
              /* Screenshot view */
              activeSession.screenshot && (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--background-void-gradient)',
                  padding: '16px'
                }}>
                  <img
                    src={`data:image/png;base64,${activeSession.screenshot}`}
                    alt="Browser view"
                    className="animate-scale-in"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--ice-border)',
                      border: '1px solid var(--ice-border-bright)'
                    }}
                  />
                </div>
              )
            )}

            {/* No content fallback */}
            {!activeSession.screenshot && embedMode === 'screenshot' && (
              <div className="animate-fade-in" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                background: 'var(--background-void-gradient)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                textAlign: 'center',
                padding: '2rem'
              }}>
                <div className="ice-glass animate-pulse-gentle" style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid var(--ice-border)',
                    borderTop: '2px solid var(--accent-blue)',
                    borderRadius: '50%',
                    animation: 'spin 2s linear infinite'
                  }} />
                </div>
                <p style={{ 
                  opacity: 0.8, 
                  lineHeight: 1.5,
                  color: 'var(--text-tertiary)'
                }}>
                  Waiting for browser content...
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Human Control Modal */}
      <HumanControlModal
        isOpen={showControlModal}
        onClose={() => {
          setShowControlModal(false);
          setPendingControlSession(null);
        }}
        onSubmit={handleModalSubmit}
        sessionId={pendingControlSession || ''}
        currentUrl={activeSession?.current_url}
        isTransitioning={isTransitioningControl === pendingControlSession}
      />
    </div>
  );
};