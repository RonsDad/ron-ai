"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Heart, List, MapPin, Search, BrainCircuit, SlidersHorizontal, Users, X, ChevronDown, TestTube, FileText, ShieldCheck, Code, MessageSquare, ArrowUp, Paperclip, Mic, Sparkles, PanelLeft, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { TooltipProvider } from "./ui/tooltip";
import { Switch } from "./ui/switch";
import { ChatMessage } from "./ChatMessage";
import { SidebarLayout } from "./SidebarLayout";
import { useSidebar } from "./ui/sidebar";
import { MacroMenu } from "./MacroMenu";
import { useClaudeBrowserService } from "../services/claudeBrowserService";
import { useClaudeHealthcareBrowserService } from "../services/claudeHealthcareBrowserService";
import ClaudeAgent from "./ClaudeAgent";
import { BrowserViewPanel } from "./BrowserViewPanel";
import { useBrowserWebSocket } from "../services/browserWebSocket";

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  thinking?: any[];
  tool_calls?: any[];
  tool_results?: any[];
}

export function MainLayout() {
  const [searchQuery, setSearchQuery] = useState("");
  const [providers, setProviders] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [isFavoritesSheetOpen, setIsFavoritesSheetOpen] = useState(false);
  const [isPromptBuilderOpen, setIsPromptBuilderOpen] = useState(false);
  
  const [selectedForCompare, setSelectedForCompare] = useState<any[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  
  const [deepResearch, setDeepResearch] = useState(false);
  const [showMacroMenu, setShowMacroMenu] = useState(false);

  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [promptBuilderInitialQuery, setPromptBuilderInitialQuery] = useState("");
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const macroTriggerRef = useRef<HTMLDivElement>(null);
  const claudeAgentRef = useRef<any>(null);

  // Browser panel state
  const [showBrowserPanel, setShowBrowserPanel] = useState(false);
  const [browserSessions, setBrowserSessions] = useState<any[]>([]);
  
  // Browser WebSocket integration
  const { 
    sessions: wsSessions, 
    requestControlTransition, 
    sendUserFeedback,
    isConnected: wsConnected 
  } = useBrowserWebSocket();

  // Claude Browser Service integration
  const {
    messages,
    isProcessing,
    browserSession,
    taskTitle,
    elapsedTime,
    estimatedCost,
    processMessage,
    resetConversation,
    stopTask,
    isActive,
    hasBrowserSession
  } = useClaudeBrowserService();

  // Healthcare service integration
  const healthcareService = useClaudeHealthcareBrowserService();

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isAiResponding]);

  // Close macro menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (macroTriggerRef.current && !macroTriggerRef.current.contains(event.target as Node)) {
        setShowMacroMenu(false);
      }
    };

    if (showMacroMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMacroMenu]);

  // Synchronize browser sessions and panel state
  useEffect(() => {
    // Merge WebSocket sessions with local browser sessions
    const allSessions = [...browserSessions];
    let newSessionAdded = false;
    
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
          status: wsSession.status,
          live_url: wsSession.live_url,
          is_browserless: wsSession.is_browserless
        });
        newSessionAdded = true;
      }
    });
    
    // Update sessions if new ones were added
    if (newSessionAdded) {
      setBrowserSessions(allSessions);
    }
    
    // Auto-open browser panel when sessions are available
    if (allSessions.length > 0 && !showBrowserPanel) {
      setShowBrowserPanel(true);
    }
    
    // Auto-close browser panel when no sessions
    if (allSessions.length === 0 && showBrowserPanel) {
      setShowBrowserPanel(false);
    }
  }, [wsSessions, browserSessions, showBrowserPanel]);

  const handleSearch = useCallback(async () => {
    console.log('🚀 MAIN LAYOUT DEBUG: handleSearch called - using ClaudeAgent');
    console.log('📊 Search query:', searchQuery);
    console.log('📊 Is AI responding:', isAiResponding);
    
    if (!searchQuery.trim() || isAiResponding) {
      console.log('⚠️  MAIN LAYOUT DEBUG: Early return - empty query or AI responding');
      return;
    }

    // Add user message to chat history
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: searchQuery
    };
    setChatHistory(prev => [...prev, userMessage]);

    console.log('📊 MAIN LAYOUT DEBUG: Sending to ClaudeAgent');
    setIsAiResponding(true);
    
    // Use ClaudeAgent instead of direct API call
    if (claudeAgentRef.current) {
      claudeAgentRef.current.handleExternalMessage(searchQuery);
    }
    
    setSearchQuery("");
  }, [searchQuery, isAiResponding]);

  // Detect healthcare intent
  const detectHealthcareIntent = (message: string): boolean => {
    const healthcareKeywords = [
      'doctor', 'physician', 'provider', 'specialist', 'clinic', 'hospital',
      'cardiologist', 'dermatologist', 'pediatrician', 'psychiatrist',
      'find a doctor', 'medical provider', 'healthcare provider',
      'appointment', 'medical care', 'treatment', 'diagnosis',
      'insurance', 'medication', 'prescription', 'health'
    ];

    const messageLower = message.toLowerCase();
    return healthcareKeywords.some(keyword => messageLower.includes(keyword));
  };

  const handleSelectProvider = (provider: any) => {
    setSelectedProvider(provider);
  };

  const handleToggleCompare = (provider: any) => {
    setSelectedForCompare(prev => {
      const isSelected = prev.some(p => p.id === provider.id);
      if (isSelected) {
        return prev.filter(p => p.id !== provider.id);
      } else {
        if (prev.length < 4) {
          return [...prev, provider];
        }
      }
      return prev;
    });
  };

  const handleStartCompare = () => {
    if (selectedForCompare.length >= 2) {
      setIsComparing(true);
    }
  };

  const handleExitCompare = () => {
    setIsComparing(false);
  };

  const handleRemoveFromCompare = (providerId: string) => {
    setSelectedForCompare(prev => {
      const updated = prev.filter(p => p.id !== providerId);
      if (updated.length < 2) {
        setIsComparing(false);
      }
      return updated;
    });
  };

  // Handle macro menu
  const handleMacroSelect = (template: string) => {
    setSearchQuery(template);
    setShowMacroMenu(false);
  };

  const handleMacroMenuToggle = () => {
    setShowMacroMenu(!showMacroMenu);
  };

  const mainContentVisible = useMemo(() => {
    return isComparing || isSearching || providers.length > 0 || hasSearched;
  }, [isComparing, isSearching, providers, hasSearched]);

  const Header = () => {
    const { toggleSidebar } = useSidebar();
    return (
      <header className="sticky top-0 z-40 w-full border-b glassmorphic">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
              <PanelLeft />
            </Button>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Nira AI
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFavoritesSheetOpen(true)}
            aria-label="View favorites"
          >
            <Heart className="h-6 w-6" />
          </Button>
        </div>
      </header>
    );
  };

  return (
    <TooltipProvider>
      <SidebarLayout>
        <div className="flex flex-col h-screen max-h-screen bg-background">
          <Header />
          <main className="flex-1 flex overflow-hidden relative">
            {/* Chat Interface */}
            <div className={`flex flex-col ${showBrowserPanel ? 'w-1/2' : 'w-full'} transition-all duration-300 container mx-auto p-4 md:p-6 lg:p-8 overflow-hidden`}>
              <AnimatePresence>
              {chatHistory.length === 0 && !mainContentVisible && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="absolute inset-0 flex items-center justify-center text-center px-4 md:px-6 lg:px-8"
                >
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4 text-glow">Your Health Advocacy Co-Pilot</h1>
                    <p className="max-w-3xl mx-auto text-muted-foreground md:text-xl">
                      Describe what you need, and let our AI handle the rest. Your journey to better health starts with a simple prompt.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto space-y-6 pr-4 -mr-4">
              <AnimatePresence>
                {chatHistory.length > 0 && (
                  <div className="space-y-6">
                    {chatHistory.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <ChatMessage message={msg} />
                      </motion.div>
                    ))}
                  </div>
                )}

                {isAiResponding && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ChatMessage message={{ sender: 'ai', text: '' }} isLoading={true} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <footer className="mt-auto pt-6">
              <div className="max-w-4xl mx-auto space-y-4 w-full">
                <div className="relative w-full glassmorphic rounded-lg shadow-lg shadow-primary/10 border-2 border-primary/20 p-2">
                  <div className="flex items-center w-full min-h-[5rem]">
                    <div className="absolute left-3 top-3 flex items-center gap-2">
                      <div className="flex items-center space-x-2 p-1 rounded-full border bg-background/50">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <Label htmlFor="deep-research" className="cursor-pointer text-xs font-bold">Deep Research</Label>
                        <Switch id="deep-research" checked={deepResearch} onCheckedChange={setDeepResearch}/>
                      </div>
                    </div>
                    <Input
                      type="search"
                      placeholder="Ask Claude anything - search, code, automate, research..."
                      className="w-full h-auto bg-transparent border-none text-lg pl-3 pr-40 focus-visible:ring-0 focus-visible:ring-offset-0 pt-12"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                      disabled={isAiResponding}
                    />

                    <div className="absolute right-3 bottom-3 flex items-center gap-2">
                      <div ref={macroTriggerRef}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-full text-muted-foreground hover:text-primary"
                          onClick={handleMacroMenuToggle}
                        >
                          <Zap className="h-5 w-5" />
                          <span className="sr-only">Quick actions</span>
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground">
                        <Paperclip className="h-5 w-5" />
                        <span className="sr-only">Attach file</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground">
                        <Mic className="h-5 w-5" />
                        <span className="sr-only">Use voice</span>
                      </Button>
                      <Button 
                        onClick={handleSearch} 
                        size="icon" 
                        className="h-10 w-10 rounded-full bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20" 
                        disabled={isAiResponding || !searchQuery.trim()}
                      >
                        <ArrowUp className="h-5 w-5" />
                        <span className="sr-only">Send</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
            </div>
            
            {/* Browser Panel */}
            {showBrowserPanel && (
              <div className="w-1/2 border-l border-border bg-background">
                <BrowserViewPanel 
                  isActive={true} 
                  sessions={browserSessions}
                  onUserControlChange={async (sessionId, takeControl) => {
                    try {
                      await requestControlTransition(sessionId, takeControl);
                    } catch (error) {
                      console.error('Failed to change user control:', error);
                    }
                  }}
                />
              </div>
            )}
          </main>
          
          {/* Macro Menu */}
          <MacroMenu 
            isVisible={showMacroMenu}
            onSelect={handleMacroSelect}
            onClose={() => setShowMacroMenu(false)}
            triggerRef={macroTriggerRef}
          />
          
          {/* Hidden ClaudeAgent component */}
          <div style={{ display: 'none' }}>
            <ClaudeAgent
              ref={claudeAgentRef}
              onMessageReceived={(content) => {
                console.log('📊 MAIN LAYOUT DEBUG: Received message from ClaudeAgent');
                const newMessage: Message = {
                  id: `assistant-${Date.now()}`,
                  sender: 'ai',
                  text: content.text || '',
                  thinking: content.thinking,
                  tool_calls: content.tool_calls,
                  tool_results: content.tool_results
                };
                setChatHistory(prev => [...prev, newMessage]);
                setIsAiResponding(false);
              }}
              onBrowserPanelChange={(show, sessions) => {
                console.log('📊 MAIN LAYOUT DEBUG: Browser panel state changed:', show, sessions);
                setShowBrowserPanel(show);
                if (sessions) {
                  setBrowserSessions(sessions);
                }
              }}
            />
          </div>
        </div>
      </SidebarLayout>
    </TooltipProvider>
  );
}