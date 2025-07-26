"use client"

import { useState } from "react"
import type { UserProfile } from "@/lib/types"

export function useUserProfile() {
  const [userProfile] = useState<UserProfile>({
    id: "1",
    name: "John Doe",
    age: 45,
    email: "john.doe@example.com",
    phone: "(555) 123-4567",
    address: "123 Main St, City, ST 12345",
    insurance: "Blue Cross Blue Shield",
    conditions: ["Hypertension", "Type 2 Diabetes"],
    medications: ["Lisinopril 10mg", "Metformin 500mg"],
    allergies: ["Penicillin"],
    emergencyContact: {
      name: "Jane Doe",
      relationship: "Spouse",
      phone: "(555) 987-6543",
    },
    preferredPharmacy: {
      name: "CVS Pharmacy",
      address: "456 Oak Ave, City, ST 12345",
      phone: "(555) 555-0123",
    },
  })

  return { userProfile }
}
