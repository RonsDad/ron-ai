// Demo data for healthcare agent trace steps
export const agentTraceSteps = [
  "Analyzing your healthcare request...",
  "Searching NPPES provider database...",
  "Filtering by location and specialty...",
  "Checking insurance compatibility...",
  "Geocoding provider addresses...",
  "Calculating distances and ratings...",
  "Preparing provider recommendations...",
  "Healthcare providers found successfully!"
];

// Healthcare specialties for dropdowns
export const healthcareSpecialties = [
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
];

// Common insurance providers
export const insuranceProviders = [
  'Aetna',
  'Anthem',
  'Blue Cross Blue Shield',
  'Cigna',
  'Humana',
  'Kaiser Permanente',
  'Medicare',
  'Medicaid',
  'UnitedHealthcare'
];

// Sample provider data for testing
export const sampleProviders = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    specialization: 'Cardiology',
    address: '123 Medical Center Dr, San Francisco, CA 94102',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    phone: '(555) 123-4567',
    insurance: ['Blue Cross Blue Shield', 'Aetna', 'UnitedHealthcare'],
    rating: 4.8,
    reviews: [
      { rating: 5, comment: 'Excellent care and very thorough' },
      { rating: 4, comment: 'Professional and knowledgeable' }
    ],
    imageUrl: '/api/placeholder/150/150',
    details: 'Board-certified cardiologist with 15+ years experience'
  },
  {
    id: '2', 
    name: 'Dr. Michael Chen',
    specialization: 'Family Medicine',
    address: '456 Health Plaza, San Francisco, CA 94103',
    coordinates: { lat: 37.7849, lng: -122.4094 },
    phone: '(555) 234-5678',
    insurance: ['Cigna', 'Anthem', 'Medicare'],
    rating: 4.6,
    reviews: [
      { rating: 5, comment: 'Great bedside manner' },
      { rating: 4, comment: 'Very caring doctor' }
    ],
    imageUrl: '/api/placeholder/150/150',
    details: 'Family medicine physician focused on preventive care'
  }
];
