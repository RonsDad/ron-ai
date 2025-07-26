"use client"
import { Star, MapPin, Calendar, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { ProviderSearchResult } from "@/lib/types"

interface ProviderDetailsSheetProps {
  provider: ProviderSearchResult | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSchedule: () => void
}

export function ProviderDetailsSheet({ provider, open, onOpenChange, onSchedule }: ProviderDetailsSheetProps) {
  if (!provider) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
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
              <h2 className="text-xl font-bold">{provider.name}</h2>
              <p className="text-muted-foreground">{provider.specialty}</p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div className="flex items-center gap-4">
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

          <div className="flex gap-2">
            <Button onClick={onSchedule} className="flex-1">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>
            <Button variant="outline">
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact
            </Button>
          </div>

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
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{provider.availability}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Insurance Accepted</CardTitle>
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
        </div>
      </SheetContent>
    </Sheet>
  )
}
