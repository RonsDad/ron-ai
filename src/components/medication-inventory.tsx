"use client"

import { motion } from "framer-motion"
import { Pill, Clock, Scan, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Medication } from "@/lib/types"

interface MedicationInventoryProps {
  medications: Medication[]
}

export function MedicationInventory({ medications }: MedicationInventoryProps) {
  const handleScanMedication = (medicationId: string) => {
    console.log("Opening camera for medication scan:", medicationId)
    // Implement camera scanning logic
  }

  const handleLogIntake = (medicationId: string) => {
    console.log("Logging medication intake:", medicationId)
    // Implement intake logging
  }

  return (
    <div className="space-y-4">
      {medications.map((medication, index) => (
        <motion.div
          key={medication.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={`${medication.needsRefill ? "border-orange-500/50" : ""}`}>
            <CardHeader className="flex flex-row items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Pill className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{medication.name}</CardTitle>
                <p className="text-muted-foreground">{medication.dosage}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Next due: {medication.nextDue.toLocaleTimeString()}</span>
                  </div>
                  <Badge variant={medication.needsRefill ? "destructive" : "secondary"}>
                    {medication.refillsRemaining} refills remaining
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              {/* Refill Warning */}
              {medication.needsRefill && (
                <Alert className="mb-4 border-orange-500/50 bg-orange-500/5">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-700 dark:text-orange-400">
                    Refill needed - Contact your pharmacy or prescriber
                  </AlertDescription>
                </Alert>
              )}

              {/* Cost Saving Alert */}
              {medication.costSavingOpportunity && (
                <Alert className="mb-4 border-green-500/50 bg-green-500/5">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    Save ${medication.costSavingOpportunity.potentialSavings} -{" "}
                    {medication.costSavingOpportunity.suggestion}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleScanMedication(medication.id)}
                  className="hover:border-primary hover:text-primary"
                >
                  <Scan className="w-4 h-4 mr-1" />
                  Scan Label
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleLogIntake(medication.id)}
                  className="bg-primary hover:bg-primary/90"
                >
                  Log Intake
                </Button>
                {medication.needsRefill && (
                  <Button variant="outline" size="sm" className="text-orange-600 border-orange-500/50 bg-transparent">
                    Request Refill
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
