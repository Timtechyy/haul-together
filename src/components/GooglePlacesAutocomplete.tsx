/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadGoogleMaps } from "@/utils/loadGoogleMap";



interface AddressData {
  line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  lat?: number;
  lng?: number;
}


interface Props {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value:string, components?:AddressData, lat?: number, lng?: number) => void;
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
  const debounceRef = useRef<number | null>(null);

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
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };

  }, []);

  const initAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      fields: ["address_components", "formatted_address", "geometry"],
    });

    autocompleteRef.current.addListener("place_changed", () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        const place = autocompleteRef.current?.getPlace();
        if (!place) return;

          const components = place.address_components;

          const get = (type: string) => components.find((c) => c.types.includes(type))?.long_name || "";
          
          const addressData = {
            line1: "",
            city: "",
            state: "",
            postal_code: "",
            country: ""
          };


          components.forEach((comp) => {
            if (comp.types.includes("street_number")) {
              addressData.line1 = comp.long_name + " ";
            }
            if (comp.types.includes("route")) {
              addressData.line1 = (addressData.line1 || "") + comp.long_name;
            }
            if (comp.types.includes("locality")) {
              addressData.city = comp.long_name;
            }
            if (comp.types.includes("sublocality") && !addressData.city) {
              addressData.city = comp.long_name;
            }
            if (comp.types.includes("administrative_area_level_2") && !addressData.city) {
              addressData.city = comp.long_name;
            }
            if (comp.types.includes("administrative_area_level_1")) {
              addressData.state = comp.long_name;
            }
            if (comp.types.includes("postal_code")) {
              addressData.postal_code = comp.long_name;
            }
            if (comp.types.includes("country")) {
              addressData.country = comp.long_name;
            }
          });
          const lat = place.geometry?.location?.lat();
          const lng = place.geometry?.location?.lng();

          // onChange(place.formatted_address, addressData, lat, lng);

          onChange(place.formatted_address, addressData, lat, lng);
        }, 500);
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