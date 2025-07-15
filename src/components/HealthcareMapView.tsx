"use client";

import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import { useState } from "react";
import type { Provider } from "@/lib/types";
import { GOOGLE_MAPS_API_KEY } from "@/lib/config";
import { Button } from "./ui/button";

interface MapViewProps {
  providers: Provider[];
  onSelectProvider: (provider: Provider) => void;
}

export function MapView({ providers, onSelectProvider }: MapViewProps) {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null
  );

  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_API_KEY_HERE") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <div className="text-center">
          <p className="font-semibold text-destructive">
            Google Maps API Key is missing.
          </p>
          <p className="text-sm text-muted-foreground">
            Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file.
          </p>
        </div>
      </div>
    );
  }
  
  const darkModeMapStyles = [
    { elementType: "geometry", stylers: [{ color: "#19191a" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#09090b" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#a3a3a3" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#262627" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#60A5FA" }] },
    { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#262627" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#09090b" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3B82F6" }] },
    { featureType: "road.highway", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#09090b" }] },
  ];

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        mapId="ron-ai-map"
        style={{ width: "100%", height: "100%" }}
        defaultCenter={{ lat: 39.8283, lng: -98.5795 }}
        defaultZoom={4}
        gestureHandling={"greedy"}
        disableDefaultUI={true}
        styles={darkModeMapStyles}
      >
        {providers.map((provider) => (
          <AdvancedMarker
            key={provider.id}
            position={provider.coordinates}
            onClick={() => setSelectedProvider(provider)}
          >
            <Pin
              background={"hsl(var(--primary))"}
              borderColor={"hsl(var(--accent))"}
              glyphColor={"hsl(var(--primary-foreground))"}
            />
          </AdvancedMarker>
        ))}

        {selectedProvider && (
          <InfoWindow
            position={selectedProvider.coordinates}
            onCloseClick={() => setSelectedProvider(null)}
          >
            <div className="p-2 max-w-xs">
              <h3 className="font-bold text-lg text-foreground">
                {selectedProvider.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedProvider.specialization}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedProvider.address}
              </p>
              <Button
                size="sm"
                className="mt-2 w-full"
                onClick={() => onSelectProvider(selectedProvider)}
              >
                View Details
              </Button>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
