"use client"

import { Star, MapPin, Phone, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Provider } from "@/lib/types"

interface ProviderCardProps {
  provider: Provider
  onSelect?: () => void
  onViewDetails?: () => void
}

export function ProviderCard({ provider, onSelect, onViewDetails }: ProviderCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{provider.name}</CardTitle>
            <p className="text-muted-foreground">{provider.specialty}</p>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{provider.rating}</span>
            <span className="text-sm text-muted-foreground">({provider.reviews})</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{provider.address}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span>{provider.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{provider.distance} miles away</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {provider.specialties.slice(0, 2).map((specialty) => (
            <Badge key={specialty} variant="secondary" className="text-xs">
              {specialty}
            </Badge>
          ))}
          {provider.specialties.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{provider.specialties.length - 2} more
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Badge variant={provider.acceptingNewPatients ? "default" : "secondary"}>
            {provider.acceptingNewPatients ? "Accepting Patients" : "Not Accepting"}
          </Badge>
        </div>

        <div className="flex gap-2">
          {onSelect && (
            <Button variant="outline" onClick={onSelect} className="flex-1 bg-transparent">
              Select
            </Button>
          )}
          {onViewDetails && (
            <Button onClick={onViewDetails} className="flex-1">
              <Calendar className="w-4 h-4 mr-2" />
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
