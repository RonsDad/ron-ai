import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { 
  X, 
  User, 
  Bot, 
  Send, 
  MessageSquare, 
  Zap, 
  Mic, 
  MicOff,
  Mail,
  Calendar,
  Settings,
  Activity,
  Eye,
  EyeOff,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MCPTool {
  name: string;
  enabled: boolean;
  status: 'active' | 'disabled' | 'error' | 'authenticating';
  last_activity?: string;
}

interface VoiceStatus {
  enabled: boolean;
  listening: boolean;
  processing: boolean;
  confidence?: number;
}

interface ControlState {
  current_state: 'agent_active' | 'agent_paused' | 'human_requested' | 'human_active' | 'transition';
  duration?: number;
  last_transition?: string;
  human_actions_count?: number;
}

interface HumanControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string, action: 'guidance' | 'handoff') => void;
  sessionId: string;
  currentUrl?: string;
  isTransitioning?: boolean;
  // Enhanced props for advanced features
  mcpTools?: MCPTool[];
  voiceStatus?: VoiceStatus;
  controlState?: ControlState;
  onMCPAction?: (toolName: string, action: string) => void;
  onVoiceToggle?: () => void;
  onAgentPause?: () => void;
  onAgentResume?: () => void;
}

export const HumanControlModal: React.FC<HumanControlModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  sessionId,
  currentUrl,
  isTransitioning = false,
  mcpTools = [],
  voiceStatus,
  controlState,
  onMCPAction,
  onVoiceToggle,
  onAgentPause,
  onAgentResume
}) => {
  const [message, setMessage] = useState('');
  const [actionType, setActionType] = useState<'guidance' | 'handoff'>('guidance');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setActionType('guidance');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(message.trim(), actionType);
      onClose();
    } catch (error) {
      console.error('Error submitting human control message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div 
        className="ice-glass-elevated animate-scale-in"
        style={{
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          borderRadius: '20px',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div 
          className="ice-glass"
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--ice-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              className="ice-glass animate-pulse-gentle"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <User size={20} style={{ color: 'var(--accent-blue)' }} />
            </div>
            <div>
              <h2 
                className="text-gradient"
                style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  margin: 0 
                }}
              >
                Human Control Handoff
              </h2>
              <p 
                style={{ 
                  fontSize: '14px', 
                  color: 'var(--text-secondary)', 
                  margin: 0 
                }}
              >
                Session: {sessionId.substring(0, 8)}...
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="ice-glass interactive-scale"
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid var(--ice-border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Current URL */}
        {currentUrl && (
          <div 
            className="ice-glass"
            style={{
              padding: '12px 24px',
              borderBottom: '1px solid var(--ice-border)',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}
          >
            <strong>Current Page:</strong> {currentUrl}
          </div>
        )}

        {/* Enhanced Control State Display */}
        {controlState && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="ice-glass"
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--ice-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: controlState.current_state === 'agent_active' ? 'var(--accent-green)' :
                           controlState.current_state === 'human_active' ? 'var(--accent-blue)' :
                           controlState.current_state === 'agent_paused' ? 'var(--accent-orange)' :
                           'var(--accent-red)',
                animation: controlState.current_state === 'transition' ? 'pulse 2s infinite' : 'none'
              }} />
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                {controlState.current_state === 'agent_active' && 'AI Agent Active'}
                {controlState.current_state === 'human_active' && 'Human Control Active'}
                {controlState.current_state === 'agent_paused' && 'AI Agent Paused'}
                {controlState.current_state === 'transition' && 'Transitioning Control'}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {controlState.duration && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} style={{ color: 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {Math.floor(controlState.duration / 60)}m {controlState.duration % 60}s
                  </span>
                </div>
              )}
              
              {controlState.human_actions_count !== undefined && controlState.human_actions_count > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Activity size={12} style={{ color: 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    {controlState.human_actions_count} actions
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Advanced Controls Toggle */}
        {(mcpTools.length > 0 || voiceStatus || onAgentPause) && (
          <div 
            className="ice-glass"
            style={{
              padding: '12px 24px',
              borderBottom: '1px solid var(--ice-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
              Advanced Controls
            </span>
            <button
              onClick={() => setShowAdvancedControls(!showAdvancedControls)}
              className="ice-glass interactive-scale"
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Settings size={12} />
              {showAdvancedControls ? 'Hide' : 'Show'}
            </button>
          </div>
        )}

        {/* Advanced Controls Panel */}
        <AnimatePresence>
          {showAdvancedControls && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="ice-glass"
              style={{
                borderBottom: '1px solid var(--ice-border)',
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '16px 24px' }}>
                {/* Voice Controls */}
                {voiceStatus && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                        Voice Commands
                      </span>
                      <button
                        onClick={onVoiceToggle}
                        className={voiceStatus.enabled ? 'ice-glass-elevated interactive-scale glow-border' : 'ice-glass interactive-scale'}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: voiceStatus.enabled ? 'var(--glass-accent-hover)' : 'transparent',
                          color: voiceStatus.enabled ? 'var(--accent-blue-bright)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {voiceStatus.enabled ? <Mic size={12} /> : <MicOff size={12} />}
                        {voiceStatus.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                    
                    {voiceStatus.enabled && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {voiceStatus.listening && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'var(--accent-red)',
                              animation: 'pulse 1s infinite'
                            }} />
                            Listening...
                          </div>
                        )}
                        {voiceStatus.processing && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'var(--accent-orange)',
                              animation: 'pulse 1s infinite'
                            }} />
                            Processing...
                          </div>
                        )}
                        {voiceStatus.confidence && (
                          <span>Confidence: {Math.round(voiceStatus.confidence * 100)}%</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* MCP Tools */}
                {mcpTools.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: '500', 
                      color: 'var(--text-primary)',
                      marginBottom: '8px'
                    }}>
                      MCP Tools ({mcpTools.filter(t => t.enabled).length}/{mcpTools.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {mcpTools.map((tool) => (
                        <motion.button
                          key={tool.name}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onMCPAction?.(tool.name, tool.enabled ? 'disable' : 'enable')}
                          className={tool.enabled ? 'ice-glass-elevated interactive-scale' : 'ice-glass interactive-scale'}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            borderRadius: '8px',
                            border: 'none',
                            background: tool.enabled ? 'var(--glass-accent-hover)' : 'transparent',
                            color: tool.status === 'error' ? 'var(--accent-red)' :
                                   tool.status === 'authenticating' ? 'var(--accent-orange)' :
                                   tool.enabled ? 'var(--accent-green)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            position: 'relative'
                          }}
                        >
                          {tool.name === 'gmail' && <Mail size={10} />}
                          {tool.name === 'calendar' && <Calendar size={10} />}
                          {!['gmail', 'calendar'].includes(tool.name) && <Zap size={10} />}
                          
                          <span style={{ textTransform: 'capitalize' }}>{tool.name}</span>
                          
                          {tool.status === 'active' && <CheckCircle size={8} />}
                          {tool.status === 'error' && <AlertCircle size={8} />}
                          {tool.status === 'authenticating' && (
                            <div style={{
                              width: '8px',
                              height: '8px',
                              border: '1px solid currentColor',
                              borderTop: '1px solid transparent',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }} />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent Controls */}
                {(onAgentPause || onAgentResume) && (
                  <div>
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: '500', 
                      color: 'var(--text-primary)',
                      marginBottom: '8px'
                    }}>
                      Agent Controls
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {onAgentPause && controlState?.current_state === 'agent_active' && (
                        <button
                          onClick={onAgentPause}
                          className="ice-glass interactive-scale"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Pause size={12} />
                          Pause Agent
                        </button>
                      )}
                      
                      {onAgentResume && controlState?.current_state === 'agent_paused' && (
                        <button
                          onClick={onAgentResume}
                          className="ice-glass interactive-scale"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, var(--accent-green) 0%, var(--accent-green-bright) 100%)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Play size={12} />
                          Resume Agent
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Action Type Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label 
              style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: 'var(--text-primary)', 
                marginBottom: '12px' 
              }}
            >
              What would you like to do?
            </label>
            
            <div 
              className="ice-glass"
              style={{
                display: 'flex',
                gap: '8px',
                padding: '6px',
                borderRadius: '12px'
              }}
            >
              <button
                onClick={() => setActionType('guidance')}
                className={actionType === 'guidance' ? 'ice-glass-elevated interactive-scale' : 'interactive-scale'}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: 'none',
                  borderRadius: '8px',
                  background: actionType === 'guidance' ? 'var(--ice-highlight)' : 'transparent',
                  color: actionType === 'guidance' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontWeight: actionType === 'guidance' ? '600' : '400',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <MessageSquare size={16} />
                Provide Guidance
              </button>
              
              <button
                onClick={() => setActionType('handoff')}
                className={actionType === 'handoff' ? 'ice-glass-elevated interactive-scale' : 'interactive-scale'}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: 'none',
                  borderRadius: '8px',
                  background: actionType === 'handoff' ? 'var(--ice-highlight)' : 'transparent',
                  color: actionType === 'handoff' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontWeight: actionType === 'handoff' ? '600' : '400',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <User size={16} />
                Take Control
              </button>
            </div>
          </div>

          {/* Message Input */}
          <div style={{ marginBottom: '20px' }}>
            <label 
              style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: 'var(--text-primary)', 
                marginBottom: '8px' 
              }}
            >
              {actionType === 'guidance' 
                ? 'Provide guidance to the AI agent:' 
                : 'Describe what you plan to do:'
              }
            </label>
            
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                actionType === 'guidance'
                  ? 'e.g., "Try clicking the blue button instead" or "Look for the login form at the top right"'
                  : 'e.g., "I need to fill out this form manually" or "I\'ll handle the captcha verification"'
              }
              className="ice-glass"
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '16px',
                fontSize: '14px',
                border: '1px solid var(--ice-border)',
                borderRadius: '12px',
                background: 'var(--glass-subtle)',
                color: 'var(--text-primary)',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '1.5'
              }}
              disabled={isSubmitting || isTransitioning}
            />
            
            <div 
              style={{ 
                fontSize: '12px', 
                color: 'var(--text-tertiary)', 
                marginTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>Press Cmd/Ctrl + Enter to submit</span>
              <span>{message.length}/500</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div 
            style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}
          >
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isSubmitting || isTransitioning}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || isSubmitting || isTransitioning}
              className="glow-border"
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                background: 'var(--accent-blue)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isSubmitting || isTransitioning ? (
                <>
                  <div 
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} 
                  />
                  {isTransitioning ? 'Switching...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <Send size={16} />
                  {actionType === 'guidance' ? 'Send Guidance' : 'Take Control'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status indicator */}
        {isTransitioning && (
          <div 
            className="ice-glass glow-border animate-pulse-gentle"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--accent-blue-bright)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <div 
              style={{
                width: '8px',
                height: '8px',
                background: 'var(--accent-blue)',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }} 
            />
            Transitioning Control
          </div>
        )}
      </div>
    </div>
  );
};
