"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowUp, Bot, BrainCircuit, User, Paperclip, Mic, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ThemeToggle } from "@/components/theme-toggle"
import { PromptBuilderDialog } from "@/components/prompt-builder-dialog"
import { AgentStatusIndicator } from "@/components/agent-status-indicator"
import { ProviderSearchInterface } from "@/components/provider-search-interface"
import { MedicationManagerInterface } from "@/components/medication-manager-interface"
import { CareTeamPanel } from "@/components/care-team-panel"
import { ComputerUseAgent } from "@/components/computer-use-agent"
import { RetractableSidebar } from "@/components/retractable-sidebar"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useComputerAgent } from "@/hooks/use-computer-agent"
import { claudeAPI, parseSSEStream, type ChatMessage } from "@/lib/api"
import type { Message } from "@/lib/types"
import { ReasoningDisplay } from "@/components/reasoning-display"
import { MessageBubble } from "@/components/message-bubble"

export default function HealthCopilot() {
  const [isDeepResearch, setIsDeepResearch] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [showCareTeam, setShowCareTeam] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState("")
  const [currentReasoning, setCurrentReasoning] = useState("")
  const [reasoningTokens, setReasoningTokens] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { userProfile } = useUserProfile()
  const { agentState, startAgent, stopAgent } = useComputerAgent()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, currentStreamingMessage])

  const handleSendMessage = async () => {
    if (inputValue.trim() && !isProcessing) {
      const newMessage: Message = {
        role: "user",
        content: inputValue,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, newMessage])
      setInputValue("")
      setIsProcessing(true)
      setCurrentStreamingMessage("")
      setCurrentReasoning("")
      setReasoningTokens(0)

      // Check if Computer Use Agent is needed
      const requiresCUA = checkIfRequiresCUA(inputValue)
      if (requiresCUA) {
        try {
          await startAgent(`Researching: ${inputValue}`, undefined)
        } catch (error) {
          console.error("Error starting Computer Use Agent:", error)
        }
      }

      try {
        // Convert messages to API format
        const apiMessages: ChatMessage[] = messages.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        }))
        apiMessages.push({ role: "user", content: inputValue })

        // Determine which tools to enable based on context
        const tools: string[] = ["web_search", "text_editor", "browser_use"]
        if (inputValue.toLowerCase().includes("bash") || inputValue.toLowerCase().includes("command")) {
          tools.push("bash")
        }

        // Create assistant message placeholder
        const assistantMessage: Message = {
          role: "assistant",
          content: "",
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, assistantMessage])

        // Stream the response with interleaved thinking
        const stream = await claudeAPI.chatStream({
          messages: apiMessages,
          temperature: 1.0,
          max_tokens: 32000,
          tools: tools,
          enable_caching: true,
          cache_ttl: "5m",
          enable_thinking: true,
          thinking_budget: 20000,
          enable_citations: true,
          stream: true,
          system_prompt: `You are Ron AI, an advanced healthcare advocacy AI assistant powered by Claude Sonnet 4. 
You help users navigate their healthcare journey with clarity and confidence.

Current user profile:
- Name: ${userProfile.name}
- Age: ${userProfile.age}
- Conditions: ${userProfile.conditions?.join(", ") || "None"}
- Medications: ${userProfile.medications?.join(", ") || "None"}
- Insurance: ${userProfile.insurance}

When helping with healthcare tasks:
1. Be empathetic and supportive
2. Provide clear, actionable advice
3. Use your tools when needed to search for information, analyze documents, or help with tasks
4. Always prioritize user safety and encourage professional medical consultation when appropriate
5. If doing deep research, be thorough and cite sources

${isDeepResearch ? "DEEP RESEARCH MODE: Perform comprehensive research with multiple sources and detailed analysis." : ""}`
        })

        let fullContent = ""
        let fullReasoning = ""
        console.log("Starting to parse SSE stream...")
        for await (const event of parseSSEStream(stream)) {
          console.log("Received event:", JSON.stringify(event))
          
          // Handle content deltas (text)
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            fullContent += event.delta.text || ""
            setCurrentStreamingMessage(fullContent)
          }
          // Handle thinking deltas
          else if (event.type === 'content_block_delta' && event.delta?.type === 'thinking_delta') {
            fullReasoning += event.delta.text || ""
            setCurrentReasoning(fullReasoning)
          }
          // Handle tool use start
          else if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
            console.log(`Tool started: ${event.content_block.name}`)
            fullContent += `\n\n🔧 Using ${event.content_block.name} tool...`
            setCurrentStreamingMessage(fullContent)
          }
          // Handle tool results
          else if (event.type === 'tool_result') {
            console.log(`Tool ${event.tool_name} completed:`, event.result)
            const resultText = typeof event.result === 'string' ? event.result : JSON.stringify(event.result, null, 2)
            fullContent += `\n\n✅ Tool result: ${resultText}`
            setCurrentStreamingMessage(fullContent)
          }
          // Handle tool errors
          else if (event.type === 'tool_error') {
            console.error(`Tool ${event.tool_name} error:`, event.error)
            fullContent += `\n\n❌ Tool error: ${event.error}`
            setCurrentStreamingMessage(fullContent)
          }
          // Handle message completion
          else if (event.type === 'message_stop' || event.type === 'message_delta') {
            if (event.usage) {
              setReasoningTokens(event.usage.reasoning_tokens || 0)
            }
          }
          
          // Update the assistant message
          setMessages(prev => {
            const newMessages = [...prev]
            if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === "assistant") {
              newMessages[newMessages.length - 1] = {
                ...newMessages[newMessages.length - 1],
                content: fullContent,
                reasoning: fullReasoning,
                reasoningTokens: reasoningTokens
              }
            }
            return newMessages
          })
        }

      } catch (error) {
        console.error("Error calling Claude API:", error)
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: "I apologize, but I encountered an error while processing your request. Please try again.",
            timestamp: new Date(),
          }
        ])
      } finally {
        setIsProcessing(false)
        setCurrentStreamingMessage("")
        setCurrentReasoning("")
      }
    }
  }

  const checkIfRequiresCUA = (message: string): boolean => {
    const cuaTriggers = [
      "research",
      "look up",
      "find information",
      "check reviews",
      "verify",
      "browse",
      "search online",
      "deep research",
    ]
    return cuaTriggers.some((trigger) => message.toLowerCase().includes(trigger))
  }

  const renderAgentInterface = () => {
    // This can be enhanced to detect when Claude returns structured data
    // For now, we'll keep it simple and just show the conversation
    return null
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-center min-h-screen">
            <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <RetractableSidebar onOpenChange={setIsOpen} />

      <div className={`flex-1 flex flex-col transition-all duration-300 ease-out bg-background h-screen ${isOpen ? "ml-80" : "ml-0"}`}>
        <div className="md:hidden">
          <ComputerUseAgent
            isVisible={agentState.isActive}
            onClose={async () => await stopAgent()}
            task={agentState.currentTask || undefined}
            liveUrl={agentState.liveUrl || undefined}
            isMobile={true}
          />

          <div className="transition-all duration-500">
            <header className="sticky top-0 z-10 flex items-center justify-between py-4 px-4 pl-20 bg-background/95 backdrop-blur-sm border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <h1 className="text-lg font-bold tracking-tight">Ron AI</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCareTeam(!showCareTeam)}
                  className="text-xs font-medium hover:text-primary"
                >
                  Care Team
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (agentState.isActive) {
                      await stopAgent()
                    } else {
                      try {
                        await startAgent("Computer Use Agent Active", undefined)
                      } catch (error) {
                        console.error("Error starting Computer Use Agent:", error)
                      }
                    }
                  }}
                  className={`text-xs font-medium hover:text-primary ${agentState.isActive ? "text-primary" : ""}`}
                >
                  <Monitor className="w-3 h-3 mr-1" />
                  {agentState.isActive ? "Close Browser" : "Open Browser"}
                </Button>
                <ThemeToggle />
              </div>
            </header>

            {showCareTeam && <CareTeamPanel onClose={() => setShowCareTeam(false)} />}

            <main className="flex-1 pb-[300px] px-4 py-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-8 animate-fade-in">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-4">
                      Your Health Advocacy{" "}
                      <span className="text-primary text-glow bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Co-Pilot
                      </span>
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed text-lg sm:text-xl px-4 animate-fade-in-delay">
                      Get clarity and confidence in your healthcare decisions with AI-powered insights and expert
                      recommendations.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {isProcessing && (
                      <AgentStatusIndicator 
                        currentAgent={{ type: "general", name: "Claude Sonnet 4", description: "Processing your request..." }} 
                        status="processing" 
                      />
                    )}

                    {messages.map((msg, i) => (
                      <div key={i} className="animate-slide-up">
                        {msg.role === "assistant" && msg.reasoning && (
                          <ReasoningDisplay 
                            reasoning={msg.reasoning} 
                            tokenCount={msg.reasoningTokens || 0}
                            className="mb-4"
                          />
                        )}
                        <MessageBubble
                          role={msg.role}
                          content={msg.content}
                          timestamp={msg.timestamp}
                        />
                      </div>
                    ))}

                    {renderAgentInterface()}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-2 animate-slide-up-footer z-20">
              <div className="max-w-4xl mx-auto">
                <div className="relative bg-card/95 backdrop-blur-xl rounded-xl p-2 shadow-2xl shadow-primary/5 border border-border">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask about symptoms, treatments, or find a specialist..."
                        className="w-full text-sm resize-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70 min-h-[40px] max-h-[100px] border border-border bg-background py-2"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 hover:bg-primary/10 bg-primary rounded-md"
                      >
                        <Paperclip className="w-4 h-4 text-white" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 hover:bg-primary/10 bg-primary rounded-md"
                      >
                        <Mic className="w-4 h-4 text-white" />
                      </Button>
                      <Button
                        onClick={handleSendMessage}
                        size="icon"
                        className="w-8 h-8 hover:bg-primary/90 text-primary-foreground hover:shadow-primary/25 transition-all duration-200 rounded-md bg-primary shadow-xl"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
                    <div className="flex items-center gap-2 flex-wrap">
                      <PromptBuilderDialog />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (agentState.isActive) {
                            stopAgent()
                          } else {
                            try {
                              await startAgent("Computer Use Agent Active", undefined)
                            } catch (error) {
                              console.error("Error starting Computer Use Agent:", error)
                            }
                          }
                        }}
                        className="text-xs font-medium hover:text-primary transition-colors duration-200"
                      >
                        <Monitor className="w-3 h-3 mr-1" />
                        {agentState.isActive ? "Close Browser" : "Browser"}
                      </Button>
                      <div className="flex items-center gap-2">
                        <BrainCircuit className="w-3 h-3 text-primary" />
                        <label htmlFor="deep-research" className="text-xs font-medium">
                          Deep Research
                        </label>
                        <Switch
                          id="deep-research"
                          checked={isDeepResearch}
                          onCheckedChange={setIsDeepResearch}
                          className="data-[state=checked]:bg-primary scale-75"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <header
            className={`fixed top-0 z-10 flex items-center justify-between py-8 px-6 pl-20 bg-background/80 backdrop-blur-sm border-b border-border transition-all duration-500 ${
              agentState.isActive ? "left-0 right-1/2" : "left-0 right-0"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Ron AI</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCareTeam(!showCareTeam)}
                className="text-sm font-medium hover:text-primary"
              >
                Care Team
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (agentState.isActive) {
                    await stopAgent()
                  } else {
                    try {
                      await startAgent("Computer Use Agent Active", undefined)
                    } catch (error) {
                      console.error("Error starting Computer Use Agent:", error)
                    }
                  }
                }}
                className={`text-sm font-medium hover:text-primary ${agentState.isActive ? "text-primary" : ""}`}
              >
                <Monitor className="w-4 h-4 mr-2" />
                {agentState.isActive ? "Close Browser" : "Open Browser"}
              </Button>
              <ThemeToggle />
            </div>
          </header>

          {showCareTeam && <CareTeamPanel onClose={() => setShowCareTeam(false)} />}

          <main
            className={`flex-1 pb-[400px] pt-32 mx-4 my-[25px] transition-all duration-500 overflow-y-auto ${
              agentState.isActive ? "mr-[50vw]" : ""
            }`}
          >
            <div className="container max-w-7xl mx-auto px-6">
              {messages.length === 0 ? (
                <div className="text-center ml-px mb-0 py-0 animate-fade-in mt-0">
                  <h2 className="leading-tight font-bold tracking-tight mx-2.5 py-0 text-7xl">
                    Your Health Advocacy{" "}
                    <span className="text-primary text-glow bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      Co-Pilot
                    </span>
                  </h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed px-0 text-2xl mt-0 mb-0 py-[19px] animate-fade-in-delay">
                    Get clarity and confidence in your healthcare decisions with AI-powered insights and expert
                    recommendations.
                  </p>
                </div>
              ) : (
                <div className="space-y-12">
                  {isProcessing && (
                    <AgentStatusIndicator 
                      currentAgent={{ type: "general", name: "Claude Sonnet 4", description: "Processing your request..." }} 
                      status="processing" 
                    />
                  )}

                  {messages.map((msg, i) => (
                    <div key={i} className="animate-slide-up">
                      {msg.role === "assistant" && msg.reasoning && (
                        <ReasoningDisplay 
                          reasoning={msg.reasoning} 
                          tokenCount={msg.reasoningTokens || 0}
                          className="mb-6"
                        />
                      )}
                      <MessageBubble
                        role={msg.role}
                        content={msg.content}
                        timestamp={msg.timestamp}
                      />
                    </div>
                  ))}

                  {renderAgentInterface()}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </main>

          <div
            className={`fixed bottom-0 p-6 transition-all duration-300 animate-slide-up-footer z-20 ${
              agentState.isActive ? "left-0 right-1/2" : "left-0 right-0"
            } ${isOpen ? "ml-80" : "ml-0"}`}
          >
            <div className="container max-w-5xl mx-auto">
              <div className="relative backdrop-blur-xl rounded-3xl p-4 shadow-2xl shadow-primary/5 font-sans leading-7 my-[-18px] mx-[-43px] py-[34px] border-border border-2 bg-card">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Ask about symptoms, treatments, or find a specialist..."
                      className="w-full text-lg resize-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70 min-h-[60px] opacity-100 border-solid border border-border bg-background leading-10 text-foreground"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-12 h-12 hover:bg-primary/10 bg-primary rounded-md"
                    >
                      <Paperclip className="w-5 h-5 text-primary-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-12 h-12 hover:bg-primary/10 bg-primary rounded-md"
                    >
                      <Mic className="w-5 h-5 text-primary-foreground" />
                    </Button>
                    <Button
                      onClick={handleSendMessage}
                      size="icon"
                      className="w-12 h-12 hover:bg-primary/90 text-primary-foreground hover:shadow-primary/25 transition-all duration-200 rounded-md bg-primary shadow-xl"
                    >
                      <ArrowUp className="w-5 h-5 text-primary-foreground" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                  <div className="flex items-center gap-6">
                    <PromptBuilderDialog />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (agentState.isActive) {
                          await stopAgent()
                        } else {
                          try {
                            await startAgent("Computer Use Agent Active", undefined)
                          } catch (error) {
                            console.error("Error starting Computer Use Agent:", error)
                          }
                        }
                      }}
                      className="text-sm font-medium hover:text-primary transition-colors duration-200"
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      {agentState.isActive ? "Close Browser" : "Browser"}
                    </Button>
                    <div className="flex items-center gap-3">
                      <BrainCircuit className="w-5 h-5 text-primary" />
                      <label htmlFor="deep-research" className="text-sm font-medium">
                        Deep Research
                      </label>
                      <Switch
                        id="deep-research"
                        checked={isDeepResearch}
                        onCheckedChange={setIsDeepResearch}
                        className="data-[state=checked]:bg-primary shadow-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ComputerUseAgent
            isVisible={agentState.isActive}
            onClose={async () => await stopAgent()}
            task={agentState.currentTask || undefined}
            liveUrl={agentState.liveUrl || undefined}
            isMobile={false}
          />
        </div>
      </div>
    </div>
  )
}
