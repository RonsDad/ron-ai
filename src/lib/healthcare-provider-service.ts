import { Provider, SearchFilters } from './healthcare-types';

// Configuration for healthcare APIs
export const HEALTHCARE_API_CONFIG = {
  // Backend URL - will integrate with existing Nira backend
  BACKEND_URL: typeof window !== 'undefined' 
    ? (window as any).NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    : 'http://localhost:8000',
  
  // NPPES API Configuration
  NPPES_BASE_URL: 'https://npiregistry.cms.hhs.gov/api/',
  
  // API timeouts
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

export class HealthcareProviderService {
  /**
   * Search for healthcare providers using NPPES API
   */
  static async searchProviders(filters: SearchFilters = {}): Promise<Provider[]> {
    try {
      // Build query string
      const params = new URLSearchParams();
      
      if (filters.name) {
        params.append('name', filters.name);
      }
      if (filters.specialty && filters.specialty !== 'all') {
        params.append('specialty', filters.specialty);
      }
      if (filters.city) {
        params.append('city', filters.city);
      }
      if (filters.state) {
        params.append('state', filters.state);
      }

      // Call backend API (will be integrated with Nira's existing backend)
      const response = await fetch(`${HEALTHCARE_API_CONFIG.BACKEND_URL}/api/providers/search?${params.toString()}`, {
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.providers || [];
    } catch (error) {
      console.error('Error searching providers:', error);
      // Return empty array on error instead of throwing
      return [];
    }
  }

  /**
   * Get provider by NPI number
   */
  static async getProviderByNPI(npi: string): Promise<Provider | null> {
    try {
      const response = await fetch(`${HEALTHCARE_API_CONFIG.BACKEND_URL}/api/providers/${npi}`, {
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.provider || null;
    } catch (error) {
      console.error('Error fetching provider:', error);
      return null;
    }
  }

  /**
   * Geocode provider addresses for map display
   */
  static async geocodeProviders(providers: Provider[]): Promise<Provider[]> {
    try {
      const response = await fetch(`${HEALTHCARE_API_CONFIG.BACKEND_URL}/api/providers/geocode`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ providers })
      });
      
      if (!response.ok) {
        throw new Error(`Geocoding error: ${response.status}`);
      }

      const data = await response.json();
      return data.providers || providers;
    } catch (error) {
      console.error('Error geocoding providers:', error);
      return providers; // Return original providers if geocoding fails
    }
  }

  /**
   * Get common medical specialties for dropdown
   */
  static getCommonSpecialties(): string[] {
    return [
      'Cardiology',
      'Dermatology',
      'Emergency Medicine',
      'Family Medicine',
      'Gastroenterology',
      'Internal Medicine',
      'Neurology',
      'Obstetrics & Gynecology',
      'Ophthalmology',
      'Orthopedic Surgery',
      'Pediatrics',
      'Psychiatry',
      'Radiology',
      'Surgery',
      'Urology'
    ].sort();
  }

  /**
   * Detect if a message requires healthcare provider search
   */
  static detectProviderSearchIntent(message: string): boolean {
    const healthcareKeywords = [
      'doctor', 'physician', 'provider', 'specialist', 'clinic', 'hospital',
      'cardiologist', 'dermatologist', 'pediatrician', 'psychiatrist',
      'find a doctor', 'medical provider', 'healthcare provider',
      'appointment', 'medical care', 'treatment', 'diagnosis'
    ];

    const locationKeywords = [
      'near me', 'nearby', 'in my area', 'close to', 'around',
      'city', 'state', 'zip code', 'address'
    ];

    const messageLower = message.toLowerCase();
    
    const hasHealthcareKeyword = healthcareKeywords.some(keyword => 
      messageLower.includes(keyword)
    );
    
    const hasLocationKeyword = locationKeywords.some(keyword => 
      messageLower.includes(keyword)
    );

    return hasHealthcareKeyword || hasLocationKeyword;
  }

  /**
   * Extract search parameters from natural language query
   */
  static extractSearchParameters(message: string): SearchFilters {
    const filters: SearchFilters = {};
    const messageLower = message.toLowerCase();

    // Extract specialty
    const specialties = this.getCommonSpecialties();
    for (const specialty of specialties) {
      if (messageLower.includes(specialty.toLowerCase())) {
        filters.specialty = specialty;
        break;
      }
    }

    // Extract location information (basic pattern matching)
    const cityStatePattern = /in ([a-zA-Z\s]+),?\s*([A-Z]{2})/i;
    const match = message.match(cityStatePattern);
    if (match) {
      filters.city = match[1].trim();
      filters.state = match[2].trim();
    }

    // Extract provider name if mentioned
    const namePattern = /(?:doctor|dr\.?)\s+([a-zA-Z\s]+)/i;
    const nameMatch = message.match(namePattern);
    if (nameMatch) {
      filters.name = nameMatch[1].trim();
    }

    return filters;
  }
}
