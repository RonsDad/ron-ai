"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Pill,
  Users,
  Shield,
  Brain,
  ChevronRight,
  Plus,
  Stethoscope,
  Building2,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  Home,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { UserProfile } from "@/lib/types"

interface AIPromptBuilderProps {
  userProfile: UserProfile
  onPromptGenerated: (prompt: string) => void
}

interface MacroItem {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: string
  prompt?: string
  children?: MacroItem[]
}

export function AIPromptBuilder({ userProfile, onPromptGenerated }: AIPromptBuilderProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)

  // Simplified macro items - max 2 levels deep
  const macroItems: MacroItem[] = [
    {
      id: "find-provider",
      label: "Find a Provider",
      icon: Search,
      children: [
        {
          id: "primary-care",
          label: "Primary Care",
          icon: Stethoscope,
          prompt: `I need to find a primary care provider. I have ${userProfile.insurance} insurance and I'm located in ${userProfile.address}.`,
        },
        {
          id: "specialist",
          label: "Specialist",
          prompt: `I need to find a specialist. I have ${userProfile.insurance} insurance and I'm located in ${userProfile.address}.`,
        },
        {
          id: "urgent-care",
          label: "Urgent Care",
          icon: Building2,
          prompt: `I need to find urgent care facilities near ${userProfile.address}. I have ${userProfile.insurance} insurance.`,
        },
      ],
    },
    {
      id: "medication",
      label: "Medication Help",
      icon: Pill,
      children: [
        {
          id: "cost-savings",
          label: "Cost Savings",
          icon: DollarSign,
          prompt: `I need help reducing medication costs. My current medications are: ${userProfile.medications?.join(", ") || "Lisinopril 10mg, Metformin 500mg"}.`,
        },
        {
          id: "refills",
          label: "Refills",
          icon: RefreshCw,
          prompt: `I need to check refill status for my medications: ${userProfile.medications?.join(", ") || "Lisinopril 10mg, Metformin 500mg"}.`,
        },
        {
          id: "side-effects",
          label: "Side Effects",
          icon: AlertTriangle,
          prompt: "I'm experiencing side effects from my medication and need guidance.",
        },
      ],
    },
    {
      id: "care-team",
      label: "My Care Team",
      icon: Users,
      children: [
        {
          id: "contact-provider",
          label: "Contact Provider",
          prompt: "I need to contact or schedule with one of my care team providers.",
        },
        {
          id: "add-provider",
          label: "Add Provider",
          icon: Plus,
          prompt: "I want to add a new provider to my care team.",
        },
      ],
    },
    {
      id: "benefits",
      label: "Insurance & Benefits",
      icon: Shield,
      children: [
        {
          id: "coverage",
          label: "Coverage Questions",
          prompt: "I have a question about what's covered under my insurance plan.",
        },
        {
          id: "claims",
          label: "Claims & Appeals",
          prompt: "I need help with an insurance claim or want to check claim status.",
        },
        {
          id: "prior-auth",
          label: "Prior Authorization",
          prompt: "I need help with prior authorization for a treatment or medication.",
        },
      ],
    },
    {
      id: "research",
      label: "Deep Research",
      icon: Brain,
      children: [
        {
          id: "general",
          label: "General Health Question",
          prompt: "I have a general health question that needs research.",
        },
        {
          id: "condition",
          label: "My Conditions",
          prompt: `I have a question about ${userProfile.conditions?.join(" or ") || "my health conditions"} and need detailed research.`,
        },
        {
          id: "treatments",
          label: "Treatment Options",
          prompt: "I want to research alternative or additional treatment options.",
        },
      ],
    },
  ]

  const handleItemClick = (item: MacroItem) => {
    if (item.children) {
      setSelectedCategory(item.id)
    } else if (item.prompt) {
      onPromptGenerated(item.prompt)
      setIsVisible(false)
    }
  }

  const handleBack = () => {
    setSelectedCategory(null)
  }

  const getCurrentItems = () => {
    if (!selectedCategory) return macroItems
    const category = macroItems.find(item => item.id === selectedCategory)
    return category?.children || []
  }

  const currentItems = getCurrentItems()
  const isRootLevel = !selectedCategory

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-2xl mx-auto"
        >
          <Card className="bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {!isRootLevel && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="w-8 h-8 hover:bg-primary/10"
                  >
                    <Home className="w-4 h-4" />
                  </Button>
                )}
                <h3 className="text-lg font-semibold">
                  {isRootLevel ? "What can I help you with?" : macroItems.find(i => i.id === selectedCategory)?.label}
                </h3>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-0">
              <motion.div
                key={selectedCategory || "root"}
                initial={{ opacity: 0, x: isRootLevel ? 0 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRootLevel ? 0 : -20 }}
                transition={{ duration: 0.15 }}
                className="grid gap-2"
              >
                {currentItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-4 px-4 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-200 group"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {item.icon && (
                        <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      )}
                      <div className="flex-1 text-left">
                        <span className="font-medium block">{item.label}</span>
                        {item.prompt && (
                          <span className="text-xs text-muted-foreground mt-1 block">
                            Click to use this prompt
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                        {item.children && (
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </motion.div>

              <div className="mt-4 pt-3 border-t border-border/30">
                <p className="text-xs text-muted-foreground text-center">
                  {isRootLevel 
                    ? "Select a category to see more options" 
                    : "Choose an option or go back to categories"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 