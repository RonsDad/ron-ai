"use client"

import { motion } from "framer-motion"
import { Search, Stethoscope, Calendar, Brain } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { Agent, AgentStatus } from "@/lib/types"

interface AgentStatusIndicatorProps {
  currentAgent: Agent | null
  status: AgentStatus
}

export function AgentStatusIndicator({ currentAgent, status }: AgentStatusIndicatorProps) {
  if (!currentAgent) return null

  const getAgentIcon = () => {
    switch (currentAgent.type) {
      case "provider-search":
        return Search
      case "medication":
        return Stethoscope
      case "appointment":
        return Calendar
      default:
        return Brain
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case "analyzing":
        return "Analyzing your request..."
      case "connecting":
        return `Connecting to ${currentAgent.name}...`
      case "searching":
        return "Searching for providers..."
      case "processing":
        return "Processing medication information..."
      case "scheduling":
        return "Checking appointment availability..."
      case "researching":
        return "Researching health information..."
      case "completed":
        return "Task completed successfully"
      default:
        return "Ready to assist"
    }
  }

  const AgentIcon = getAgentIcon()

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <AgentIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{currentAgent.name}</h4>
              <p className="text-xs text-muted-foreground">{getStatusMessage()}</p>
            </div>
            {status !== "completed" && (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
