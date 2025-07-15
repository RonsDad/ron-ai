/**
 * Claude Browser Service
 * Manages the integration between Claude AI and Browser-Use automation
 * Provides state management for MainLayout.tsx entry points
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Types matching your UI components
export interface Message {
  sender: 'user' | 'ai';
  text: string;
  thinking?: any[];
  tool_calls?: any[];
  tool_results?: any[];
}

export interface BrowserSession {
  screenshot?: string;
  streaming?: boolean;
  session_id?: string;
  current_url?: string;
  current_title?: string;
  status?: string;
}

export interface ClaudeBrowserState {
  messages: Message[];
  isProcessing: boolean;
  browserSession: BrowserSession | null;
  conversationId: string;
  taskTitle: string;
  elapsedTime: number;
  estimatedCost: number;
}

// Browser need detection
const detectsBrowserNeed = (message: string): boolean => {
  const browserKeywords = [
    'navigate to', 'go to', 'visit', 'open website', 'browse to',
    'fill out', 'click on', 'click the', 'search for', 'find on website',
    'submit form', 'login to', 'sign in to', 'download from', 'download the',
    'screenshot of', 'scrape', 'extract from website',
    'automate', 'browser', 'website', 'web page', 'button', 'form'
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
};

export function useClaudeBrowserService() {
  // State for MainLayout.tsx entry points
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [browserSession, setBrowserSession] = useState<BrowserSession | null>(null);
  const [conversationId] = useState(() => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [taskTitle, setTaskTitle] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  
  // Internal state
  const [isInitialized, setIsInitialized] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Initialize service
  useEffect(() => {
    if (!isInitialized) {
      console.log('🚀 Claude Browser Service initialized');
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Timer management
  const startTimer = useCallback(() => {
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      startTimeRef.current = null;
    }
  }, []);

  // Process user message
  const processMessage = useCallback(async (userMessage: string): Promise<void> => {
    if (!userMessage.trim()) return;

    // Add user message
    const userMsg: Message = {
      sender: 'user',
      text: userMessage
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);
    startTimer();

    // Set task title from first message
    if (!taskTitle) {
      const title = userMessage.length > 50 
        ? userMessage.substring(0, 50) + '...' 
        : userMessage;
      setTaskTitle(title);
    }

    try {
      // Check if message needs browser automation
      const needsBrowser = detectsBrowserNeed(userMessage);
      
      if (needsBrowser) {
        await processBrowserTask(userMessage);
      } else {
        await processRegularMessage(userMessage);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message
      const errorMsg: Message = {
        sender: 'ai',
        text: `I encountered an error while processing your request: ${error}`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  }, [taskTitle, startTimer]);

  // Process browser automation task
  const processBrowserTask = useCallback(async (userMessage: string): Promise<void> => {
    console.log('🌐 Processing browser task:', userMessage);

    try {
      // Create browser task via API
      const response = await fetch('/api/browser/claude/browser-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          task: userMessage,
          user_id: 'user',
          context: {
            enable_thinking: true,
            max_output_tokens: 8192
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          // Add AI response about browser task
          const aiMsg: Message = {
            sender: 'ai',
            text: "I've started working on that browser task. You can see the browser activity in the right panel.",
            tool_calls: [{
              name: 'browser_automation',
              input: { task: userMessage, session_id: result.session_id }
            }],
            tool_results: [{
              success: true,
              session_id: result.session_id,
              task: userMessage
            }]
          };
          
          setMessages(prev => [...prev, aiMsg]);
          
          // Update browser session
          if (result.sessions && result.sessions.length > 0) {
            const session = result.sessions[0];
            setBrowserSession({
              session_id: session.session_id,
              streaming: true,
              status: 'active',
              current_url: session.current_url,
              current_title: session.current_title
            });
            
            // Start polling for screenshots
            startScreenshotPolling(session.session_id);
          }
          
          // Update cost estimate
          setEstimatedCost(prev => prev + 0.05); // Rough estimate
          
        } else {
          throw new Error(result.error || 'Failed to create browser task');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Browser task error:', error);
      
      // Fallback to regular message processing
      await processRegularMessage(userMessage);
    }
  }, [conversationId]);

  // Process regular Claude message
  const processRegularMessage = useCallback(async (userMessage: string): Promise<void> => {
    console.log('💬 Processing regular message:', userMessage);

    try {
      // Call Claude API
      const response = await fetch('/api/claude/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversation_history: messages,
          enable_thinking: true,
          thinking_budget: 16000,
          max_output_tokens: 8192,
          enable_browser_use: false,
          enable_sonar_tools: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let aiResponse = '';
      let thinking: any[] = [];
      let toolCalls: any[] = [];
      let toolResults: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              
              switch (event.event) {
                case 'thinking_delta':
                  if (event.delta) {
                    // Update thinking in real-time
                    thinking.push({ content: event.delta });
                  }
                  break;
                
                case 'text_delta':
                  if (event.delta) {
                    aiResponse += event.delta;
                    
                    // Update message in real-time
                    setMessages(prev => {
                      const newMessages = [...prev];
                      const lastMessage = newMessages[newMessages.length - 1];
                      
                      if (lastMessage && lastMessage.sender === 'ai') {
                        lastMessage.text = aiResponse;
                        lastMessage.thinking = thinking;
                      } else {
                        newMessages.push({
                          sender: 'ai',
                          text: aiResponse,
                          thinking: thinking
                        });
                      }
                      
                      return newMessages;
                    });
                  }
                  break;
                
                case 'usage_update':
                  if (event.usage) {
                    // Update cost estimate
                    const tokens = event.usage.input_tokens + event.usage.output_tokens;
                    const cost = tokens * 0.000015; // Rough estimate for Sonnet
                    setEstimatedCost(prev => prev + cost);
                  }
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }

      // Finalize AI message
      const finalAiMsg: Message = {
        sender: 'ai',
        text: aiResponse,
        thinking: thinking.length > 0 ? thinking : undefined,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        tool_results: toolResults.length > 0 ? toolResults : undefined
      };

      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        
        if (lastMessage && lastMessage.sender === 'ai') {
          newMessages[newMessages.length - 1] = finalAiMsg;
        } else {
          newMessages.push(finalAiMsg);
        }
        
        return newMessages;
      });

    } catch (error) {
      console.error('Regular message error:', error);
      
      // Add error message
      const errorMsg: Message = {
        sender: 'ai',
        text: `I encountered an error: ${error}. Please try again.`
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  }, [messages, conversationId]);

  // Screenshot polling for browser sessions
  const startScreenshotPolling = useCallback((sessionId: string) => {
    const pollScreenshot = async () => {
      try {
        const response = await fetch(`/api/browser/session/${sessionId}`);
        if (response.ok) {
          const sessionData = await response.json();
          
          setBrowserSession(prev => ({
            ...prev,
            screenshot: sessionData.screenshot,
            current_url: sessionData.current_url,
            current_title: sessionData.current_title,
            status: sessionData.status
          }));
        }
      } catch (error) {
        console.error('Screenshot polling error:', error);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollScreenshot, 2000);
    
    // Clean up after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
    }, 300000);
  }, []);

  // Reset conversation
  const resetConversation = useCallback(() => {
    setMessages([]);
    setIsProcessing(false);
    setBrowserSession(null);
    setTaskTitle('');
    setElapsedTime(0);
    setEstimatedCost(0);
    stopTimer();
  }, [stopTimer]);

  // Stop current task
  const stopTask = useCallback(() => {
    setIsProcessing(false);
    stopTimer();
    
    // Close browser session if active
    if (browserSession?.session_id) {
      fetch(`/api/browser/session/${browserSession.session_id}`, {
        method: 'DELETE'
      }).catch(console.error);
      
      setBrowserSession(null);
    }
  }, [browserSession, stopTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  return {
    // State for MainLayout.tsx entry points
    messages,
    isProcessing,
    browserSession,
    taskTitle,
    elapsedTime,
    estimatedCost,
    conversationId,
    
    // Actions
    processMessage,
    resetConversation,
    stopTask,
    
    // Status
    isInitialized,
    hasBrowserSession: !!browserSession,
    isActive: messages.length > 0 || isProcessing
  };
}
