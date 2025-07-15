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

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || isAiResponding) return;

    const userMessage = searchQuery;
    const newUserMessage: Message = { 
      id: `user-${Date.now()}`, 
      sender: 'user', 
      text: userMessage 
    };
    
    setChatHistory(prev => [...prev, newUserMessage]);
    setSearchQuery("");
    setIsAiResponding(true);

    try {
      // Call Claude API directly
      const response = await fetch('/api/claude/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversation_history: chatHistory,
          enable_thinking: true,
          thinking_budget: deepResearch ? 32000 : 16000,
          max_output_tokens: 8192,
          enable_browser_use: true,
          enable_sonar_tools: true,
          deep_research_mode: deepResearch
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
                    thinking.push({ content: event.delta });
                  }
                  break;
                
                case 'text_delta':
                  if (event.delta) {
                    aiResponse += event.delta;
                    
                    // Update message in real-time
                    setChatHistory(prev => {
                      const newMessages = [...prev];
                      const lastMessage = newMessages[newMessages.length - 1];
                      
                      if (lastMessage && lastMessage.sender === 'ai') {
                        lastMessage.text = aiResponse;
                        lastMessage.thinking = thinking;
                      } else {
                        newMessages.push({
                          id: `assistant-${Date.now()}`,
                          sender: 'ai',
                          text: aiResponse,
                          thinking: thinking
                        });
                      }
                      
                      return newMessages;
                    });
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
        id: `assistant-${Date.now()}`,
        sender: 'ai',
        text: aiResponse,
        thinking: thinking.length > 0 ? thinking : undefined
      };

      setChatHistory(prev => {
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
      console.error('Failed to process message:', error);
      
      // Add error message
      const errorMsg: Message = {
        id: `assistant-error-${Date.now()}`,
        sender: 'ai',
        text: `I encountered an error: ${error}. Please try again.`
      };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsAiResponding(false);
    }
  }, [searchQuery, isAiResponding, chatHistory, deepResearch]);

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
          <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 flex flex-col overflow-hidden relative">
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
          </main>
          
          {/* Macro Menu */}
          <MacroMenu 
            isVisible={showMacroMenu}
            onSelect={handleMacroSelect}
            onClose={() => setShowMacroMenu(false)}
            triggerRef={macroTriggerRef}
          />
        </div>
      </SidebarLayout>
    </TooltipProvider>
  );
}