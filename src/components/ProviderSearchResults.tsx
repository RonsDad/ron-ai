
import { ProviderCard } from './ProviderCard';
import { ProviderMapView } from './ProviderMapView';

const dummyProvider = {
  name: "Cedars-Sinai Medical Center",
  specialty: "Multi-Specialty Hospital",
  rating: 4.8,
  reviews: 1204,
  address: "8700 Beverly Blvd, Los Angeles, CA 90048",
  phone: "(310) 423-3277",
  website: "cedars-sinai.org",
  isVerified: true,
};

export function ProviderSearchResults() {
  return (
    <div className="flex h-full">
      <div className="w-1/3 p-4 overflow-y-auto space-y-4">
        <h2 className="text-xl font-bold text-foreground">Providers Near You</h2>
        {[...Array(5)].map((_, i) => (
          <ProviderCard key={i} provider={dummyProvider} />
        ))}
      </div>
      <div className="w-2/3">
        <ProviderMapView />
      </div>
    </div>
  );
} 