"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, Filter, MapPin, Star, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { ProviderSearchResult } from "@/lib/types"

interface ProviderResultsViewProps {
  results: ProviderSearchResult[]
  onCompare: (providers: ProviderSearchResult[]) => void
  onViewDetails: (provider: ProviderSearchResult) => void
}

export function ProviderResultsView({ results, onCompare, onViewDetails }: ProviderResultsViewProps) {
  const [selectedProviders, setSelectedProviders] = useState<ProviderSearchResult[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const filteredResults = results.filter(
    (provider) =>
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.specialty.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const toggleProviderSelection = (provider: ProviderSearchResult) => {
    setSelectedProviders((prev) => {
      const isSelected = prev.some((p) => p.id === provider.id)
      if (isSelected) {
        return prev.filter((p) => p.id !== provider.id)
      } else if (prev.length < 3) {
        return [...prev, provider]
      }
      return prev
    })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Provider Search Results</h2>
          <p className="text-muted-foreground">Found {results.length} providers matching your criteria</p>
        </div>
        {selectedProviders.length > 1 && (
          <Button onClick={() => onCompare(selectedProviders)}>Compare Selected ({selectedProviders.length})</Button>
        )}
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search providers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      <div className="grid gap-6">
        {filteredResults.map((provider, index) => (
          <motion.div
            key={provider.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`cursor-pointer transition-all ${
                selectedProviders.some((p) => p.id === provider.id)
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {provider.imageUrl ? (
                        <img
                          src={provider.imageUrl || "/placeholder.svg"}
                          alt={provider.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-primary">
                          {provider.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{provider.name}</CardTitle>
                      <p className="text-muted-foreground">{provider.specialty}</p>
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
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleProviderSelection(provider)}>
                      {selectedProviders.some((p) => p.id === provider.id) ? "Deselect" : "Select"}
                    </Button>
                    <Button size="sm" onClick={() => onViewDetails(provider)}>
                      View Details
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{provider.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{provider.availability}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {provider.insurance.slice(0, 3).map((insurance) => (
                      <Badge key={insurance} variant="secondary" className="text-xs">
                        {insurance}
                      </Badge>
                    ))}
                    {provider.insurance.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{provider.insurance.length - 3} more
                      </Badge>
                    )}
                  </div>
                  {provider.aiSummary && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{provider.aiSummary}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
