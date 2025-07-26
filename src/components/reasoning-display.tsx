"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Brain } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReasoningDisplayProps {
  reasoning: string
  tokenCount?: number
  className?: string
}

export function ReasoningDisplay({ reasoning, tokenCount, className }: ReasoningDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!reasoning?.trim()) return null

  return (
    <Card className={cn("border-blue-200 bg-gradient-to-r from-blue-600 to-blue-700 shadow-sm", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-white">
            <Brain className="h-4 w-4" />
            <span className="font-medium text-sm">Extended Thinking</span>
            {tokenCount && (
              <span className="text-xs bg-blue-800/50 px-2 py-1 rounded-full">
                {tokenCount} tokens
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:bg-blue-800/30 h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {isExpanded && (
          <div className="space-y-2">
            <div className="h-px bg-blue-400/30 mb-3" />
            <div className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-mono">
              {reasoning}
            </div>
          </div>
        )}
        
        {!isExpanded && (
          <div className="text-white/70 text-xs truncate">
            {reasoning.slice(0, 100)}...
          </div>
        )}
      </CardContent>
    </Card>
  )
}