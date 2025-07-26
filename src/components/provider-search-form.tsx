"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import type { UserProfile } from "@/lib/types"

interface ProviderSearchFormProps {
  userProfile: UserProfile
  onSearch: () => void
}

export function ProviderSearchForm({ userProfile, onSearch }: ProviderSearchFormProps) {
  const [formData, setFormData] = useState({
    specialty: "",
    location: userProfile.address || "",
    radius: [10],
    insurance: userProfile.insurance || "",
    gender: "",
    languages: [] as string[],
    availability: "",
    acceptingNewPatients: true,
    telehealth: false,
  })

  const handleSearch = () => {
    console.log("Search initiated with:", formData)
    onSearch()
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Provider Search Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialty" className="text-sm font-medium">
                Specialty
              </Label>
              <Select
                value={formData.specialty}
                onValueChange={(value) => setFormData({ ...formData, specialty: value })}
              >
                <SelectTrigger className="h-10 sm:h-12">
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cardiology">Cardiology</SelectItem>
                  <SelectItem value="dermatology">Dermatology</SelectItem>
                  <SelectItem value="endocrinology">Endocrinology</SelectItem>
                  <SelectItem value="family-medicine">Family Medicine</SelectItem>
                  <SelectItem value="internal-medicine">Internal Medicine</SelectItem>
                  <SelectItem value="neurology">Neurology</SelectItem>
                  <SelectItem value="oncology">Oncology</SelectItem>
                  <SelectItem value="orthopedics">Orthopedics</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium">
                Location
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter address or zip code"
                  className="pl-10 h-10 sm:h-12"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Search Radius: {formData.radius[0]} miles</Label>
            <Slider
              value={formData.radius}
              onValueChange={(value) => setFormData({ ...formData, radius: value })}
              max={50}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="insurance" className="text-sm font-medium">
                Insurance
              </Label>
              <Input
                id="insurance"
                value={formData.insurance}
                onChange={(e) => setFormData({ ...formData, insurance: e.target.value })}
                placeholder="Your insurance provider"
                className="h-10 sm:h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender" className="text-sm font-medium">
                Provider Gender Preference
              </Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                <SelectTrigger className="h-10 sm:h-12">
                  <SelectValue placeholder="No preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non-binary">Non-binary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="new-patients"
                checked={formData.acceptingNewPatients}
                onCheckedChange={(checked) => setFormData({ ...formData, acceptingNewPatients: !!checked })}
              />
              <Label htmlFor="new-patients" className="text-sm">
                Accepting new patients
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="telehealth"
                checked={formData.telehealth}
                onCheckedChange={(checked) => setFormData({ ...formData, telehealth: !!checked })}
              />
              <Label htmlFor="telehealth" className="text-sm">
                Telehealth available
              </Label>
            </div>
          </div>

          <Button onClick={handleSearch} className="w-full bg-primary hover:bg-primary/90 h-10 sm:h-12">
            <Search className="w-4 h-4 mr-2" />
            Search Providers
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
