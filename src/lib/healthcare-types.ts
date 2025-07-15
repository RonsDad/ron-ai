// Healthcare Provider Types - Migrated from ron4real
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Review {
  rating: number;
  comment: string;
}

export interface Provider {
  id: string;
  name: string;
  specialization: string;
  address: string;
  coordinates: Coordinates;
  phone: string;
  insurance: string[];
  rating: number;
  reviews: Review[];
  imageUrl: string;
  details: string;
  // Added to pass along the full demo data for the deep research view
  demoData?: any;
}

// Search and Filter Types
export interface SearchFilters {
  specialty?: string;
  city?: string;
  state?: string;
  name?: string;
}

// Multi-mode search types
export type SearchMode = "providers" | "medications" | "denials" | "coding" | "aiChat";

export interface ModeConfig {
  placeholder: string;
  title: string;
  indicatorColor: string;
}

// AI Integration Types
export interface PromptBuilderInput {
  searchType: 'Provider' | 'Facility';
  specialty: string;
  location: string;
  insurance: string[];
  languages: string[];
  customRequirements: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  tags: string[];
}

// Browser Integration Types
export interface BrowserSession {
  session_id: string;
  screenshot?: string;
  current_url?: string;
  streaming?: boolean;
}

// Enhanced message type for healthcare context
export interface HealthcareMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?: 'provider_search' | 'browser_task' | 'general';
  metadata?: {
    providers?: Provider[];
    searchFilters?: SearchFilters;
    browserSession?: BrowserSession;
  };
}
