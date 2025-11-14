/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadGoogleMaps } from "@/utils/loadGoogleMap";

interface Props {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  disabled?: boolean;
  required?: boolean;
}

export default function GooglePlacesAutocomplete({
  id,
  label,
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    loadGoogleMaps(apiKey)
      .then(() => {
        setLoaded(true);
        initAutocomplete();
      })
      .catch((err) => {
        console.error("Maps failed to load:", err);
      });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const initAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      fields: ["formatted_address", "geometry"],
    });

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place) return;

      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();

      onChange(place.formatted_address || "", lat, lng);
    });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      <Input
        ref={inputRef}
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      />

      {!loaded && (
        <p className="text-xs text-muted-foreground">Loading Google Maps…</p>
      )}
    </div>
  );
}