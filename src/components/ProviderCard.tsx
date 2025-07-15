import { Building, Star, Verified, MapPin, Phone, Globe } from 'lucide-react';

interface Provider {
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  address: string;
  phone: string;
  website: string;
  isVerified: boolean;
}

interface ProviderCardProps {
  provider: Provider;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
          <Building size={32} className="text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">{provider.name}</h3>
            {provider.isVerified && (
              <div className="flex items-center gap-1 text-xs text-green-400">
                <Verified size={14} />
                <span>Verified</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{provider.specialty}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-0.5 text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill={i < Math.floor(provider.rating) ? 'currentColor' : 'none'} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">({provider.reviews} reviews)</span>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-muted-foreground" />
          <span className="text-foreground">{provider.address}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-muted-foreground" />
          <span className="text-foreground">{provider.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-muted-foreground" />
          <a href={provider.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {provider.website}
          </a>
        </div>
      </div>
    </div>
  );
}