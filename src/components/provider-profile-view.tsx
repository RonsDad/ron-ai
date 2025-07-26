"use client"

import { motion } from "framer-motion"
import { Star, MapPin, Phone, Globe, Calendar, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Provider {
  id: string
  name: string
  specialty: string
  rating: number
  reviews: number
  location: string
  distance: string
  availability: string
  insurance: string[]
  imageUrl?: string
  aiSummary?: string
  phone?: string
  website?: string
  specialties?: string[]
}

interface ProviderProfileViewProps {
  provider: Provider
  onSchedule: () => void
  onContact: () => void
}

export function ProviderProfileView({ provider, onSchedule, onContact }: ProviderProfileViewProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {provider.imageUrl ? (
                <img
                  src={provider.imageUrl || "/placeholder.svg"}
                  alt={provider.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {provider.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">{provider.name}</CardTitle>
              <p className="text-lg text-muted-foreground">{provider.specialty}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{provider.rating}</span>
                  <span className="text-sm text-muted-foreground">({provider.reviews} reviews)</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{provider.distance}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={onSchedule} className="flex-1">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
            <Button variant="outline" onClick={onContact}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact
            </Button>
          </div>
        </CardContent>
      </Card>

      {provider.aiSummary && (
        <Card>
          <CardHeader>
            <CardTitle>AI Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{provider.aiSummary}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{provider.location}</span>
          </div>
          {provider.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{provider.phone}</span>
            </div>
          )}
          {provider.website && (
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{provider.website}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {provider.specialties && (
        <Card>
          <CardHeader>
            <CardTitle>Specialties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {provider.specialties.map((specialty) => (
                <Badge key={specialty} variant="secondary">
                  {specialty}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Insurance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {provider.insurance.map((insurance) => (
              <Badge key={insurance} variant="outline">
                {insurance}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
