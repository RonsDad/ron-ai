import React, { useState, useEffect, useRef } from 'react';
import { BrowserViewPanel } from './BrowserViewPanel';
import AgentStepsPanel from './AgentStepsPanel';
import TabBar from './TabBar';

interface TabInfo {
  page_id: number;
  url: string;
  title: string;
}

interface AgentSession {
  sessionId: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  browserUrl: string;
  screenshot?: string;
  currentUrl?: string;
  title?: string;
  humanControl?: boolean;
  tabs?: TabInfo[];
}

interface AgentMessage {
  type: 'status' | 'progress' | 'error' | 'control';
  status?: string;
  action?: string;
  result?: string;
  message?: string;
  owner?: 'user' | 'agent';
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ToolCall {
  name: string;
  input: any;
}

interface ClaudeResponse {
  content: any[];
  stop_reason?: string;
  usage?: any;
}

// Add ref to AgentStepsPanel
interface AgentStepsPanelRef {
  addStep: (step: any) => void;
  updateStep: (stepNumber: number, updates: any) => void;
}

class WebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private onOpenCallback: (() => void) | null = null;
  private onMessageCallback: ((message: any) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  public onOpen(callback: () => void) {
    this.onOpenCallback = callback;
  }

  public onMessage(callback: (message: any) => void) {
    this.onMessageCallback = callback;
  }

  public onClose(callback: () => void) {
    this.onCloseCallback = callback;
  }

  public connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      if (this.onOpenCallback) {
        this.onOpenCallback();
      }
    };

    this.ws.onmessage = (event) => {
      if (this.onMessageCallback) {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          this.onMessageCallback(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      }
    };

    this.ws.onclose = () => {
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    };
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket message sent:', data);
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket not open. Ready state:', this.ws?.readyState);
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}


export default function AgentController() {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [controlOwner, setControlOwner] = useState<'user' | 'agent'>('user');
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [agentSteps, setAgentSteps] = useState<any[]>([]);
  const [currentStepNumber, setCurrentStepNumber] = useState(0);
  const [activeTabId, setActiveTabId] = useState(0);
  const wsRef = useRef<any>(null);
  const agentStepsPanelRef = useRef<AgentStepsPanelRef>(null);

  // WebSocket connection
  useEffect(() => {
    if (session?.sessionId) {
      const ws = new WebSocketClient(`ws://localhost:3000/ws/${session.sessionId}`);

      ws.onOpen(() => {
        setIsConnected(true);
        console.log('WebSocket connected');
      });

      ws.onMessage((message: any) => {
        // Don't add step messages to the general messages array
        if (message.type !== 'step_start' && message.type !== 'step_end' && message.type !== 'viewport_update') {
          setMessages((prev: AgentMessage[]) => [...prev, message]);
        }

        if (message.type === 'status' && message.status) {
          setSession((prev: AgentSession | null) => prev ? { ...prev, status: message.status as any } : null);
        }

        if (message.type === 'control_change') {
          setControlOwner(message.human_control ? 'user' : 'agent');
          setSession((prev: AgentSession | null) => prev ? { ...prev, humanControl: message.human_control } : null);
        }

        if (message.type === 'viewport_update') {
          setSession((prev: AgentSession | null) => prev ? { 
            ...prev, 
            screenshot: message.screenshot,
            currentUrl: message.url,
            title: message.title,
            tabs: message.tabs
          } : null);
          
          // Try to determine active tab from current URL
          if (message.tabs && message.url) {
            const activeTab = message.tabs.find((tab: TabInfo) => tab.url === message.url);
            if (activeTab) {
              setActiveTabId(activeTab.page_id);
            }
          }
          
          // Update the current step with screenshot
          if (currentStepNumber > 0) {
            const stepUpdate = {
              screenshot: message.screenshot,
              url: message.url,
              title: message.title
            };
            setAgentSteps(prev => prev.map(step => 
              step.stepNumber === currentStepNumber ? { ...step, ...stepUpdate } : step
            ));
          }
        }

        if (message.type === 'session_state') {
          setControlOwner(message.human_control ? 'user' : 'agent');
          setSession((prev: AgentSession | null) => prev ? { 
            ...prev, 
            humanControl: message.human_control,
            currentUrl: message.current_url
          } : null);
        }

        // Handle step start
        if (message.type === 'step_start') {
          const newStep = {
            stepNumber: message.step_number,
            evaluation: message.evaluation,
            memory: message.memory,
            nextGoal: message.next_goal,
            thinking: message.thinking,  // Add thinking/reasoning
            context: message.context,    // Add context
            actions: message.actions,
            results: [],
            screenshot: null,
            url: message.url,
            title: message.title,
            timestamp: message.timestamp,
            duration: null,
            status: 'in_progress'
          };
          setAgentSteps(prev => [...prev, newStep]);
          setCurrentStepNumber(message.step_number);
        }

        // Handle step end
        if (message.type === 'step_end') {
          const stepUpdate = {
            results: message.results,
            status: message.status,
            duration: message.duration
          };
          setAgentSteps(prev => prev.map(step => 
            step.stepNumber === message.step_number ? { ...step, ...stepUpdate } : step
          ));
        }
      });

      ws.onClose(() => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
      });

      wsRef.current = ws;
      ws.connect();

      return () => {
        ws.disconnect();
      };
    }
  }, [session?.sessionId]);

  // API handlers
  const startAgent = async () => {
    if (!instructions.trim()) return;

    try {
      const response = await fetch('/api/start-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructions: instructions,
          headless: false
        })
      });

      const data = await response.json();

      console.log('Agent started:', data);

      // Reset steps when starting new agent
      setAgentSteps([]);
      setCurrentStepNumber(0);

      setSession({
        sessionId: data.session_id,
        status: 'idle',
        browserUrl: data.browser_url
      });

    } catch (error) {
      alert('Failed to start agent');
      console.error('Failed to start agent:', error);
    }
  };

  const pauseAgent = async () => {
    if (!session) return;

    try {
      await fetch(`http://localhost:8000/api/pause-agent?session_id=${session.sessionId}`, {
        method: 'POST'
      });

    } catch (error) {
      alert('Failed to pause agent');
      console.error('Failed to pause agent:', error);
    }
  };

  const resumeAgent = async () => {
    if (!session) return;

    try {
      await fetch(`http://localhost:8000/api/resume-agent?session_id=${session.sessionId}`, {
        method: 'POST'
      });

    } catch (error) {
      alert('Failed to resume agent');
      console.error('Failed to resume agent:', error);
    }
  };

  const stopAgent = async () => {
    if (!session) return;

    try {
      await fetch(`http://localhost:8000/api/stop-agent?session_id=${session.sessionId}`, {
        method: 'POST'
      });

      setSession(null);
      setMessages([]);
      setControlOwner('user');
      setAgentSteps([]);
      setCurrentStepNumber(0);

    } catch (error) {
      alert('Failed to stop agent');
      console.error('Failed to stop agent:', error);
    }
  };

  const takeControl = () => {
    if (wsRef.current) {
      wsRef.current.send({ 
        type: 'control_toggle', 
        human_control: true
      });
    }
  };

  const releaseControl = () => {
    if (wsRef.current) {
      wsRef.current.send({ 
        type: 'control_toggle', 
        human_control: false,
        additional_prompt: additionalPrompt.trim() || undefined
      });
      setAdditionalPrompt(''); // Clear the prompt after use
    }
  };

  // UI
  return (
    <div style={{ maxWidth: 1400, margin: '40px auto', padding: 24 }}>
      <h2>Browser-Use Agent Controller</h2>
      <div style={{ marginBottom: 16 }}>
        <strong>Status:</strong> {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        {session && (
          <>
            {' | '}
            <strong>Agent:</strong> {session.status}
            {' | '}
            <strong>Control:</strong> {controlOwner === 'user' ? '👤 You' : '🤖 Agent'}
          </>
        )}
      </div>

      {!session ? (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <label>
            <strong>Agent Instructions:</strong>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={4}
              style={{ width: '100%', marginTop: 8, marginBottom: 8 }}
              placeholder="Describe what you want the agent to do..."
            />
          </label>
          <button onClick={startAgent} style={{ padding: '8px 16px', fontWeight: 'bold' }}>
            Start Agent
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 16 }}>
            <button onClick={pauseAgent} disabled={session.status !== 'running'} style={{ marginRight: 8 }}>
              Pause Agent
            </button>
            <button onClick={resumeAgent} disabled={session.status !== 'paused'} style={{ marginRight: 8 }}>
              Resume Agent
            </button>
            <button onClick={stopAgent} style={{ marginRight: 8, color: 'red' }}>
              Stop Agent
            </button>
            <button
              onClick={takeControl}
              disabled={controlOwner === 'user'}
              style={{ marginRight: 8 }}
            >
              Take Control
            </button>
            <button
              onClick={releaseControl}
              disabled={controlOwner === 'agent'}
              style={{ marginRight: 8 }}
            >
              Give Control to Agent
            </button>
          </div>

          {/* Two-column layout for browser view and agent steps */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            {/* Browser View */}
            <div style={{ flex: 1, height: 600, display: 'flex', flexDirection: 'column' }}>
              {/* Tab Bar */}
              {session.tabs && session.tabs.length > 0 && (
                <TabBar
                  tabs={session.tabs}
                  activeTabId={activeTabId}
                  onTabClick={(tabId) => {
                    console.log('Tab clicked:', tabId);
                    // TODO: Send tab switch command to backend
                  }}
                  onTabClose={(tabId) => {
                    console.log('Tab close requested:', tabId);
                    // TODO: Send tab close command to backend
                  }}
                  onNewTab={() => {
                    console.log('New tab requested');
                    // TODO: Send new tab command to backend
                  }}
                />
              )}
              <BrowserViewPanel
                isActive={!!session}
                sessions={[{
                  session_id: session.sessionId,
                  browser_url: session.browserUrl,
                  screenshot: session.screenshot,
                  current_url: session.currentUrl,
                  current_title: session.title,
                  task: instructions
                }]}
                isAutomating={session.status === 'running'}
                onUserControlChange={(sessionId, hasControl) => {
                  if (hasControl) {
                    takeControl();
                  } else {
                    releaseControl();
                  }
                }}
                onCloseAll={stopAgent}
              />
            </div>

            {/* Agent Steps Panel */}
            <div style={{ width: 400, height: 600, border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
              <AgentStepsPanel
                sessionId={session.sessionId}
                isActive={session.status === 'running'}
                currentTask={instructions}
                steps={agentSteps}
                maxSteps={100}
              />
            </div>
          </div>
          
          {/* Additional prompt input for when giving control back to AI */}
          {controlOwner === 'user' && (
            <div style={{ marginBottom: 16 }}>
              <label>
                <strong>Additional instructions for AI (optional):</strong>
                <textarea
                  value={additionalPrompt}
                  onChange={(e) => setAdditionalPrompt(e.target.value)}
                  rows={2}
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="Provide additional context or instructions for the AI when resuming control..."
                />
              </label>
            </div>
          )}

          {/* Raw messages (hidden by default, can be expanded) */}
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: 8 }}>
              Raw Messages ({messages.length})
            </summary>
            <div style={{
              maxHeight: 200,
              overflowY: 'auto',
              background: '#f9f9f9',
              border: '1px solid #eee',
              padding: 8,
              borderRadius: 4
            }}>
              {messages.length === 0 && <div>No messages yet.</div>}
              {messages.map((msg, idx) => (
                <div key={idx} style={{ marginBottom: 4 }}>
                  <code>{JSON.stringify(msg)}</code>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
