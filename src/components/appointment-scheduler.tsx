"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Calendar, Phone, MessageCircle, CheckCircle, ArrowLeft, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { ProviderSearchResult } from "@/lib/types"

interface AppointmentSchedulerProps {
  provider: ProviderSearchResult
  onBack: () => void
  onComplete: () => void
}

type SchedulingStep = "select-type" | "choose-time" | "patient-info" | "confirmation" | "booking"

export function AppointmentScheduler({ provider, onBack, onComplete }: AppointmentSchedulerProps) {
  const [currentStep, setCurrentStep] = useState<SchedulingStep>("select-type")
  const [appointmentType, setAppointmentType] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [reason, setReason] = useState("")
  const [isUrgent, setIsUrgent] = useState(false)
  const [bookingMethod, setBookingMethod] = useState<"ai" | "manual">("ai")

  const appointmentTypes = [
    { value: "new-patient", label: "New Patient Consultation", duration: "60 min", price: "$350" },
    { value: "follow-up", label: "Follow-up Visit", duration: "30 min", price: "$200" },
    { value: "procedure", label: "Procedure/Injection", duration: "45 min", price: "$450" },
    { value: "telehealth", label: "Telehealth Consultation", duration: "30 min", price: "$180" },
  ]

  const availableSlots = [
    { date: "2024-01-15", day: "Monday", slots: ["9:00 AM", "11:30 AM", "2:00 PM", "4:30 PM"] },
    { date: "2024-01-16", day: "Tuesday", slots: ["10:00 AM", "1:00 PM", "3:30 PM"] },
    { date: "2024-01-17", day: "Wednesday", slots: ["9:30 AM", "2:30 PM", "4:00 PM"] },
    { date: "2024-01-18", day: "Thursday", slots: ["8:30 AM", "11:00 AM", "3:00 PM"] },
    { date: "2024-01-19", day: "Friday", slots: ["9:00 AM", "1:30 PM"] },
  ]

  const handleNext = () => {
    switch (currentStep) {
      case "select-type":
        setCurrentStep("choose-time")
        break
      case "choose-time":
        setCurrentStep("patient-info")
        break
      case "patient-info":
        setCurrentStep("confirmation")
        break
      case "confirmation":
        setCurrentStep("booking")
        setTimeout(() => {
          onComplete()
        }, 3000)
        break
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case "select-type":
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Select Appointment Type</h3>
            <div className="grid gap-4">
              {appointmentTypes.map((type) => (
                <Card
                  key={type.value}
                  className={`cursor-pointer transition-all ${
                    appointmentType === type.value ? "border-primary bg-primary/5" : "hover:border-primary/50"
                  }`}
                  onClick={() => setAppointmentType(type.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">{type.label}</h4>
                        <p className="text-sm text-muted-foreground">{type.duration}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{type.price}</p>
                        <Badge variant="secondary" className="text-xs">
                          Insurance may cover
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )

      case "choose-time":
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Choose Date & Time</h3>
            <div className="grid gap-4">
              {availableSlots.map((slot) => (
                <Card key={slot.date} className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="font-semibold">{slot.day}</h4>
                      <p className="text-sm text-muted-foreground">{new Date(slot.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {slot.slots.map((time) => (
                      <Button
                        key={time}
                        variant={selectedDate === slot.date && selectedTime === time ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedDate(slot.date)
                          setSelectedTime(time)
                        }}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )

      case "patient-info":
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Appointment Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Reason for visit</label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please describe your symptoms or reason for the appointment..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="urgent"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="urgent" className="text-sm">
                  This is urgent - I need to be seen ASAP
                </label>
              </div>
            </div>
          </div>
        )

      case "confirmation":
        const selectedAppointment = appointmentTypes.find((t) => t.value === appointmentType)
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold">Confirm Appointment</h3>
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Provider:</span>
                  <span className="font-semibold">{provider.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-semibold">{selectedAppointment?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date & Time:</span>
                  <span className="font-semibold">
                    {new Date(selectedDate).toLocaleDateString()} at {selectedTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-semibold">{selectedAppointment?.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Cost:</span>
                  <span className="font-semibold">{selectedAppointment?.price}</span>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <h4 className="font-semibold">How would you like Ron to book this?</h4>
              <div className="grid gap-3">
                <Card
                  className={`cursor-pointer p-4 ${bookingMethod === "ai" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => setBookingMethod("ai")}
                >
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary" />
                    <div>
                      <h5 className="font-semibold">AI Voice Booking (Recommended)</h5>
                      <p className="text-sm text-muted-foreground">Ron will call the office and book automatically</p>
                    </div>
                  </div>
                </Card>
                <Card
                  className={`cursor-pointer p-4 ${bookingMethod === "manual" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => setBookingMethod("manual")}
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    <div>
                      <h5 className="font-semibold">Manual Booking</h5>
                      <p className="text-sm text-muted-foreground">Ron will provide you with contact details</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )

      case "booking":
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Phone className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Ron is Booking Your Appointment</h3>
              <p className="text-muted-foreground">
                {bookingMethod === "ai"
                  ? "Ron is calling the office now to secure your appointment..."
                  : "Preparing your booking information..."}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Verified insurance coverage</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Confirmed appointment availability</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Booking appointment...</span>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/95 backdrop-blur-2xl border border-border/30 rounded-3xl shadow-2xl shadow-primary/5 overflow-hidden max-w-4xl mx-auto"
    >
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={onBack} className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-semibold">Schedule with {provider.name}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-muted/50">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            {["select-type", "choose-time", "patient-info", "confirmation", "booking"].map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep === step
                      ? "bg-primary text-white"
                      : index <
                          ["select-type", "choose-time", "patient-info", "confirmation", "booking"].indexOf(currentStep)
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                {index < 4 && <div className="w-8 h-0.5 bg-muted mx-2" />}
              </div>
            ))}
          </div>
        </div>

        {renderStepContent()}

        {currentStep !== "booking" && (
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => {
                const steps: SchedulingStep[] = [
                  "select-type",
                  "choose-time",
                  "patient-info",
                  "confirmation",
                  "booking",
                ]
                const currentIndex = steps.indexOf(currentStep)
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1])
                }
              }}
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              className="bg-primary hover:bg-primary/90"
            >
              {currentStep === "confirmation" ? "Book Appointment" : "Next"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
