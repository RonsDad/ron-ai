/**
 * React hook for Claude browser integration
 * Connects your existing ClaudeAgent component with browser-use capabilities
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useBrowserWebSocket } from '../services/browserWebSocket';

export interface BrowserSession {
  session_id: string;
  conversation_id: string;
  task: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  browser_mode: string;
  current_url?: string;
  current_title?: string;
  screenshot?: string;
  live_url?: string;
  recording_active?: boolean;
  human_control?: boolean;
  metadata?: Record<string, any>;
}

export interface ClaudeBrowserMessage {
  type: 'browser_task_starting' | 'browser_task_response' | 'human_control_response' | 'agent_control_resumed';
  success?: boolean;
  message?: string;
  browser_session_id?: string;
  task?: string;
  sessions?: BrowserSession[];
  error?: string;
  conversation_id: string;
}

export interface ClaudeBrowserIntegrationOptions {
  conversationId: string;
  userId?: string;
  apiEndpoint?: string;
  enableAutoDetection?: boolean;
}

export function useClaudeBrowserIntegration(options: ClaudeBrowserIntegrationOptions) {
  const { conversationId, userId, apiEndpoint = '/api/browser', enableAutoDetection = true } = options;
  
  // Browser WebSocket integration
  const { 
    sessions: allSessions, 
    requestControlTransition, 
    sendUserFeedback,
    isConnected 
  } = useBrowserWebSocket();
  
  // State
  const [browserSessions, setBrowserSessions] = useState<BrowserSession[]>([]);
  const [isProcessingBrowserTask, setIsProcessingBrowserTask] = useState(false);
  const [lastBrowserResponse, setLastBrowserResponse] = useState<ClaudeBrowserMessage | null>(null);
  
  // Refs for handlers
  const messageHandlersRef = useRef<((message: ClaudeBrowserMessage) => void)[]>([]);
  const sessionHandlersRef = useRef<((sessions: BrowserSession[]) => void)[]>([]);
  
  // Filter sessions for this conversation
  useEffect(() => {
    const conversationSessions = allSessions.filter(
      session => session.conversation_id === conversationId
    ) as BrowserSession[];
    
    setBrowserSessions(conversationSessions);
    
    // Notify session handlers
    sessionHandlersRef.current.forEach(handler => {
      try {
        handler(conversationSessions);
      } catch (error) {
        console.error('Error in session handler:', error);
      }
    });
  }, [allSessions, conversationId]);
  
  /**
   * Process a message from Claude, detecting if browser automation is needed
   */
  const processMessage = useCallback(async (
    message: string,
    context?: Record<string, any>
  ): Promise<ClaudeBrowserMessage> => {
    
    // Check if message requires browser automation
    const requiresBrowser = enableAutoDetection ? detectsBrowserNeed(message) : false;
    
    if (requiresBrowser) {
      setIsProcessingBrowserTask(true);
      
      try {
        // Call backend to create browser task
        const response = await fetch(`${apiEndpoint}/claude/browser-task`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            task: message,
            user_id: userId,
            context
          })
        });
        
        const result = await response.json();
        
        const browserMessage: ClaudeBrowserMessage = {
          type: 'browser_task_response',
          success: result.success,
          message: result.success 
            ? "I've started working on that browser task. You can see the browser activity in the Browser View panel."
            : `I encountered an error with the browser task: ${result.error}`,
          browser_session_id: result.session_id,
          task: message,
          sessions: result.sessions,
          error: result.error,
          conversation_id: conversationId
        };
        
        setLastBrowserResponse(browserMessage);
        
        // Notify message handlers
        messageHandlersRef.current.forEach(handler => {
          try {
            handler(browserMessage);
          } catch (error) {
            console.error('Error in message handler:', error);
          }
        });
        
        return browserMessage;
        
      } catch (error) {
        const errorMessage: ClaudeBrowserMessage = {
          type: 'browser_task_response',
          success: false,
          message: `I encountered an error: ${error}`,
          error: String(error),
          conversation_id: conversationId
        };
        
        setLastBrowserResponse(errorMessage);
        return errorMessage;
        
      } finally {
        setIsProcessingBrowserTask(false);
      }
    }
    
    // Return regular message response
    return {
      type: 'browser_task_response',
      success: true,
      message: "This message doesn't require browser automation.",
      conversation_id: conversationId
    };
  }, [conversationId, userId, apiEndpoint, enableAutoDetection]);
  
  /**
   * Handle human control requests from the UI
   */
  const handleHumanControlRequest = useCallback(async (
    sessionId: string,
    actionType: 'guidance' | 'takeover',
    message: string
  ): Promise<boolean> => {
    
    try {
      if (actionType === 'guidance') {
        // Send guidance via WebSocket
        await sendUserFeedback(sessionId, message, 'guidance');
      } else {
        // Request control transition
        await requestControlTransition(sessionId, true, message, 'handoff');
      }
      
      // Also notify backend
      const response = await fetch(`${apiEndpoint}/claude/human-control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          action_type: actionType,
          message,
          user_id: userId
        })
      });
      
      const result = await response.json();
      
      const controlMessage: ClaudeBrowserMessage = {
        type: 'human_control_response',
        success: result.success,
        message: result.message,
        conversation_id: conversationId
      };
      
      // Notify handlers
      messageHandlersRef.current.forEach(handler => {
        try {
          handler(controlMessage);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
      
      return result.success;
      
    } catch (error) {
      console.error('Error handling human control request:', error);
      return false;
    }
  }, [conversationId, userId, apiEndpoint, sendUserFeedback, requestControlTransition]);
  
  /**
   * Resume agent control after human intervention
   */
  const resumeAgentControl = useCallback(async (
    sessionId: string,
    humanActionsSummary: string
  ): Promise<boolean> => {
    
    try {
      // Release control via WebSocket
      await requestControlTransition(sessionId, false, humanActionsSummary, 'handoff');
      
      // Notify backend
      const response = await fetch(`${apiEndpoint}/claude/resume-control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          human_actions_summary: humanActionsSummary,
          user_id: userId
        })
      });
      
      const result = await response.json();
      
      const resumeMessage: ClaudeBrowserMessage = {
        type: 'agent_control_resumed',
        success: result.success,
        message: result.message,
        conversation_id: conversationId
      };
      
      // Notify handlers
      messageHandlersRef.current.forEach(handler => {
        try {
          handler(resumeMessage);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
      
      return result.success;
      
    } catch (error) {
      console.error('Error resuming agent control:', error);
      return false;
    }
  }, [conversationId, userId, apiEndpoint, requestControlTransition]);
  
  /**
   * Add message handler
   */
  const addMessageHandler = useCallback((handler: (message: ClaudeBrowserMessage) => void) => {
    messageHandlersRef.current.push(handler);
    
    // Return cleanup function
    return () => {
      const index = messageHandlersRef.current.indexOf(handler);
      if (index > -1) {
        messageHandlersRef.current.splice(index, 1);
      }
    };
  }, []);
  
  /**
   * Add session handler
   */
  const addSessionHandler = useCallback((handler: (sessions: BrowserSession[]) => void) => {
    sessionHandlersRef.current.push(handler);
    
    // Return cleanup function
    return () => {
      const index = sessionHandlersRef.current.indexOf(handler);
      if (index > -1) {
        sessionHandlersRef.current.splice(index, 1);
      }
    };
  }, []);
  
  /**
   * Cleanup when conversation ends
   */
  const cleanup = useCallback(async () => {
    try {
      await fetch(`${apiEndpoint}/claude/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          user_id: userId
        })
      });
    } catch (error) {
      console.error('Error cleaning up conversation:', error);
    }
  }, [conversationId, userId, apiEndpoint]);
  
  return {
    // State
    browserSessions,
    isProcessingBrowserTask,
    lastBrowserResponse,
    isConnected,
    
    // Actions
    processMessage,
    handleHumanControlRequest,
    resumeAgentControl,
    cleanup,
    
    // Event handlers
    addMessageHandler,
    addSessionHandler,
    
    // Utilities
    hasBrowserSessions: browserSessions.length > 0,
    activeBrowserSessions: browserSessions.filter(s => s.status === 'active'),
    humanControlledSessions: browserSessions.filter(s => s.human_control)
  };
}

/**
 * Detect if a message requires browser automation
 */
function detectsBrowserNeed(message: string): boolean {
  const browserKeywords = [
    'navigate to', 'go to', 'visit', 'open website', 'browse to',
    'fill out', 'click on', 'search for', 'find on website',
    'submit form', 'login to', 'sign in to', 'download from',
    'screenshot of', 'scrape', 'extract from website',
    'automate', 'browser', 'website', 'web page', 'url',
    'form', 'button', 'link', 'page', 'site'
  ];
  
  const messageWords = message.toLowerCase().split(/\s+/);
  
  // Check for exact keyword matches
  const hasKeywords = browserKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
  
  // Check for URLs
  const hasUrl = /https?:\/\/[^\s]+/.test(message);
  
  // Check for web-related patterns
  const hasWebPattern = /\.(com|org|net|edu|gov|io|co)\b/.test(message.toLowerCase());
  
  return hasKeywords || hasUrl || hasWebPattern;
}
