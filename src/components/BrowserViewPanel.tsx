import React, { useEffect, useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { 
  Maximize2, 
  Minimize2, 
  Monitor, 
  User, 
  Bot, 
  X, 
  ExternalLink, 
  MessageSquare, 
  Plus,
  MoreHorizontal,
  RefreshCw,
  Eye,
  EyeOff,
  Layers,
  Activity,
  Zap
} from 'lucide-react';
import { BrowserEmbed } from './BrowserEmbed';
import { HumanControlModal } from './HumanControlModal';
import { useBrowserWebSocket } from '../services/browserWebSocket';
import { motion, AnimatePresence } from 'framer-motion';

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

interface TabInfo {
  tab_id: string;
  url: string;
  title: string;
  state: 'active' | 'background' | 'loading' | 'error' | 'closed';
  screenshot?: string;
  last_update: string;
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
  // Enhanced multi-tab support
  tabs?: TabInfo[];
  active_tab_id?: string;
  tab_monitoring_enabled?: boolean;
  features?: {
    mcp_tools_enabled?: boolean;
    voice_enabled?: boolean;
    tab_monitoring_enabled?: boolean;
    live_url_enabled?: boolean;
  };
  integration_status?: {
    mcp_tools?: Record<string, any>;
    voice_agent?: { enabled: boolean };
    tab_monitor?: { active: boolean };
  };
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
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showLiveView, setShowLiveView] = useState<Record<string, boolean>>({});
  const [userControlledSessions, setUserControlledSessions] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionTabs, setSessionTabs] = useState<string[]>([]);
  const [embedMode, setEmbedMode] = useState<'screenshot' | 'browser'>('screenshot');
  const [isTransitioningControl, setIsTransitioningControl] = useState<string | null>(null);
  const [showControlModal, setShowControlModal] = useState(false);
  const [pendingControlSession, setPendingControlSession] = useState<string | null>(null);
  const [showTabManager, setShowTabManager] = useState(false);
  const [tabRefreshingStates, setTabRefreshingStates] = useState<Set<string>>(new Set());

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
    console.log('🎛️  BROWSER VIEW PANEL DEBUG: Merging sessions');
    console.log('📊 Prop sessions:', sessions.length);
    console.log('📊 WebSocket sessions:', wsSessions.length);
    console.log('📊 Is panel active:', isActive);
    
    const sessionMap = new Map();
    
    // Add prop sessions
    sessions.forEach(session => {
      console.log('📊 Adding prop session:', session.session_id);
      sessionMap.set(session.session_id, session);
    });
    
    // Merge with WebSocket sessions
    wsSessions.forEach(wsSession => {
      console.log('📊 Processing WebSocket session:', wsSession.session_id);
      const existing = sessionMap.get(wsSession.session_id);
      if (existing) {
        console.log('📊 Merging with existing session:', wsSession.session_id);
        sessionMap.set(wsSession.session_id, { ...existing, ...wsSession });
      } else {
        console.log('📊 Adding new WebSocket session:', wsSession.session_id);
        sessionMap.set(wsSession.session_id, wsSession);
      }
    });
    
    const result = Array.from(sessionMap.values());
    console.log('📊 Final merged sessions:', result.length);
    console.log('📊 Sessions with screenshots:', result.filter(s => s.screenshot).length);
    
    return result;
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
          
          {/* Enhanced Session tabs with multi-tab support */}
          {allSessions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
              {/* Session selector */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {allSessions.map((session, idx) => (
                  <motion.button
                    key={session.session_id}
                    onClick={() => setActiveSessionId(session.session_id)}
                    className={session.session_id === activeSessionId ? 'ice-glass-elevated interactive-scale' : 'ice-glass interactive-scale'}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: '10px',
                      border: 'none',
                      color: session.session_id === activeSessionId 
                        ? 'var(--text-primary)' 
                        : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      position: 'relative',
                      background: session.session_id === activeSessionId 
                        ? 'linear-gradient(135deg, var(--ice-highlight) 0%, var(--ice-crystalline) 100%)'
                        : 'transparent'
                    }}
                  >
                    <Monitor size={12} />
                    <span style={{ fontWeight: session.session_id === activeSessionId ? '600' : '400' }}>
                      Session {idx + 1}
                    </span>
                    
                    {/* Status indicators */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {session.userControl && (
                        <User size={10} style={{ color: 'var(--accent-blue)' }} />
                      )}
                      {session.features?.mcp_tools_enabled && (
                        <Zap size={10} style={{ color: 'var(--accent-green)' }} />
                      )}
                      {session.features?.voice_enabled && (
                        <MessageSquare size={10} style={{ color: 'var(--accent-purple)' }} />
                      )}
                      {session.features?.tab_monitoring_enabled && (
                        <Layers size={10} style={{ color: 'var(--accent-orange)' }} />
                      )}
                    </div>

                    {/* Tab count indicator */}
                    {session.tabs && session.tabs.length > 1 && (
                      <div 
                        className="ice-glass"
                        style={{
                          minWidth: '18px',
                          height: '18px',
                          borderRadius: '9px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: '600',
                          color: 'var(--accent-blue)',
                          background: 'var(--ice-crystalline)'
                        }}
                      >
                        {session.tabs.length}
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Tab manager toggle for active session */}
              {activeSession && activeSession.tabs && activeSession.tabs.length > 1 && (
                <button
                  onClick={() => setShowTabManager(!showTabManager)}
                  className={showTabManager ? 'ice-glass-elevated interactive-scale glow-border' : 'ice-glass interactive-scale'}
                  style={{
                    padding: '6px 8px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    color: showTabManager ? 'var(--accent-blue-bright)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Layers size={14} />
                  <span style={{ fontWeight: '500' }}>Tabs</span>
                </button>
              )}
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

      {/* Enhanced Tab Manager Overlay */}
      <AnimatePresence>
        {showTabManager && activeSession && activeSession.tabs && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="ice-glass-elevated"
            style={{
              position: 'absolute',
              top: '70px',
              left: '20px',
              right: '20px',
              zIndex: 20,
              borderRadius: '16px',
              padding: '16px',
              maxHeight: '300px',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, var(--ice-highlight) 0%, var(--ice-crystalline) 100%)',
              border: '1px solid var(--ice-border-bright)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--ice-border)'
            }}
          >
            {/* Tab Manager Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--ice-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} style={{ color: 'var(--accent-blue)' }} />
                <span style={{ 
                  fontWeight: '600', 
                  fontSize: '14px',
                  color: 'var(--text-primary)'
                }}>
                  Browser Tabs ({activeSession.tabs.length})
                </span>
              </div>
              <button
                onClick={() => setShowTabManager(false)}
                className="ice-glass interactive-scale"
                style={{
                  padding: '4px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Tab List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {activeSession.tabs.map((tab, index) => (
                <motion.div
                  key={tab.tab_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    setActiveTabId(tab.tab_id);
                    // Here you would call the backend to switch to this tab
                  }}
                  className={`ice-glass interactive-scale ${tab.tab_id === activeSession.active_tab_id ? 'glow-border' : ''}`}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: tab.tab_id === activeSession.active_tab_id 
                      ? 'linear-gradient(135deg, var(--accent-blue) / 0.2, var(--accent-blue) / 0.1)'
                      : 'transparent',
                    border: tab.tab_id === activeSession.active_tab_id 
                      ? '1px solid var(--accent-blue)' 
                      : '1px solid var(--ice-border)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Tab State Indicator */}
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: tab.state === 'active' ? 'var(--accent-green)' :
                                 tab.state === 'loading' ? 'var(--accent-orange)' :
                                 tab.state === 'error' ? 'var(--accent-red)' :
                                 'var(--text-tertiary)',
                      animation: tab.state === 'loading' ? 'pulse 2s infinite' : 'none'
                    }} />

                    {/* Tab Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: 'var(--text-primary)',
                        marginBottom: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {tab.title || 'Loading...'}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {tab.url}
                      </div>
                    </div>

                    {/* Tab Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {/* Refresh Tab */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTabRefreshingStates(prev => new Set([...prev, tab.tab_id]));
                          // Here you would call the backend to refresh this tab
                          setTimeout(() => {
                            setTabRefreshingStates(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(tab.tab_id);
                              return newSet;
                            });
                          }, 2000);
                        }}
                        className="ice-glass interactive-scale"
                        disabled={tabRefreshingStates.has(tab.tab_id)}
                        style={{
                          padding: '4px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          cursor: tabRefreshingStates.has(tab.tab_id) ? 'not-allowed' : 'pointer',
                          opacity: tabRefreshingStates.has(tab.tab_id) ? 0.5 : 1
                        }}
                      >
                        <RefreshCw 
                          size={12} 
                          style={{ 
                            animation: tabRefreshingStates.has(tab.tab_id) ? 'spin 1s linear infinite' : 'none'
                          }} 
                        />
                      </button>

                      {/* Close Tab */}
                      {activeSession.tabs.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Here you would call the backend to close this tab
                          }}
                          className="ice-glass interactive-scale"
                          style={{
                            padding: '4px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active tab glow effect */}
                  {tab.tab_id === activeSession.active_tab_id && (
                    <div 
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '12px',
                        background: 'linear-gradient(90deg, transparent 0%, var(--accent-blue) / 0.1 50%, transparent 100%)',
                        animation: 'shimmer 3s ease-in-out infinite'
                      }}
                    />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Tab Actions Footer */}
            <div style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid var(--ice-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={() => {
                  // Here you would call the backend to create a new tab
                }}
                className="ice-glass interactive-scale"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-blue-bright) 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '500'
                }}
              >
                <Plus size={12} />
                New Tab
              </button>

              <div style={{
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Activity size={10} />
                Last updated: {new Date(activeSession.last_update || Date.now()).toLocaleTimeString()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                liveUrl={activeSession.live_url}
                isBrowserless={activeSession.is_browserless || false}
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