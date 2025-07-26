"use client"

import { useState } from "react"
import { MapPin, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Provider {
  id: string
  name: string
  specialty: string
  address: string
  coordinates: {
    lat: number
    lng: number
  }
  distance: string
  rating: number
}

interface ProviderMapProps {
  providers: Provider[]
  onProviderSelect: (provider: Provider) => void
}

export function ProviderMap({ providers, onProviderSelect }: ProviderMapProps) {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)

  return (
    <div className="space-y-4">
      <div className="bg-muted/20 rounded-lg p-8 text-center">
        <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Interactive Map</h3>
        <p className="text-muted-foreground">
          Map integration would be implemented here with your preferred mapping service
        </p>
      </div>

      <div className="grid gap-4">
        {providers.map((provider) => (
          <Card
            key={provider.id}
            className={`cursor-pointer transition-all ${
              selectedProvider?.id === provider.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
            }`}
            onClick={() => {
              setSelectedProvider(provider)
              onProviderSelect(provider)
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{provider.name}</h4>
                  <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                  <p className="text-xs text-muted-foreground mt-1">{provider.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{provider.distance}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs">★</span>
                    <span className="text-xs">{provider.rating}</span>
                  </div>
                  <Button size="sm" variant="outline" className="mt-2 bg-transparent">
                    <Navigation className="w-3 h-3 mr-1" />
                    Directions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
