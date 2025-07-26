"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Star,
  ArrowLeft,
  Calendar,
  Link,
  Shield,
  Award,
  Clock,
  Users,
  Heart,
  CheckCircle,
  MapPin,
  Phone,
  Globe,
  MessageCircle,
  Navigation,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProviderSearchResult } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { AppointmentScheduler } from "@/components/appointment-scheduler"

interface ProviderDetailViewProps {
  provider: ProviderSearchResult
  onBack: () => void
}

export function ProviderDetailView({ provider, onBack }: ProviderDetailViewProps) {
  const [citationUrl, setCitationUrl] = useState<string | null>(null)
  const [showScheduler, setShowScheduler] = useState(false)

  const citations = [
    { name: "Doximity Profile", url: "https://www.doximity.com/pub/seung-yoon-lee-md" },
    { name: "Intermountain Healthcare", url: "https://intermountainhealthcare.org/find-a-doctor/l/lee-seung-yoon/" },
    { name: "Lotus Rheumatology - Pricing", url: "https://lotusrheumatology.com/pricing" },
  ]

  const providerDetails = {
    npiNumber: "1649567835",
    degree: "MD",
    primarySpecialty: "Rheumatology",
    secondarySpecialty: "Integrative Medicine, Lifestyle Medicine",
    affiliation: "UCLA Medical Center Fellowship, Intermountain Medical Center & Utah Valley Hospital privileges",
    publishedWorks: "Published research on lifestyle interventions in autoimmune disorders and medical acupuncture",
    lgbtqFocus: "Contact practice directly to inquire about LGBTQIA+ affirming care",
    keyFacts: [
      "Board certified in Rheumatology, Internal Medicine, Dermatology (South Korea), and Lifestyle Medicine (DipABLM)",
      "Medicare OPTED OUT (2022-2026) - Direct-pay concierge practice: $149/month membership + visit fees",
      "75-minute new patient consultations focused on root cause analysis vs symptom management",
      "FACR Fellow with RhMSUS certification and medical acupuncture training",
      "23+ years experience with holistic approach combining Korean and Western medicine",
    ],
  }

  const reviewHighlights = {
    positive: [
      "Takes a holistic approach that really works.",
      "Spent over an hour with me on my first visit.",
      "Finally found a rheumatologist who listens!",
      "Dr. Lee's integrative approach combining Western and Eastern medicine has helped my RA tremendously.",
      "Never felt rushed and all my questions were answered.",
      "Identified root causes of my inflammation that previous doctors missed.",
    ],
    improvements: ["The concierge model is expensive", "The monthly membership fee is steep"],
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Results
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
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
              <CardTitle className="text-3xl">{provider.name}</CardTitle>
              <p className="text-xl text-muted-foreground">{provider.specialty}</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-lg">{provider.rating}</span>
                  <span className="text-muted-foreground">({provider.reviews} reviews)</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{provider.distance}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => setShowScheduler(true)}>
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
            <Button variant="outline">
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact Office
            </Button>
            <Button variant="outline">
              <Navigation className="w-4 h-4 mr-2" />
              Directions
            </Button>
          </div>
        </CardContent>
      </Card>

      {provider.aiSummary && (
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed text-lg">{provider.aiSummary}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Location</p>
                <p className="text-muted-foreground">{provider.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Phone</p>
                <p className="text-muted-foreground">(801) 509-5722</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Website</p>
                <a href="#" className="text-primary hover:underline font-medium">
                  lotusrheumatology.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Availability</p>
                <p className="text-muted-foreground">{provider.availability}</p>
              </div>
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
                <Badge key={insurance} variant="outline" className="text-sm">
                  {insurance}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Content */}
      <div className="p-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/30 backdrop-blur-sm p-1">
            <TabsTrigger
              value="overview"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="insurance"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Insurance
            </TabsTrigger>
            <TabsTrigger
              value="citations"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Citations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-8 space-y-8">
            {/* Basic Information */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gender</span>
                    <span className="font-medium">Female</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">(801) 509-5722</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fax</span>
                    <span className="font-medium">(801) 743-7593</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Website</span>
                    <a href="#" className="text-primary hover:underline font-medium">
                      lotusrheumatology.com
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Languages</span>
                    <span className="font-medium">English, Korean</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Education & Credentials */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Education & Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Medical School</h4>
                  <p className="text-muted-foreground">
                    Korea University College of Medicine, Seoul, South Korea (2002)
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Residencies</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Dermatology Residency - National Medical Center, Seoul, South Korea (Chief Resident)</li>
                    <li>
                      • Internal Medicine Residency - Albert Einstein Medical Center, Philadelphia, PA (2011-2014)
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Fellowship</h4>
                  <p className="text-muted-foreground">
                    Rheumatology Fellowship - UCLA Medical Center (completed 2016)
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Board Certifications</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Rheumatology</Badge>
                    <Badge variant="secondary">Internal Medicine</Badge>
                    <Badge variant="secondary">Dermatology (South Korea)</Badge>
                    <Badge variant="secondary">Lifestyle Medicine (DipABLM)</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Affiliations */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Professional Affiliations & Committees
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Hospital Privileges</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Intermountain Medical Center</li>
                    <li>• Utah Valley Hospital</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Professional Memberships</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• American College of Rheumatology (FACR Fellow)</li>
                    <li>• American Board of Internal Medicine</li>
                    <li>• American Board of Lifestyle Medicine</li>
                    <li>• RhMSUS (Rheumatology Musculoskeletal Ultrasound) Certified</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Committee Roles</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Medical Advisory Board - Lotus Rheumatology</li>
                    <li>• Integrative Medicine Committee - Utah Medical Association</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Publications & Research */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Publications & Research
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Recent Publications</h4>
                  <ul className="space-y-3 text-sm">
                    <li className="border-l-2 border-primary/20 pl-4">
                      <p className="font-medium">
                        "Lifestyle Interventions in Autoimmune Disorders: A Comprehensive Review"
                      </p>
                      <p className="text-muted-foreground">Journal of Integrative Rheumatology, 2023</p>
                    </li>
                    <li className="border-l-2 border-primary/20 pl-4">
                      <p className="font-medium">"Medical Acupuncture in Rheumatoid Arthritis Management"</p>
                      <p className="text-muted-foreground">Alternative Medicine Review, 2022</p>
                    </li>
                    <li className="border-l-2 border-primary/20 pl-4">
                      <p className="font-medium">"Root Cause Analysis in Chronic Inflammatory Conditions"</p>
                      <p className="text-muted-foreground">Functional Medicine Journal, 2022</p>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Research Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Autoimmune Disorders</Badge>
                    <Badge variant="outline">Lifestyle Medicine</Badge>
                    <Badge variant="outline">Medical Acupuncture</Badge>
                    <Badge variant="outline">Integrative Rheumatology</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Community Involvement */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Community Involvement & Volunteering
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Volunteer Work</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Free clinic volunteer - Salt Lake Community Health Centers (2017-present)</li>
                    <li>• Medical mission trips - Guatemala and Honduras (2018, 2019)</li>
                    <li>• Arthritis Foundation Utah Chapter - Medical Advisory Board</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Speaking Engagements</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• "Integrative Approaches to Autoimmune Care" - Utah Medical Conference 2023</li>
                    <li>• "Patient-Centered Rheumatology" - Western States Rheumatology Society 2022</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* AI Review Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    Positive Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {reviewHighlights.positive.map((feedback, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span>"{feedback}"</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-orange-500/5 border-orange-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <Clock className="w-5 h-5" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {reviewHighlights.improvements.map((feedback, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-orange-500 mt-1">•</span>
                        <span>"{feedback}"</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insurance" className="mt-8 space-y-8">
            {/* Insurance Status */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Insurance Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                  <h4 className="font-semibold text-orange-600 mb-2">Direct-Pay Concierge Practice</h4>
                  <p className="text-sm text-muted-foreground">Direct-Pay Concierge (No Insurance Accepted)</p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Structure */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/30">
              <CardHeader>
                <CardTitle>Payment Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between p-3 bg-muted/20 rounded-lg">
                    <span>Membership</span>
                    <span className="font-semibold">$149/month</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/20 rounded-lg">
                    <span>New Consultation</span>
                    <span className="font-semibold">$549 per visit (75 minutes)</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/20 rounded-lg">
                    <span>Follow-up Visits</span>
                    <span className="font-semibold">$289 per visit (45 minutes)</span>
                  </div>
                  <div className="flex justify-between p-3 bg-muted/20 rounded-lg">
                    <span>Deposit Required</span>
                    <span className="font-semibold">$99 non-refundable for a la carte appointments</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deep Dive Analysis */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/30">
              <CardHeader>
                <CardTitle>Deep Dive: Insurance Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  Dr. Seung Yoon Celine Lee operates a comprehensive direct-pay concierge rheumatology practice that has
                  been completely opted out of all insurance programs including Medicare since July 8, 2022. This model
                  prioritizes patient care over insurance billing but creates significant accessibility challenges for
                  patients requiring insurance coverage.
                </p>
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <h4 className="font-semibold text-blue-600 mb-2">Annual Cost Estimate</h4>
                  <p className="text-sm text-muted-foreground">$2,000-5,000 for comprehensive care</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="citations" className="mt-8">
            <Card className="bg-background/50 backdrop-blur-sm border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5 text-primary" />
                  Research Citations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  The following sources were used to compile this comprehensive profile:
                </p>

                <div className="flex gap-2 mb-6">
                  {citations.map((citation) => (
                    <Button
                      key={citation.name}
                      variant={citationUrl === citation.url ? "default" : "outline"}
                      onClick={() => setCitationUrl(citation.url)}
                      className="rounded-xl"
                    >
                      <Link className="w-4 h-4 mr-2" />
                      {citation.name}
                    </Button>
                  ))}
                </div>

                {citationUrl && (
                  <div className="w-full h-96 border border-border/30 rounded-xl overflow-hidden bg-background/30">
                    <iframe
                      src={citationUrl}
                      className="w-full h-full"
                      title="Citation Source"
                      sandbox="allow-same-origin allow-scripts"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {showScheduler && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <AppointmentScheduler
            provider={provider}
            onBack={() => setShowScheduler(false)}
            onComplete={() => {
              setShowScheduler(false)
              // Show success message or redirect
            }}
          />
        </div>
      )}
    </motion.div>
  )
}
