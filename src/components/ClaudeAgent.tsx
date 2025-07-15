import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { BrowserViewPanel } from './BrowserViewPanel';
import { HumanControlModal } from './HumanControlModal';
import { ClaudeCodeIntegration } from './ClaudeCodeIntegration';
import { useBrowserWebSocket } from '../services/browserWebSocket';

interface Message {
  role: 'user' | 'assistant';
  content: any; // Can be string or a complex response object
}

interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
  signature: string;
}

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  thinking_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  total_tokens: number;
}

interface ClaudeResponse {
  response: string;
  thinking?: ThinkingBlock[];
  tool_calls?: any[];
  tool_results?: any[];
  stop_reason?: string;
  token_usage?: TokenUsage;
}

interface StreamEvent {
  event: string;
  delta?: string;
  block?: any;
  usage?: TokenUsage;
  final_usage?: TokenUsage;
  stop_reason?: string;
  error?: string;
}

interface BrowserSession {
  session_id: string;
  browser_url?: string;
  current_url?: string;
  current_title?: string;
  screenshot?: string;
  last_update?: string;
  streaming?: boolean;
  status?: string;
}

interface TaskStep {
  id: string;
  description: string;
  status: "pending" | "active" | "complete";
  timestamp?: string;
  details?: string;
}

interface ClaudeAgentProps {
  onBrowserSessionUpdate?: (sessions: BrowserSession[]) => void;
  onCostUpdate?: (cost: number) => void;
  onTaskStepUpdate?: (step: TaskStep) => void;
  onMessageReceived?: (content: any) => void;
  conversationId?: string;
  userId?: string;
}

interface ClaudeAgentRef {
  handleExternalMessage: (message: string) => void;
}

const ClaudeAgent = forwardRef<ClaudeAgentRef, ClaudeAgentProps>(({
  onBrowserSessionUpdate,
  onCostUpdate,
  onTaskStepUpdate,
  onMessageReceived,
  conversationId = 'default-conversation',
  userId
}, ref) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');
    const [currentThinkingBlocks, setCurrentThinkingBlocks] = useState<ThinkingBlock[]>([]);
    const [showThinking, setShowThinking] = useState(true);
    const [enableBrowserUse, setEnableBrowserUse] = useState(true);
    // Sonar tools should always be available by default but remain toggleable in UI
    const [enableSonarTools, setEnableSonarTools] = useState(true);
    const [deepResearchMode, setDeepResearchMode] = useState(false);
    const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
    const streamingMessageRef = useRef<string>('');
    const thinkingBlocksRef = useRef<ThinkingBlock[]>([]);

    // Code integration state
    const [showCodePanel, setShowCodePanel] = useState(false);
    const [currentCodeMessage, setCurrentCodeMessage] = useState<string>('');

    // Browser integration state
    const [showBrowserPanel, setShowBrowserPanel] = useState(false);
    const [showControlModal, setShowControlModal] = useState(false);
    const [pendingControlSession, setPendingControlSession] = useState<string | null>(null);
    const [browserSessions, setBrowserSessions] = useState<BrowserSession[]>([]);

    // Browser WebSocket integration
    const { 
        sessions: wsSessions, 
        requestControlTransition, 
        sendUserFeedback,
        isConnected: wsConnected 
    } = useBrowserWebSocket();

    // Merge WebSocket sessions with local browser sessions
    useEffect(() => {
        const allSessions = [...browserSessions];
        
        // Add WebSocket sessions that aren't already in local sessions
        wsSessions.forEach(wsSession => {
            if (!allSessions.find(s => s.session_id === wsSession.session_id)) {
                allSessions.push({
                    session_id: wsSession.session_id,
                    browser_url: wsSession.browser_url,
                    current_url: wsSession.current_url,
                    current_title: wsSession.current_title,
                    screenshot: wsSession.screenshot,
                    last_update: wsSession.last_update,
                    streaming: wsSession.streaming,
                    status: wsSession.status
                });
            }
        });
        
        setBrowserSessions(allSessions);
        setShowBrowserPanel(allSessions.length > 0);
        
        // Notify parent component
        if (onBrowserSessionUpdate) {
            onBrowserSessionUpdate(allSessions);
        }
    }, [wsSessions, onBrowserSessionUpdate]);

    // Code need detection function
    const detectsCodeNeed = (message: string): boolean => {
        const codeKeywords = [
            'create', 'generate', 'write', 'build', 'implement', 'code',
            'function', 'class', 'component', 'script', 'program',
            'application', 'tool', 'utility', 'example', 'demo', 'make'
        ];
        
        const languageKeywords = [
            'javascript', 'python', 'typescript', 'html', 'css', 'react',
            'vue', 'angular', 'node', 'express', 'fastapi', 'flask'
        ];
        
        const lowerMessage = message.toLowerCase();
        const hasCodeKeyword = codeKeywords.some(keyword => lowerMessage.includes(keyword));
        const hasLanguageKeyword = languageKeywords.some(keyword => lowerMessage.includes(keyword));
        
        return hasCodeKeyword && (hasLanguageKeyword || lowerMessage.includes('code'));
    };

    // Browser need detection function
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

    // Enhanced message processing with browser integration
    const processMessageForBrowser = async (message: string): Promise<boolean> => {
        if (!enableBrowserUse || !detectsBrowserNeed(message)) {
            return false;
        }

        try {
            // Call backend to create browser task
            const response = await fetch('/api/browser/claude/browser-task', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation_id: conversationId,
                    task: message,
                    user_id: userId,
                    context: {
                        deep_research_mode: deepResearchMode,
                        enable_sonar_tools: enableSonarTools
                    }
                })
            });

            if (response.ok) {
                const result = await response.json();
                
                if (result.success) {
                    // Add browser task message to chat
                    const browserMessage: Message = {
                        role: 'assistant',
                        content: {
                            text: "I've started working on that browser task. You can see the browser activity in the Browser View panel.",
                            browser_session_id: result.session_id,
                            browser_task: true,
                            tool_calls: [{
                                name: 'browser_automation',
                                input: { task: message, session_id: result.session_id }
                            }],
                            tool_results: [{
                                content: JSON.stringify({
                                    success: true,
                                    session_id: result.session_id,
                                    task: message,
                                    browser_thinking: "Browser automation task initiated successfully"
                                })
                            }]
                        }
                    };

                    setMessages(prev => [...prev, browserMessage]);
                    
                    // Update browser sessions
                    if (result.sessions) {
                        setBrowserSessions(result.sessions);
                    }

                    return true;
                }
            }
        } catch (error) {
            console.error('Error creating browser task:', error);
        }

        return false;
    };

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        handleExternalMessage: (message: string) => {
            setInput(message);
            handleSend(message);
        }
    }), []);

    const handleSend = async (externalMessage?: string) => {
        const messageToSend = externalMessage || input;
        if (!messageToSend.trim() || isStreaming) return;

        // Auto-enable tools for medication-related queries
        const isMedicationQuery = messageToSend.toLowerCase().includes('medication') ||
                                 messageToSend.toLowerCase().includes('drug') ||
                                 messageToSend.toLowerCase().includes('prescription') ||
                                 messageToSend.includes('FDA Drug/Device Labeling API') ||
                                 messageToSend.includes('PubMed E-UTILS API') ||
                                 messageToSend.includes('Perplexity Sonar Reasoning Pro') ||
                                 messageToSend.includes('ozempic') ||
                                 messageToSend.includes('eliquis') ||
                                 messageToSend.includes('jardiance');
        
        // Auto options for medication queries (kept) – Sonar already enabled by default
        if (isMedicationQuery) {
            setEnableBrowserUse(true);
            setDeepResearchMode(true);
        }

        const userMessage: Message = { role: 'user', content: messageToSend };
        const previousMessages: Message[] = [...messages];
        setMessages([...previousMessages, userMessage]);
        if (!externalMessage) setInput('');

        // Check if this message needs code generation
        if (detectsCodeNeed(messageToSend)) {
            setCurrentCodeMessage(messageToSend);
            setShowCodePanel(true);
        }

        // Check if this message needs browser automation
        const browserTaskCreated = await processMessageForBrowser(messageToSend);
        
        if (browserTaskCreated) {
            // Browser task was created, don't send to regular Claude API
            return;
        }

        // Continue with regular Claude processing
        setIsStreaming(true);
        streamingMessageRef.current = '';
        thinkingBlocksRef.current = [];
        setCurrentStreamingMessage('');
        setCurrentThinkingBlocks([]);

        try {
            const response = await fetch('/api/claude/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: messageToSend,
                    conversation_history: previousMessages,
                    enable_thinking: true,
                    thinking_budget: deepResearchMode ? 32000 : 16000,
                    max_output_tokens: 30000,
                    enable_browser_use: enableBrowserUse,
                    enable_sonar_tools: true,
                    deep_research_mode: deepResearchMode
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No reader available');
            }

            const decoder = new TextDecoder();
            let currentBlock: any = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const event: StreamEvent = JSON.parse(line.slice(6));
                            
                            switch (event.event) {
                                case 'content_block_start':
                                    currentBlock = event.block;
                                    if (currentBlock?.type === 'thinking') {
                                        thinkingBlocksRef.current.push({
                                            type: 'thinking',
                                            thinking: '',
                                            signature: ''
                                        });
                                    }
                                    break;
                                
                                case 'thinking_delta':
                                    if (event.delta && thinkingBlocksRef.current.length > 0) {
                                        const lastBlock = thinkingBlocksRef.current[thinkingBlocksRef.current.length - 1];
                                        lastBlock.thinking += event.delta;
                                        setCurrentThinkingBlocks([...thinkingBlocksRef.current]);
                                    }
                                    break;
                                
                                case 'text_delta':
                                    if (event.delta) {
                                        streamingMessageRef.current += event.delta;
                                        setCurrentStreamingMessage(streamingMessageRef.current);
                                    }
                                    break;
                                
                                case 'signature_delta':
                                    if (event.delta && thinkingBlocksRef.current.length > 0) {
                                        const lastBlock = thinkingBlocksRef.current[thinkingBlocksRef.current.length - 1];
                                        lastBlock.signature += event.delta;
                                    }
                                    break;
                                
                                case 'tool_input_delta':
                                    // Handle tool input streaming if needed
                                    break;
                                
                                case 'content_block_stop':
                                    currentBlock = null;
                                    break;
                                
                                case 'usage_update':
                                    if (event.usage) {
                                        setTokenUsage(event.usage);
                                    }
                                    break;
                                
                                case 'message_stop':
                                    // Handle stop reasons including 'refusal'
                                    if (event.stop_reason === 'refusal') {
                                        streamingMessageRef.current = 'I cannot process this request for safety reasons.';
                                        setCurrentStreamingMessage(streamingMessageRef.current);
                                    }
                                    break;
                                
                                case 'done':
                                    if (event.final_usage) {
                                        setTokenUsage(event.final_usage);
                                        // Calculate cost and notify parent
                                        const totalTokens = event.final_usage.input_tokens + event.final_usage.output_tokens;
                                        const estimatedCost = totalTokens * 0.000015; // Rough estimate for Sonnet 4
                                        if (onCostUpdate) onCostUpdate(estimatedCost);
                                    }
                                    break;
                                
                                case 'error':
                                    console.error('Streaming error:', event.error);
                                    streamingMessageRef.current = `Error: ${event.error}`;
                                    setCurrentStreamingMessage(streamingMessageRef.current);
                                    break;
                            }
                        } catch (e) {
                            console.error('Failed to parse SSE event:', e);
                        }
                    }
                }
            }

            // Finalize the assistant message
            const assistantMessage: Message = { 
                role: 'assistant', 
                content: {
                    text: streamingMessageRef.current,
                    thinking: thinkingBlocksRef.current,
                    tool_calls: [],
                    tool_results: []
                }
            };
            setMessages([...previousMessages, userMessage, assistantMessage]);
            setCurrentStreamingMessage('');
            setCurrentThinkingBlocks([]);
            
            // Send the full structured response to parent component
            if (onMessageReceived) {
                onMessageReceived({
                    text: streamingMessageRef.current,
                    thinking: thinkingBlocksRef.current,
                    tool_calls: [],
                    tool_results: []
                });
            }
            
            // Check for browser session creation from tool results
            const browserSessionPattern = /session_id['":\s]+([a-f0-9-]+)/gi;
            const sessionMatches = streamingMessageRef.current.match(browserSessionPattern);
            if (sessionMatches && onBrowserSessionUpdate) {
                const sessions = sessionMatches.map(match => {
                    const sessionId = match.replace(/session_id['":\s]+/, '');
                    return {
                        session_id: sessionId,
                        browser_url: `http://localhost:8000/browser/${sessionId}`,
                        current_url: '',
                        current_title: 'Browser Session',
                        streaming: true
                    };
                });
                onBrowserSessionUpdate(sessions);
            }
            
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage: Message = { 
                role: 'assistant', 
                content: 'Sorry, something went wrong while streaming the response.' 
            };
            setMessages([...previousMessages, userMessage, errorMessage]);
        } finally {
            setIsStreaming(false);
        }
    };

    // Browser control handlers
    const handleUserControlChange = async (sessionId: string, hasControl: boolean) => {
        if (hasControl) {
            // User wants to take control - show modal
            setPendingControlSession(sessionId);
            setShowControlModal(true);
        } else {
            // User is releasing control
            try {
                await requestControlTransition(sessionId, false);
            } catch (error) {
                console.error('Error releasing control:', error);
            }
        }
    };

    const handleControlModalSubmit = async (message: string, actionType: 'guidance' | 'handoff') => {
        if (!pendingControlSession) return;

        try {
            if (actionType === 'guidance') {
                // Send guidance without taking control
                await sendUserFeedback(pendingControlSession, message, 'guidance');
                
                // Add guidance message to chat
                const guidanceMessage: Message = {
                    role: 'assistant',
                    content: {
                        text: `Guidance provided to browser agent: "${message}"`,
                        system_message: true,
                        browser_session_id: pendingControlSession
                    }
                };
                setMessages(prev => [...prev, guidanceMessage]);
                
            } else {
                // Take control
                await requestControlTransition(pendingControlSession, true, message, 'handoff');
                
                // Add control message to chat
                const controlMessage: Message = {
                    role: 'assistant',
                    content: {
                        text: `Human control activated for browser session. Message: "${message}"`,
                        system_message: true,
                        browser_session_id: pendingControlSession,
                        human_control: true
                    }
                };
                setMessages(prev => [...prev, controlMessage]);
            }

            // Also send to backend
            await fetch('/api/browser/claude/human-control', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: pendingControlSession,
                    action_type: actionType,
                    message,
                    user_id: userId
                })
            });

        } catch (error) {
            console.error('Error handling control request:', error);
        } finally {
            setShowControlModal(false);
            setPendingControlSession(null);
        }
    };

    const handleReturnControl = async (sessionId: string, summary: string) => {
        try {
            // Release control via WebSocket
            await requestControlTransition(sessionId, false, summary, 'handoff');

            // Notify backend
            await fetch('/api/browser/claude/resume-control', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    human_actions_summary: summary,
                    user_id: userId
                })
            });

            // Add resume message to chat
            const resumeMessage: Message = {
                role: 'assistant',
                content: {
                    text: `Control returned to AI agent. Human actions summary: "${summary}"`,
                    system_message: true,
                    browser_session_id: sessionId
                }
            };
            setMessages(prev => [...prev, resumeMessage]);

        } catch (error) {
            console.error('Error returning control:', error);
        }
    };

    const renderMessageContent = (msg: Message) => {
        if (typeof msg.content === 'string') {
            return <div className="whitespace-pre-wrap">{msg.content}</div>;
        }

        const content = msg.content;
        return (
            <div className="space-y-2">
                {showThinking && content.thinking && content.thinking.length > 0 && (
                    <details className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
                        <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400">
                            💭 Thinking Process ({content.thinking.length} phase{content.thinking.length > 1 ? 's' : ''})
                        </summary>
                        <div className="mt-2">
                            {/* Consolidate thinking blocks into one cohesive flow */}
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                <pre className="whitespace-pre-wrap font-mono text-xs">
                                    {content.thinking.map((block: ThinkingBlock, idx: number) => {
                                        const phaseHeader = idx === 0 ? '' : `\n\n--- Phase ${idx + 1} ---\n`;
                                        return phaseHeader + block.thinking;
                                    }).join('')}
                                </pre>
                                {content.thinking.some((block: ThinkingBlock) => block.signature) && (
                                    <div className="mt-2 text-xs text-gray-500 border-t pt-2">
                                        <details>
                                            <summary className="cursor-pointer">View Signatures</summary>
                                            <div className="mt-1 space-y-1">
                                                {content.thinking.map((block: ThinkingBlock, idx: number) => (
                                                    block.signature && (
                                                        <div key={idx} className="font-mono text-xs">
                                                            Phase {idx + 1}: {block.signature.substring(0, 40)}...
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        </details>
                                    </div>
                                )}
                            </div>
                        </div>
                    </details>
                )}
                
                {content.tool_calls && content.tool_calls.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded">
                        <div className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                            🔧 Tool Calls ({content.tool_calls.length})
                        </div>
                        <div className="space-y-2">
                            {content.tool_calls.map((tool: any, idx: number) => (
                                <details key={idx} className="bg-white dark:bg-gray-800 rounded border">
                                    <summary className="cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-mono text-blue-700 dark:text-blue-300">{tool.name}</span>
                                                {tool.name === 'web_search' && (
                                                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                                                        🌐 TIER 1 Search
                                                    </span>
                                                )}
                                                {tool.name.includes('sonar') && (
                                                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-xs">
                                                        🔍 Research
                                                    </span>
                                                )}
                                                {tool.name.includes('browser') && (
                                                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs">
                                                        🌐 Browser
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-500">▼</span>
                                        </div>
                                    </summary>
                                    <div className="p-2 border-t">
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Input Parameters:</div>
                                        <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                                            {JSON.stringify(tool.input, null, 2)}
                                        </pre>
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                )}
                
                {content.web_search_results && content.web_search_results.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {content.web_search_results.map((searchResult: any, idx: number) => (
                            <div key={idx} className="p-3 rounded bg-blue-50 dark:bg-blue-900/30">
                                <div className="text-sm font-semibold mb-2 flex items-center space-x-2">
                                    <span className="text-blue-800 dark:text-blue-200">🌐 Native Web Search Results</span>
                                    <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                        TIER 1
                                    </span>
                                </div>
                                {searchResult.results && Array.isArray(searchResult.results) && (
                                    <div className="space-y-2">
                                        {searchResult.results.slice(0, 5).map((result: any, rIdx: number) => (
                                            <div key={rIdx} className="p-2 bg-white dark:bg-gray-900 rounded text-xs">
                                                <div className="font-semibold text-blue-800 dark:text-blue-200">
                                                    {result.title}
                                                </div>
                                                <div className="text-blue-600 dark:text-blue-400 truncate">
                                                    {result.url}
                                                </div>
                                                {result.snippet && (
                                                    <div className="text-gray-600 dark:text-gray-400 mt-1">
                                                        {result.snippet}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                
                {content.tool_results && content.tool_results.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                            📊 Tool Results ({content.tool_results.length})
                        </div>
                        {content.tool_results.map((result: any, idx: number) => {
                            let parsedResult;
                            try {
                                parsedResult = JSON.parse(result.content);
                            } catch {
                                parsedResult = { content: result.content };
                            }
                            
                            // Check if this is a native WebSearch result  
                            const isWebSearchResult = parsedResult.type === 'web_search' ||
                                                     parsedResult.status === 'completed_by_sdk' ||
                                                     (parsedResult.search_results && Array.isArray(parsedResult.search_results));
                            
                            // Check if this is a Sonar tool result
                            const isSonarResult = parsedResult.model && parsedResult.model.includes('sonar');
                            
                            // Check if this is a browser tool result with thinking
                            const isBrowserResult = parsedResult.browser_thinking || parsedResult.session_id;
                            
                            return (
                                <details key={idx} className={`rounded border ${
                                    isWebSearchResult ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' :
                                    isSonarResult ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800' : 
                                    isBrowserResult ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' :
                                    'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700'
                                }`}>
                                    <summary className="cursor-pointer p-3 hover:bg-opacity-70">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                        {isWebSearchResult ? (
                                            <>
                                                <span className="text-blue-800 dark:text-blue-200">🌐 Native Web Search</span>
                                                <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                                    TIER 1
                                                </span>
                                            </>
                                        ) : isSonarResult ? (
                                            <>
                                                <span className="text-purple-800 dark:text-purple-200">🔍 Research Results</span>
                                                <span className="text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                                                    {parsedResult.model.includes('deep') ? 'TIER 3' : 'TIER 2'} - {parsedResult.model}
                                                </span>
                                            </>
                                        ) : isBrowserResult ? (
                                            <>
                                                <span className="text-green-800 dark:text-green-200">🌐 Browser Agent Results</span>
                                                <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                                                    TIER 4 - ACTION
                                                </span>
                                                {parsedResult.thinking_step && (
                                                    <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                                                        Step {parsedResult.thinking_step}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-gray-800 dark:text-gray-200">📋 Tool Results</span>
                                        )}
                                            </div>
                                            <span className="text-xs text-gray-500">▼</span>
                                        </div>
                                    </summary>
                                    <div className="p-3 border-t">
                                    
                                    {isSonarResult && parsedResult.citations && parsedResult.citations.length > 0 && (
                                        <div className="mb-3 p-2 bg-white dark:bg-gray-900 rounded">
                                            <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">
                                                📚 Citations ({parsedResult.citations.length})
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {parsedResult.citations.map((citation: string, citIdx: number) => (
                                                    <span key={citIdx} className="bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded text-xs">
                                                        [{citation}]
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {isSonarResult && parsedResult.reasoning && (
                                        <div className="mb-3 p-2 bg-white dark:bg-gray-900 rounded">
                                            <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">
                                                🧠 Reasoning Process
                                            </div>
                                            <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                                {parsedResult.reasoning.substring(0, 200)}
                                                {parsedResult.reasoning.length > 200 && '...'}
                                            </pre>
                                        </div>
                                    )}
                                    
                                    {isSonarResult && parsedResult.structured_data && (
                                        <div className="mb-3 p-2 bg-white dark:bg-gray-900 rounded">
                                            <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">
                                                📊 Structured Data
                                            </div>
                                            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                                                {JSON.stringify(parsedResult.structured_data, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                    
                                    {isBrowserResult && parsedResult.browser_thinking && (
                                        <div className="mb-3 p-2 bg-white dark:bg-gray-900 rounded">
                                            <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                                                🤖 Browser Agent Thinking
                                            </div>
                                            <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                                {parsedResult.browser_thinking}
                                            </pre>
                                        </div>
                                    )}
                                    
                                    {isBrowserResult && parsedResult.initial_status && (
                                        <div className="mb-3 p-2 bg-white dark:bg-gray-900 rounded">
                                            <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                                                📋 Browser Session Status
                                            </div>
                                            <div className="text-xs space-y-1">
                                                {parsedResult.initial_status.status && (
                                                    <div>Status: <span className="font-mono">{parsedResult.initial_status.status}</span></div>
                                                )}
                                                {parsedResult.initial_status.current_page_url && (
                                                    <div>URL: <span className="font-mono text-blue-600 dark:text-blue-400">{parsedResult.initial_status.current_page_url}</span></div>
                                                )}
                                                {parsedResult.initial_status.current_page_title && (
                                                    <div>Title: <span className="font-mono">{parsedResult.initial_status.current_page_title}</span></div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {isWebSearchResult && parsedResult.search_results && (
                                        <div className="mb-3 p-2 bg-white dark:bg-gray-900 rounded">
                                            <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                                                🌐 Search Results ({parsedResult.search_results.length})
                                            </div>
                                            <div className="space-y-2">
                                                {parsedResult.search_results.slice(0, 5).map((searchResult: any, srIdx: number) => (
                                                    <div key={srIdx} className="text-xs">
                                                        <div className="font-semibold text-blue-800 dark:text-blue-200">
                                                            {searchResult.title}
                                                        </div>
                                                        <div className="text-blue-600 dark:text-blue-400 truncate">
                                                            {searchResult.url}
                                                        </div>
                                                        <div className="text-gray-600 dark:text-gray-400 mt-1">
                                                            {searchResult.snippet || searchResult.description}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        {isWebSearchResult ? (
                                            <div className="whitespace-pre-wrap">{parsedResult.content || parsedResult.summary || 'Web search completed'}</div>
                                        ) : isSonarResult ? (
                                            <div className="whitespace-pre-wrap">{parsedResult.content}</div>
                                        ) : isBrowserResult ? (
                                            <div className="space-y-2">
                                                {parsedResult.success && (
                                                    <div className="text-green-600 dark:text-green-400 font-medium">
                                                        ✅ Browser agent started successfully
                                                    </div>
                                                )}
                                                {parsedResult.session_id && (
                                                    <div className="text-xs text-gray-500">
                                                        Session ID: <span className="font-mono">{parsedResult.session_id}</span>
                                                    </div>
                                                )}
                                                {parsedResult.task && (
                                                    <div className="text-xs">
                                                        Task: <span className="italic">{parsedResult.task}</span>
                                                    </div>
                                                )}
                                                {parsedResult.error && (
                                                    <div className="text-red-600 dark:text-red-400 font-medium">
                                                        ❌ {parsedResult.error}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded overflow-x-auto">
                                                {typeof parsedResult === 'string' ? parsedResult : JSON.stringify(parsedResult, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                    </div>
                                </details>
                            );
                        })}
                    </div>
                )}
                
                {content.text && (
                    <div className="whitespace-pre-wrap">
                        {content.text}
                        {content.browser_session_id && (
                            <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/30 rounded text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-green-600 dark:text-green-400">🌐 Browser Session Active</span>
                                    <button
                                        onClick={() => setShowBrowserPanel(true)}
                                        className="text-blue-500 hover:text-blue-700 underline text-xs"
                                    >
                                        View Browser Panel
                                    </button>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Session: {content.browser_session_id.substring(0, 8)}...
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderStreamingContent = () => {
        if (!isStreaming) return null;

        return (
            <div className="flex justify-start">
                <div className="max-w-[85%] card-premium p-4 rounded-2xl">
                    <div className="space-y-3">
                        {showThinking && currentThinkingBlocks.length > 0 && (
                            <div className="p-3 rounded-xl" 
                              style={{ 
                                background: 'var(--smoke)',
                                border: '1px solid var(--steel)'
                              }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="spinner-premium" style={{ width: '1rem', height: '1rem' }} />
                                    <span className="text-sm font-medium" style={{ color: 'var(--ghost)' }}>
                                        Thinking...
                                    </span>
                                </div>
                                {currentThinkingBlocks.map((block, idx) => (
                                    <pre key={idx} className="text-xs font-mono whitespace-pre-wrap" 
                                      style={{ color: 'var(--platinum)' }}
                                    >
                                        {block.thinking}
                                    </pre>
                                ))}
                            </div>
                        )}
                        
                        {currentStreamingMessage && (
                            <div className="whitespace-pre-wrap" style={{ color: 'var(--snow)' }}>
                                {currentStreamingMessage}
                            </div>
                        )}
                        
                        {!currentStreamingMessage && currentThinkingBlocks.length === 0 && (
                            <div className="flex items-center gap-3">
                                <div className="spinner-premium" />
                                <span className="text-sm" style={{ color: 'var(--ghost)' }}>
                                    Claude is thinking...
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Code Integration Panel */}
            {showCodePanel && (
                <div className="border-b" style={{ borderColor: 'var(--steel)' }}>
                    <ClaudeCodeIntegration 
                        message={currentCodeMessage}
                        onCodeGenerated={(code, language) => {
                            console.log('Code generated:', { code, language });
                        }}
                        onRequestProcessed={(result) => {
                            console.log('Code request processed:', result);
                        }}
                    />
                </div>
            )}
            
            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Main Claude Agent Panel */}
                <div className={`flex flex-col ${showBrowserPanel ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
                <div className="p-4 border-b flex items-center justify-between" 
                  style={{ 
                    borderColor: 'var(--steel)',
                    background: 'var(--charcoal)'
                  }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ 
                            background: 'var(--gradient-flame)',
                            boxShadow: '0 0 15px rgba(255, 87, 34, 0.3)'
                          }}
                        >
                            <span className="text-white text-sm font-bold">C</span>
                        </div>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--snow)' }}>Claude Agent</h2>
                        
                        {/* Browser connection indicator */}
                        {showBrowserPanel && (
                            <div className="flex items-center gap-2">
                                <div 
                                    style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: wsConnected ? 'var(--accent-green)' : 'var(--accent-orange)',
                                        animation: wsConnected ? 'none' : 'pulse 2s infinite'
                                    }}
                                />
                                <span className="text-xs" style={{ color: 'var(--ghost)' }}>
                                    Browser {wsConnected ? 'Connected' : 'Offline'}
                                </span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className={`toggle-switch ${showThinking ? 'active' : ''}`}
                              onClick={() => setShowThinking(!showThinking)}
                              style={{ width: '2.5rem', height: '1.25rem' }}
                            >
                                <div className="toggle-switch-thumb" style={{ width: '1rem', height: '1rem' }} />
                            </div>
                            <span className="text-xs" style={{ color: 'var(--ghost)' }}>Thinking</span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className={`toggle-switch ${enableBrowserUse ? 'active' : ''}`}
                              onClick={() => setEnableBrowserUse(!enableBrowserUse)}
                              style={{ width: '2.5rem', height: '1.25rem' }}
                            >
                                <div className="toggle-switch-thumb" style={{ width: '1rem', height: '1rem' }} />
                            </div>
                            <span className="text-xs" style={{ color: 'var(--ghost)' }}>Browser</span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className={`toggle-switch ${deepResearchMode ? 'active' : ''}`}
                              onClick={() => setDeepResearchMode(!deepResearchMode)}
                              style={{ width: '2.5rem', height: '1.25rem' }}
                            >
                                <div className="toggle-switch-thumb" style={{ width: '1rem', height: '1rem' }} />
                            </div>
                            <span className="text-xs" style={{ color: 'var(--ghost)' }}>Research</span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className={`toggle-switch ${showCodePanel ? 'active' : ''}`}
                              onClick={() => setShowCodePanel(!showCodePanel)}
                              style={{ width: '2.5rem', height: '1.25rem' }}
                            >
                                <div className="toggle-switch-thumb" style={{ width: '1rem', height: '1rem' }} />
                            </div>
                            <span className="text-xs" style={{ color: 'var(--ghost)' }}>Code</span>
                        </label>
                        
                        {tokenUsage && (
                            <div className="text-xs px-3 py-1 rounded-lg" 
                              style={{ 
                                background: 'var(--obsidian)',
                                color: 'var(--ghost)',
                                border: '1px solid var(--steel)'
                              }}
                            >
                                {tokenUsage.input_tokens}→{tokenUsage.output_tokens}
                                {tokenUsage.thinking_tokens > 0 && `→${tokenUsage.thinking_tokens}💭`}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--obsidian)' }}>
                    <div className="space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-2xl ${
                                    msg.role === 'user' 
                                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' 
                                        : msg.content?.system_message
                                        ? 'bg-gradient-to-br from-gray-600 to-gray-700 text-white text-sm'
                                        : 'card-premium'
                                }`}>
                                    {renderMessageContent(msg)}
                                </div>
                            </div>
                        ))}
                        {renderStreamingContent()}
                    </div>
                </div>
                
                <div className="p-4 border-t" style={{ 
                    borderColor: 'var(--steel)',
                    background: 'var(--charcoal)'
                }}>
                    <div className="flex gap-3">
                        <input
                            className="input-premium flex-1"
                            placeholder="Message Claude... (I can help with browser automation too!)"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !isStreaming && handleSend()}
                            disabled={isStreaming}
                            style={{ fontSize: '0.875rem', padding: '0.75rem 1rem' }}
                        />
                        <button 
                            className="btn-premium px-6"
                            onClick={() => handleSend()}
                            disabled={isStreaming}
                        >
                            {isStreaming ? (
                                <div className="spinner-premium" />
                            ) : (
                                'Send'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Browser Panel */}
            {showBrowserPanel && (
                <div className="w-1/2 border-l" style={{ borderColor: 'var(--steel)' }}>
                    <BrowserViewPanel
                        isActive={true}
                        sessions={browserSessions}
                        onUserControlChange={handleUserControlChange}
                        onCloseSession={async (sessionId) => {
                            // Handle session close
                            setBrowserSessions(prev => prev.filter(s => s.session_id !== sessionId));
                            
                            // Notify backend
                            try {
                                await fetch(`/api/browser/session/${sessionId}`, {
                                    method: 'DELETE'
                                });
                            } catch (error) {
                                console.error('Error closing session:', error);
                            }
                        }}
                        onCloseAll={async () => {
                            // Close all sessions
                            setBrowserSessions([]);
                            setShowBrowserPanel(false);
                            
                            // Notify backend
                            try {
                                await fetch('/api/browser/sessions', {
                                    method: 'DELETE'
                                });
                            } catch (error) {
                                console.error('Error closing all sessions:', error);
                            }
                        }}
                    />
                </div>
            )}

            {/* Human Control Modal */}
            <HumanControlModal
                isOpen={showControlModal}
                onClose={() => {
                    setShowControlModal(false);
                    setPendingControlSession(null);
                }}
                onSubmit={handleControlModalSubmit}
                sessionId={pendingControlSession || ''}
                currentUrl={browserSessions.find(s => s.session_id === pendingControlSession)?.current_url}
            />
            </div>
        </div>
    );
});

ClaudeAgent.displayName = 'ClaudeAgent';

export default ClaudeAgent;