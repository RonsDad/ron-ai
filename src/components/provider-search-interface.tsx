"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AIPromptBuilder } from "@/components/ai-prompt-builder"
import { ProviderResultsView } from "@/components/provider-results-view"
import { ProviderComparisonView } from "@/components/provider-comparison-view"
import { DeepResearchView } from "@/components/deep-research-view"
import { AIRecommendationReport } from "@/components/ai-recommendation-report"
import { ProviderDetailView } from "@/components/provider-detail-view"
import type { ProviderSearchData, UserProfile, ProviderSearchResult } from "@/lib/types"

interface ProviderSearchInterfaceProps {
  data: ProviderSearchData | null
  userProfile: UserProfile
}

type ViewState = "prompt-builder" | "results" | "comparison" | "deep-research" | "report" | "detail"

export function ProviderSearchInterface({ data, userProfile }: ProviderSearchInterfaceProps) {
  const [viewState, setViewState] = useState<ViewState>(data ? "results" : "prompt-builder")
  const [selectedProviders, setSelectedProviders] = useState<ProviderSearchResult[]>([])
  const [detailedProvider, setDetailedProvider] = useState<ProviderSearchResult | null>(null)
  const [generatedPrompt, setGeneratedPrompt] = useState("")

  const handlePromptGenerated = (prompt: string) => {
    setGeneratedPrompt(prompt)
    setViewState("results")
  }

  const handleStartComparison = (providers: ProviderSearchResult[]) => {
    setSelectedProviders(providers)
    setViewState("comparison")
  }

  const handleStartDeepResearch = () => {
    setViewState("deep-research")
    setTimeout(() => setViewState("report"), 8000)
  }

  const handleViewDetails = (provider: ProviderSearchResult) => {
    setDetailedProvider(provider)
    setViewState("detail")
  }

  const handleBackToResults = () => {
    setDetailedProvider(null)
    setViewState("results")
  }

  const renderCurrentView = () => {
    switch (viewState) {
      case "prompt-builder":
        return <AIPromptBuilder userProfile={userProfile} onPromptGenerated={handlePromptGenerated} />
      case "results":
        return (
          <ProviderResultsView
            results={data?.results || []}
            onCompare={handleStartComparison}
            onViewDetails={handleViewDetails}
          />
        )
      case "comparison":
        return (
          <ProviderComparisonView
            providers={selectedProviders}
            onStartDeepResearch={handleStartDeepResearch}
            onViewDetails={handleViewDetails}
          />
        )
      case "deep-research":
        return <DeepResearchView providers={selectedProviders} />
      case "report":
        return <AIRecommendationReport providers={selectedProviders} onViewDetails={handleViewDetails} />
      case "detail":
        return detailedProvider ? <ProviderDetailView provider={detailedProvider} onBack={handleBackToResults} /> : null
      default:
        return null
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <AnimatePresence mode="wait">{renderCurrentView()}</AnimatePresence>
    </motion.div>
  )
}
