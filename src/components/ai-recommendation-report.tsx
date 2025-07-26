"use client"

import { motion } from "framer-motion"
import { Award, CheckCircle, MessageSquare, MapPin, RefreshCw, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProviderSearchResult } from "@/lib/types"

interface AIRecommendationReportProps {
  providers: ProviderSearchResult[]
  onViewDetails: (provider: ProviderSearchResult) => void
}

export function AIRecommendationReport({ providers, onViewDetails }: AIRecommendationReportProps) {
  const topRecommendation = providers[0] // Assuming the first one is the top pick

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Head-to-Head Comparison</h2>
          <p className="text-muted-foreground">Based on deep research, here is our top recommendation.</p>
        </div>
        <Button variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Run Again
        </Button>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Award className="w-6 h-6 text-primary" />
            AI Recommendation Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-card p-6 rounded-xl">
            <p className="text-sm text-muted-foreground">Top Recommendation:</p>
            <div className="flex items-center justify-between mt-2">
              <h3 className="text-3xl font-bold">{topRecommendation.name}</h3>
              <div className="text-right">
                <p className="text-sm">{topRecommendation.distance}</p>
                <p className="text-xs text-muted-foreground">~15 mins by car</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="mt-2 bg-transparent">
              <Navigation className="w-3 h-3 mr-2" />
              Get Directions
            </Button>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Key Decision Factors:</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Award className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                <div>
                  <h5 className="font-semibold">Alignment with Personal Needs</h5>
                  <p className="text-sm text-muted-foreground">
                    Dr. Lee's holistic approach combining traditional rheumatology with lifestyle medicine and
                    acupuncture perfectly matches your preference for comprehensive care that goes beyond medication
                    alone.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="w-5 h-5 mt-1 text-green-500 flex-shrink-0" />
                <div>
                  <h5 className="font-semibold">Verified Availability</h5>
                  <p className="text-sm text-muted-foreground">
                    Our AI agent confirmed that Dr. Lee's Lotus Rheumatology clinic offers extended hours and telehealth
                    options, accommodating your work commitments.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MessageSquare className="w-5 h-5 mt-1 text-blue-500 flex-shrink-0" />
                <div>
                  <h5 className="font-semibold">Exceptional Patient Feedback</h5>
                  <p className="text-sm text-muted-foreground">
                    With a 4.8 rating from 93 reviews, patients consistently praise her empathetic listening skills and
                    thorough explanations – exactly what you're looking for in managing chronic conditions.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 mt-1 text-red-500 flex-shrink-0" />
                <div>
                  <h5 className="font-semibold">Location Analysis</h5>
                  <p className="text-sm text-muted-foreground">
                    Dr. Lee's clinic is conveniently located in Murray, UT, making it easily accessible from your
                    location. The clinic offers ample parking and is near public transportation routes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={() => onViewDetails(topRecommendation)} className="w-full bg-primary hover:bg-primary/90">
            View Full Report for {topRecommendation.name}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
