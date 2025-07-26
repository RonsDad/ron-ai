"use client"

import { motion } from "framer-motion"
import { Brain, Search, FileText, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { ProviderSearchResult } from "@/lib/types"

interface DeepResearchViewProps {
  providers: ProviderSearchResult[]
}

export function DeepResearchView({ providers }: DeepResearchViewProps) {
  const researchSteps = [
    { icon: Search, label: "Analyzing provider credentials", completed: true },
    { icon: FileText, label: "Reviewing patient feedback", completed: true },
    { icon: Brain, label: "Cross-referencing specialties", completed: true },
    { icon: CheckCircle, label: "Generating recommendations", completed: false },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Deep Research in Progress</h2>
        <p className="text-muted-foreground">Our AI is conducting comprehensive analysis of your selected providers</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Research Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Progress value={75} className="w-full" />

          <div className="space-y-4">
            {researchSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.2 }}
                className="flex items-center gap-3"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.completed ? "bg-green-500/20 text-green-600" : "bg-primary/20 text-primary"
                  }`}
                >
                  <step.icon className="w-4 h-4" />
                </div>
                <span className={step.completed ? "text-green-600" : "text-foreground"}>{step.label}</span>
                {step.completed && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
              </motion.div>
            ))}
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Analyzing Providers:</h4>
            <div className="space-y-1">
              {providers.map((provider) => (
                <div key={provider.id} className="text-sm text-muted-foreground">
                  • {provider.name} - {provider.specialty}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
