import { useState, useCallback, useRef, useEffect } from 'react';
import { HealthcareProviderService } from '../lib/healthcare-provider-service';
import { Provider, SearchFilters, HealthcareMessage, BrowserSession } from '../lib/healthcare-types';

interface ClaudeHealthcareBrowserState {
  messages: HealthcareMessage[];
  isProcessing: boolean;
  browserSession: BrowserSession | null;
  taskTitle: string;
  elapsedTime: number;
  estimatedCost: number;
  providers: Provider[];
  selectedProviders: Provider[];
  isComparing: boolean;
}

export function useClaudeHealthcareBrowserService() {
  const [state, setState] = useState<ClaudeHealthcareBrowserState>({
    messages: [],
    isProcessing: false,
    browserSession: null,
    taskTitle: '',
    elapsedTime: 0,
    estimatedCost: 0,
    providers: [],
    selectedProviders: [],
    isComparing: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced browser detection for healthcare context
  const detectBrowserNeed = useCallback((message: string): boolean => {
    const browserKeywords = [
      'navigate to', 'go to', 'visit', 'open', 'browse',
      'fill out', 'click on', 'screenshot of', 'interact with',
      'login to', 'sign in', 'register', 'submit form',
      'book appointment', 'schedule', 'portal', 'website'
    ];

    const healthcareBrowserKeywords = [
      'patient portal', 'insurance website', 'provider portal',
      'appointment booking', 'medical records', 'lab results',
      'prescription refill', 'insurance claim', 'prior authorization'
    ];

    const messageLower = message.toLowerCase();
    
    return [...browserKeywords, ...healthcareBrowserKeywords].some(keyword =>
      messageLower.includes(keyword)
    );
  }, []);

  // Enhanced provider search detection
  const detectProviderSearch = useCallback((message: string): boolean => {
    return HealthcareProviderService.detectProviderSearchIntent(message);
  }, []);

  // Process message with healthcare context
  const processMessage = useCallback(async (content: string) => {
    const userMessage: HealthcareMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isProcessing: true,
    }));

    try {
      // Determine message type and processing strategy
      const needsBrowser = detectBrowserNeed(content);
      const needsProviderSearch = detectProviderSearch(content);

      if (needsProviderSearch && !needsBrowser) {
        // Handle provider search without browser automation
        await handleProviderSearch(content, userMessage);
      } else if (needsBrowser) {
        // Handle browser automation (potentially with healthcare context)
        await handleBrowserTask(content, userMessage);
      } else {
        // Handle general Claude conversation
        await handleGeneralConversation(content, userMessage);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: HealthcareMessage = {
        id: (Date.now() + 1).toString(),
        content: 'I encountered an error processing your request. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isProcessing: false,
      }));
    }
  }, [detectBrowserNeed, detectProviderSearch]);

  // Handle provider search
  const handleProviderSearch = useCallback(async (content: string, userMessage: HealthcareMessage) => {
    try {
      // Extract search parameters from natural language
      const searchFilters = HealthcareProviderService.extractSearchParameters(content);
      
      // Search for providers
      const providers = await HealthcareProviderService.searchProviders(searchFilters);

      const responseMessage: HealthcareMessage = {
        id: (Date.now() + 1).toString(),
        content: providers.length > 0 
          ? `I found ${providers.length} healthcare providers matching your criteria. Here are the results:`
          : 'I couldn\'t find any providers matching your criteria. Try adjusting your search parameters.',
        role: 'assistant',
        timestamp: new Date(),
        type: 'provider_search',
        metadata: {
          providers,
          searchFilters,
        }
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, responseMessage],
        providers,
        isProcessing: false,
      }));
    } catch (error) {
      console.error('Error in provider search:', error);
      throw error;
    }
  }, []);

  // Handle browser automation tasks
  const handleBrowserTask = useCallback(async (content: string, userMessage: HealthcareMessage) => {
    try {
      // Start browser session
      const response = await fetch('/api/browser/claude/browser-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: content,
          context: 'healthcare', // Add healthcare context
        }),
      });

      if (!response.ok) {
        throw new Error(`Browser task failed: ${response.status}`);
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        browserSession: {
          session_id: data.session_id,
          screenshot: data.screenshot,
          current_url: data.current_url,
          streaming: true,
        },
        taskTitle: content.substring(0, 50) + '...',
        isProcessing: false,
      }));

      // Start WebSocket connection for real-time updates
      startWebSocketConnection(data.session_id);

    } catch (error) {
      console.error('Error in browser task:', error);
      throw error;
    }
  }, []);

  // Handle general conversation
  const handleGeneralConversation = useCallback(async (content: string, userMessage: HealthcareMessage) => {
    try {
      // Call Claude API for general conversation
      const response = await fetch('/api/claude/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          context: 'healthcare', // Add healthcare context
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API failed: ${response.status}`);
      }

      const data = await response.json();

      const responseMessage: HealthcareMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, responseMessage],
        isProcessing: false,
      }));
    } catch (error) {
      console.error('Error in general conversation:', error);
      throw error;
    }
  }, []);

  // WebSocket connection for browser updates
  const startWebSocketConnection = useCallback((sessionId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    wsRef.current = new WebSocket(`ws://localhost:8000/ws/browser/${sessionId}`);
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      setState(prev => ({
        ...prev,
        browserSession: prev.browserSession ? {
          ...prev.browserSession,
          screenshot: data.screenshot || prev.browserSession.screenshot,
          current_url: data.current_url || prev.browserSession.current_url,
        } : null,
      }));
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }, []);

  // Provider comparison functions
  const toggleProviderComparison = useCallback((provider: Provider) => {
    setState(prev => {
      const isSelected = prev.selectedProviders.some(p => p.id === provider.id);
      const newSelected = isSelected
        ? prev.selectedProviders.filter(p => p.id !== provider.id)
        : prev.selectedProviders.length < 4
          ? [...prev.selectedProviders, provider]
          : prev.selectedProviders;

      return {
        ...prev,
        selectedProviders: newSelected,
        isComparing: newSelected.length >= 2,
      };
    });
  }, []);

  const clearComparison = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedProviders: [],
      isComparing: false,
    }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    processMessage,
    toggleProviderComparison,
    clearComparison,
  };
}
