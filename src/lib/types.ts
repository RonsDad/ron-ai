export interface Message {
  id?: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  type?: string
  data?: any
  reasoning?: string
  reasoningTokens?: number
}

export interface UserProfile {
  id: string
  name: string
  age: number
  email: string
  phone: string
  address: string
  insurance: string
  conditions?: string[]
  medications?: string[]
  allergies?: string[]
  emergencyContact?: {
    name: string
    relationship: string
    phone: string
  }
  preferredPharmacy?: {
    name: string
    address: string
    phone: string
  }
}

export interface Provider {
  id: string
  name: string
  specialty: string
  address: string
  phone: string
  website?: string
  rating: number
  reviews: number
  distance: number
  specialties: string[]
  acceptingNewPatients: boolean
}

export interface ProviderSearchResult {
  id: string
  name: string
  specialty: string
  rating: number
  reviews: number
  location: string
  distance: string
  availability: string
  insurance: string[]
  imageUrl?: string
  aiSummary?: string
}

export interface ProviderSearchData {
  results: ProviderSearchResult[]
  searchQuery: string
}

export interface Medication {
  id: string
  name: string
  dosage: string
  nextDue: Date
  refillsRemaining: number
  needsRefill?: boolean
  costSavingOpportunity?: {
    currentCost: number
    potentialSavings: number
    suggestion: string
  }
}

export interface MedicationReminder {
  id: string
  medicationId: string
  time: Date
  message: string
}

export interface MedicationData {
  currentMedications: Medication[]
  reminders: MedicationReminder[]
}

export interface AppointmentData {
  availableSlots: any[]
  selectedProvider: ProviderSearchResult | null
}

export interface Agent {
  type: "provider-search" | "medication" | "appointment" | "general"
  name: string
  description: string
}

export type AgentStatus =
  | "idle"
  | "analyzing"
  | "connecting"
  | "searching"
  | "processing"
  | "scheduling"
  | "researching"
  | "completed"
