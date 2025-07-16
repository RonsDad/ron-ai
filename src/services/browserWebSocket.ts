/**
 * WebSocket service for real-time browser communication
 * Handles browser session updates, control transitions, and live data streaming
 */

export interface BrowserSession {
  session_id: string;
  browser_url?: string;
  screenshot?: string;
  current_url?: string;
  current_title?: string;
  task?: string;
  last_update?: string;
  userControl?: boolean;
  browser_mode?: string;
  live_url?: string;
  recording_active?: boolean;
  features?: Record<string, boolean>;
}

export interface BrowserMessage {
  type: 'session_update' | 'control_change' | 'screenshot_update' | 'viewport_update' | 'tab_update' | 'error' | 'status' | 'step_start' | 'step_end';
  session_id?: string;
  data?: any;
  screenshot?: string;
  url?: string;
  title?: string;
  timestamp?: string;
}

export interface ControlTransitionRequest {
  session_id: string;
  take_control: boolean;
  message?: string;
  action_type?: 'guidance' | 'handoff';
}

class BrowserWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(private wsUrl: string = 'ws://localhost:8000/ws/browser') {}

  /**
   * Connect to the WebSocket server for a specific session
   */
  async connect(sessionId?: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const url = sessionId ? `${this.wsUrl}/${sessionId}` : this.wsUrl;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('Browser WebSocket connected');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          this.emit('connection', { status: 'connected' });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: BrowserMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('Browser WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.emit('connection', { status: 'disconnected', code: event.code, reason: event.reason });
          
          // Attempt to reconnect if not a clean close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('Browser WebSocket error:', error);
          this.isConnecting = false;
          this.emit('error', { error: 'WebSocket connection error' });
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnecting = false;
    this.connectionPromise = null;
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: BrowserMessage): void {
    console.log('📨 WEBSOCKET RAW MESSAGE:', message);
    console.log('📊 Message type:', message.type);
    console.log('📊 Session ID:', message.session_id);
    console.log('📊 Has data:', !!message.data);
    console.log('📊 Has screenshot:', !!message.screenshot);

    // Emit to specific event listeners
    this.emit(message.type, message.data || message);

    // Emit to session-specific listeners
    if (message.session_id) {
      this.emit(`session:${message.session_id}`, message);
    }

    // Emit to all message listeners
    this.emit('message', message);
  }

  /**
   * Send a message to the server
   */
  private async send(message: any, sessionId?: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect(sessionId);
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  /**
   * Request control transition for a browser session
   */
  async requestControlTransition(request: ControlTransitionRequest): Promise<void> {
    await this.send({
      type: 'control_toggle',
      session_id: request.session_id,
      human_control: request.take_control,
      additional_prompt: request.message,
      timestamp: new Date().toISOString()
    }, request.session_id);
  }

  /**
   * Subscribe to browser session updates
   */
  async subscribeToBrowserSessions(): Promise<void> {
    await this.send({
      type: 'subscribe_sessions',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Subscribe to a specific browser session
   */
  async subscribeToSession(sessionId: string): Promise<void> {
    await this.send({
      type: 'subscribe',
      channel: 'session',
      session_id: sessionId,
      timestamp: new Date().toISOString()
    }, sessionId);
  }

  /**
   * Unsubscribe from a specific browser session
   */
  async unsubscribeFromSession(sessionId: string): Promise<void> {
    await this.send({
      type: 'unsubscribe',
      channel: 'session',
      session_id: sessionId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Request a screenshot update for a session
   */
  async requestScreenshot(sessionId: string): Promise<void> {
    await this.send({
      type: 'get_screenshot',
      session_id: sessionId,
      timestamp: new Date().toISOString()
    }, sessionId);
  }

  /**
   * Send user action feedback
   */
  async sendUserFeedback(sessionId: string, message: string, actionType: 'guidance' | 'handoff'): Promise<void> {
    await this.send({
      type: 'user_feedback',
      session_id: sessionId,
      message,
      action_type: actionType,
      timestamp: new Date().toISOString()
    }, sessionId);
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: (data: any) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  get connectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }
}

// Create singleton instance
export const browserWebSocket = new BrowserWebSocketService();

// React hook for using the browser WebSocket service
export function useBrowserWebSocket() {
  const [isConnected, setIsConnected] = React.useState(browserWebSocket.isConnected);
  const [sessions, setSessions] = React.useState<BrowserSession[]>([]);
  const [connectionState, setConnectionState] = React.useState(browserWebSocket.connectionState);

  React.useEffect(() => {
    // Connection status listener
    const handleConnection = (data: any) => {
      console.log('🔌 WEBSOCKET DEBUG: Connection status change');
      console.log('📊 Status:', data.status);
      console.log('📊 Is connected:', data.status === 'connected');
      
      setIsConnected(data.status === 'connected');
      setConnectionState(data.status);
    };

    // Session updates listener
    const handleSessionUpdate = (data: BrowserSession[]) => {
      setSessions(data);
    };

    // Viewport updates listener  
    const handleViewportUpdate = (data: any) => {
      console.log('📺 WEBSOCKET DEBUG: Viewport update received');
      console.log('📊 Session ID:', data.session_id);
      console.log('📊 URL:', data.url);
      console.log('📊 Has screenshot:', !!data.screenshot);
      
      setSessions(current => {
        console.log('📊 Current sessions before update:', current.length);
        const updated = current.map(session => 
          session.session_id === data.session_id 
            ? { ...session, screenshot: data.screenshot, current_url: data.url, current_title: data.title, last_update: data.timestamp }
            : session
        );
        console.log('📊 Sessions after viewport update:', updated.length);
        return updated;
      });
    };

    // Error listener
    const handleError = (data: any) => {
      console.error('Browser WebSocket error:', data);
    };

    // Add listeners
    browserWebSocket.on('connection', handleConnection);
    browserWebSocket.on('session_update', handleSessionUpdate);
    browserWebSocket.on('viewport_update', handleViewportUpdate);
    browserWebSocket.on('error', handleError);

    // Connect and subscribe
    const initializeConnection = async () => {
      try {
        await browserWebSocket.connect();
        await browserWebSocket.subscribeToBrowserSessions();
      } catch (error) {
        console.error('Failed to initialize browser WebSocket:', error);
      }
    };

    initializeConnection();

    // Cleanup
    return () => {
      browserWebSocket.off('connection', handleConnection);
      browserWebSocket.off('session_update', handleSessionUpdate);
      browserWebSocket.off('viewport_update', handleViewportUpdate);
      browserWebSocket.off('error', handleError);
    };
  }, []);

  const requestControlTransition = React.useCallback(async (
    sessionId: string, 
    takeControl: boolean, 
    message?: string, 
    actionType?: 'guidance' | 'handoff'
  ) => {
    await browserWebSocket.requestControlTransition({
      session_id: sessionId,
      take_control: takeControl,
      message,
      action_type: actionType
    });
  }, []);

  const sendUserFeedback = React.useCallback(async (
    sessionId: string, 
    message: string, 
    actionType: 'guidance' | 'handoff'
  ) => {
    await browserWebSocket.sendUserFeedback(sessionId, message, actionType);
  }, []);

  const subscribeToSession = React.useCallback(async (sessionId: string) => {
    await browserWebSocket.subscribeToSession(sessionId);
  }, []);

  const requestScreenshot = React.useCallback(async (sessionId: string) => {
    await browserWebSocket.requestScreenshot(sessionId);
  }, []);

  return {
    isConnected,
    connectionState,
    sessions,
    requestControlTransition,
    sendUserFeedback,
    subscribeToSession,
    requestScreenshot,
    browserWebSocket
  };
}

// Import React for the hook
import React from 'react';
