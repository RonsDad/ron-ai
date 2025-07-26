"use client"

import { useState } from "react"
import { Pill, Plus, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  nextDose: Date
  refillsRemaining: number
  needsRefill: boolean
}

const sampleMedications: Medication[] = [
  {
    id: "1",
    name: "Lisinopril",
    dosage: "10mg",
    frequency: "Once daily",
    nextDose: new Date(Date.now() + 2 * 60 * 60 * 1000),
    refillsRemaining: 3,
    needsRefill: false,
  },
  {
    id: "2",
    name: "Metformin",
    dosage: "500mg",
    frequency: "Twice daily",
    nextDose: new Date(Date.now() + 30 * 60 * 1000),
    refillsRemaining: 0,
    needsRefill: true,
  },
]

export function MedicationManager() {
  const [medications] = useState<Medication[]>(sampleMedications)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Medication Management</h2>
          <p className="text-muted-foreground">Track your medications and manage refills</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Medication
        </Button>
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current">Current</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="refills">Refills</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {medications.map((medication) => (
            <Card key={medication.id} className={medication.needsRefill ? "border-orange-500/50" : ""}>
              <CardHeader className="flex flex-row items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Pill className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{medication.name}</CardTitle>
                  <p className="text-muted-foreground">
                    {medication.dosage} - {medication.frequency}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Next: {medication.nextDose.toLocaleTimeString()}</span>
                    </div>
                    <Badge variant={medication.needsRefill ? "destructive" : "secondary"}>
                      {medication.refillsRemaining} refills left
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              {medication.needsRefill && (
                <CardContent className="px-6 pb-6">
                  <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-orange-700 dark:text-orange-400">
                      Refill needed - Contact your pharmacy
                    </span>
                    <Button size="sm" variant="outline" className="ml-auto bg-transparent">
                      Request Refill
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reminders">
          <div className="text-center py-8">
            <p className="text-muted-foreground">No upcoming medication reminders</p>
          </div>
        </TabsContent>

        <TabsContent value="refills">
          <div className="space-y-4">
            {medications
              .filter((med) => med.needsRefill || med.refillsRemaining <= 1)
              .map((medication) => (
                <Card key={medication.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{medication.name}</h4>
                        <p className="text-sm text-muted-foreground">{medication.refillsRemaining} refills remaining</p>
                      </div>
                      <Button size="sm">Request Refill</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Medication history will appear here</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
