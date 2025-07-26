"use client"

import { motion } from "framer-motion"
import { DollarSign, TrendingDown, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Medication } from "@/lib/types"

interface CostSavingsAnalysisProps {
  medications: Medication[]
}

export function CostSavingsAnalysis({ medications }: CostSavingsAnalysisProps) {
  const medicationsWithSavings = medications.filter((med) => med.costSavingOpportunity)
  const totalPotentialSavings = medicationsWithSavings.reduce(
    (sum, med) => sum + (med.costSavingOpportunity?.potentialSavings || 0),
    0,
  )

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <TrendingDown className="w-5 h-5" />
            Potential Monthly Savings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-700 dark:text-green-400">
            ${totalPotentialSavings.toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Found {medicationsWithSavings.length} cost-saving opportunities
          </p>
        </CardContent>
      </Card>

      {/* Individual Savings Opportunities */}
      <div className="space-y-4">
        {medicationsWithSavings.map((medication, index) => (
          <motion.div
            key={medication.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{medication.name}</CardTitle>
                  <p className="text-muted-foreground">{medication.costSavingOpportunity?.suggestion}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    ${medication.costSavingOpportunity?.potentialSavings.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">monthly savings</p>
                </div>
              </CardHeader>

              <CardContent className="px-6 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Cost</p>
                      <p className="font-semibold">${medication.costSavingOpportunity?.currentCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">New Cost</p>
                      <p className="font-semibold text-green-600">
                        $
                        {(
                          (medication.costSavingOpportunity?.currentCost || 0) -
                          (medication.costSavingOpportunity?.potentialSavings || 0)
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Learn More
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      Apply Savings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* No Savings Available */}
      {medicationsWithSavings.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Great News!</h3>
            <p className="text-muted-foreground">
              Your current medications are already cost-optimized. We'll continue monitoring for new savings
              opportunities.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
