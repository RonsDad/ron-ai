"use client"

import { useState } from "react"
import type { Agent, AgentStatus, ProviderSearchData, MedicationData, AppointmentData } from "@/lib/types"

interface AgentData {
  providerSearch: ProviderSearchData | null
  medication: MedicationData | null
  appointment: AppointmentData | null
}

export function useAgentRouter() {
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null)
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle")
  const [agentData, setAgentData] = useState<AgentData>({
    providerSearch: null,
    medication: null,
    appointment: null,
  })
  const [isProcessing, setIsProcessing] = useState(false)

  const routeRequest = async (request: string, deepResearch = false) => {
    setIsProcessing(true)
    setAgentStatus("analyzing")

    const agent = determineAgent(request)
    setCurrentAgent(agent)
    setAgentStatus("connecting")

    // Execute agent-specific logic without simulations
    switch (agent.type) {
      case "provider-search":
        setAgentStatus("searching")
        // Real implementation would make API calls here
        break
      case "medication":
        setAgentStatus("processing")
        // Real implementation would process medication data here
        break
      case "appointment":
        setAgentStatus("scheduling")
        // Real implementation would handle appointment scheduling here
        break
      case "general":
        setAgentStatus("researching")
        // Real implementation would handle general queries here
        break
    }

    setAgentStatus("completed")
    setIsProcessing(false)
  }

  const determineAgent = (request: string): Agent => {
    const lowerRequest = request.toLowerCase()

    if (
      (lowerRequest.includes("find") &&
        (lowerRequest.includes("doctor") ||
          lowerRequest.includes("provider") ||
          lowerRequest.includes("specialist") ||
          lowerRequest.includes("physician") ||
          lowerRequest.includes("rheumatologist") ||
          lowerRequest.includes("cardiologist") ||
          lowerRequest.includes("dermatologist"))) ||
      lowerRequest.includes("provider") ||
      lowerRequest.includes("doctor") ||
      lowerRequest.includes("specialist") ||
      lowerRequest.includes("research") ||
      lowerRequest.includes("look up")
    ) {
      return { type: "provider-search", name: "Provider Search Agent", description: "Finding healthcare providers" }
    }

    if (
      lowerRequest.includes("medication") ||
      lowerRequest.includes("prescription") ||
      lowerRequest.includes("drug") ||
      lowerRequest.includes("pill")
    ) {
      return {
        type: "medication",
        name: "Medication Management Agent",
        description: "Managing medications and prescriptions",
      }
    }

    if (lowerRequest.includes("appointment") || lowerRequest.includes("schedule") || lowerRequest.includes("book")) {
      return { type: "appointment", name: "Appointment Scheduling Agent", description: "Scheduling appointments" }
    }

    return { type: "general", name: "General Health Agent", description: "Providing general health information" }
  }

  return {
    currentAgent,
    agentStatus,
    routeRequest,
    agentData,
    isProcessing,
  }
}
