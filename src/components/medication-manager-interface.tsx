"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Pill, DollarSign, Calendar, Bell, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MedicationForm } from "@/components/medication-form"
import { MedicationInventory } from "@/components/medication-inventory"
import { CostSavingsAnalysis } from "@/components/cost-savings-analysis"
import type { MedicationData, UserProfile } from "@/lib/types"

interface MedicationManagerInterfaceProps {
  data: MedicationData | null
  userProfile: UserProfile
}

export function MedicationManagerInterface({ data, userProfile }: MedicationManagerInterfaceProps) {
  const [showForm, setShowForm] = useState(true)
  const [activeTab, setActiveTab] = useState("inventory")

  if (!data) return null

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-glow">Medication Management</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Hide" : "Show"} Form
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Medication
          </Button>
        </div>
      </div>

      {showForm && <MedicationForm userProfile={userProfile} onSubmit={() => setShowForm(false)} />}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inventory">
            <Pill className="w-4 h-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="savings">
            <DollarSign className="w-4 h-4 mr-2" />
            Cost Savings
          </TabsTrigger>
          <TabsTrigger value="reminders">
            <Bell className="w-4 h-4 mr-2" />
            Reminders
          </TabsTrigger>
          <TabsTrigger value="refills">
            <Calendar className="w-4 h-4 mr-2" />
            Refills
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <MedicationInventory medications={data.currentMedications} />
        </TabsContent>

        <TabsContent value="savings">
          <CostSavingsAnalysis medications={data.currentMedications} />
        </TabsContent>

        <TabsContent value="reminders">
          <div className="space-y-4">
            {data.reminders.map((reminder) => (
              <Card key={reminder.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{reminder.message}</h4>
                      <p className="text-sm text-muted-foreground">Due: {reminder.time.toLocaleString()}</p>
                    </div>
                    <Button size="sm">Mark Taken</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="refills">
          <div className="space-y-4">
            {data.currentMedications
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
      </Tabs>
    </motion.div>
  )
}
