"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Pill } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { UserProfile } from "@/lib/types"

interface MedicationFormProps {
  userProfile: UserProfile
  onSubmit: () => void
}

export function MedicationForm({ userProfile, onSubmit }: MedicationFormProps) {
  const [formData, setFormData] = useState({
    medicationName: "",
    dosage: "",
    frequency: "",
    prescribingDoctor: "",
    pharmacy: userProfile.preferredPharmacy?.name || "",
    insuranceInfo: userProfile.insurance || "",
    currentCost: "",
    refillDate: "",
    concerns: "",
  })

  const handleSubmit = () => {
    console.log("Medication form submitted:", formData)
    onSubmit()
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Pill className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Medication Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="medication-name" className="text-sm font-medium">
                Medication Name
              </Label>
              <Input
                id="medication-name"
                value={formData.medicationName}
                onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
                placeholder="e.g., Lisinopril"
                className="h-10 sm:h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dosage" className="text-sm font-medium">
                Dosage
              </Label>
              <Input
                id="dosage"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g., 10mg"
                className="h-10 sm:h-12"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency" className="text-sm font-medium">
                Frequency
              </Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger className="h-10 sm:h-12">
                  <SelectValue placeholder="How often?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once-daily">Once daily</SelectItem>
                  <SelectItem value="twice-daily">Twice daily</SelectItem>
                  <SelectItem value="three-times-daily">Three times daily</SelectItem>
                  <SelectItem value="as-needed">As needed</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prescribing-doctor" className="text-sm font-medium">
                Prescribing Doctor
              </Label>
              <Input
                id="prescribing-doctor"
                value={formData.prescribingDoctor}
                onChange={(e) => setFormData({ ...formData, prescribingDoctor: e.target.value })}
                placeholder="Dr. Smith"
                className="h-10 sm:h-12"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="pharmacy" className="text-sm font-medium">
                Preferred Pharmacy
              </Label>
              <Input
                id="pharmacy"
                value={formData.pharmacy}
                onChange={(e) => setFormData({ ...formData, pharmacy: e.target.value })}
                placeholder="CVS, Walgreens, etc."
                className="h-10 sm:h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-cost" className="text-sm font-medium">
                Current Monthly Cost
              </Label>
              <Input
                id="current-cost"
                type="number"
                value={formData.currentCost}
                onChange={(e) => setFormData({ ...formData, currentCost: e.target.value })}
                placeholder="45.99"
                className="h-10 sm:h-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="concerns" className="text-sm font-medium">
              Concerns or Questions
            </Label>
            <Textarea
              id="concerns"
              value={formData.concerns}
              onChange={(e) => setFormData({ ...formData, concerns: e.target.value })}
              placeholder="Any side effects, cost concerns, or questions about this medication..."
              className="min-h-[80px] sm:min-h-[100px] resize-none"
            />
          </div>

          <Button onClick={handleSubmit} className="w-full bg-primary hover:bg-primary/90 h-10 sm:h-12">
            <Pill className="w-4 h-4 mr-2" />
            Analyze Medication
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
