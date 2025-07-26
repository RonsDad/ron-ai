"use client"

import { useState } from "react"
import { Search, Filter, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProviderCard } from "@/components/provider-card"
import type { Provider } from "@/lib/types"

interface ProviderSearchResultsProps {
  providers: Provider[]
}

export function ProviderSearchResults({ providers }: ProviderSearchResultsProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])

  const filteredProviders = providers.filter(
    (provider) =>
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.specialty.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const toggleProviderSelection = (providerId: string) => {
    setSelectedProviders((prev) => {
      if (prev.includes(providerId)) {
        return prev.filter((id) => id !== providerId)
      } else {
        return [...prev, providerId]
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Healthcare Providers</h2>
          <p className="text-muted-foreground">Found {filteredProviders.length} providers in your area</p>
        </div>
        {selectedProviders.length > 0 && <Button>Compare Selected ({selectedProviders.length})</Button>}
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
        <Button variant="outline">
          <MapPin className="w-4 h-4 mr-2" />
          Map View
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProviders.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onSelect={() => toggleProviderSelection(provider.id)}
            onViewDetails={() => console.log("View details for", provider.name)}
          />
        ))}
      </div>

      {filteredProviders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No providers found matching your search criteria.</p>
        </div>
      )}
    </div>
  )
}
