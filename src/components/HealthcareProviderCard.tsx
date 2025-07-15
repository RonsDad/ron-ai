
"use client";

import { Heart, Star, Users, Phone, MapPin } from "lucide-react";
import { Provider } from "../lib/healthcare-types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";

interface HealthcareProviderCardProps {
  provider: Provider;
  onSelect: (provider: Provider) => void;
  onToggleCompare?: (provider: Provider) => void;
  isSelected?: boolean;
  compareDisabled?: boolean;
}

export function HealthcareProviderCard({
  provider,
  onSelect,
  onToggleCompare,
  isSelected = false,
  compareDisabled = false,
}: HealthcareProviderCardProps) {
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement favorites functionality
  };
  
  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleCompare) {
      onToggleCompare(provider);
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
      onClick={() => onSelect(provider)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={provider.imageUrl} alt={provider.name} />
              <AvatarFallback>
                {provider.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold">{provider.name}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {provider.specialization}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onToggleCompare && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={handleCompareClick}
                disabled={compareDisabled}
                className="data-[state=checked]:bg-primary"
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFavoriteClick}
              className="h-8 w-8 p-0"
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{provider.address}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{provider.phone}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{provider.rating}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              ({provider.reviews.length} reviews)
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Insurance Accepted:</div>
          <div className="flex flex-wrap gap-1">
            {provider.insurance.slice(0, 3).map((insurance, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {insurance}
              </Badge>
            ))}
            {provider.insurance.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{provider.insurance.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <div className="flex gap-2 w-full">
          <Button variant="outline" size="sm" className="flex-1">
            View Details
          </Button>
          <Button size="sm" className="flex-1">
            Book Appointment
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

