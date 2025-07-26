"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Star, MapPin, Calendar, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ProviderSearchResult } from "@/lib/types"

interface ProviderComparisonViewProps {
  providers: ProviderSearchResult[]
  onStartDeepResearch: () => void
  onViewDetails: (provider: ProviderSearchResult) => void
}

export function ProviderComparisonView({ providers, onStartDeepResearch, onViewDetails }: ProviderComparisonViewProps) {
  const [selectedProviders, setSelectedProviders] = useState<ProviderSearchResult[]>(providers.slice(0, 3))

  const removeProvider = (providerId: string) => {
    setSelectedProviders((prev) => prev.filter((p) => p.id !== providerId))
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Provider Comparison</h2>
          <p className="text-muted-foreground">Compare selected providers side by side</p>
        </div>
        <Button onClick={onStartDeepResearch} className="bg-primary hover:bg-primary/90">
          Start Deep Research
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {selectedProviders.map((provider, index) => (
          <motion.div
            key={provider.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {provider.imageUrl ? (
                        <img
                          src={provider.imageUrl || "/placeholder.svg"}
                          alt={provider.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold text-primary">
                          {provider.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeProvider(provider.id)} className="h-8 w-8">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{provider.rating}</span>
                  <span className="text-sm text-muted-foreground">({provider.reviews} reviews)</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{provider.distance}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{provider.availability}</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Insurance Accepted:</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.insurance.slice(0, 2).map((insurance) => (
                      <Badge key={insurance} variant="secondary" className="text-xs">
                        {insurance}
                      </Badge>
                    ))}
                    {provider.insurance.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{provider.insurance.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>

                <Button variant="outline" onClick={() => onViewDetails(provider)} className="w-full">
                  View Details
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {selectedProviders.length < 2 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            You need at least 2 providers to run a comparison. Please add more providers.
          </p>
        </div>
      )}
    </motion.div>
  )
}
