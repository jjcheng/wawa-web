"use client";

import { useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";

type GoogleAutocomplete = {
  addListener: (event: string, handler: () => void) => void;
  getPlace: () => { formatted_address?: string; name?: string };
};

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options: { fields: string[]; types: string[] },
          ) => GoogleAutocomplete;
        };
      };
    };
  }
}

const SCRIPT_ID = "google-maps-places";

export function GoogleLocationInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;

    function initialize() {
      if (!window.google?.maps.places || !inputRef.current) return;
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["formatted_address", "name"],
        types: ["establishment", "geocode"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        onChange(place.formatted_address ?? place.name ?? inputRef.current?.value ?? "");
      });
    }

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.google?.maps.places) initialize();
      else existingScript.addEventListener("load", initialize, { once: true });
      return () => existingScript.removeEventListener("load", initialize);
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.addEventListener("load", initialize, { once: true });
    document.head.appendChild(script);
    return () => script.removeEventListener("load", initialize);
  }, [apiKey, onChange]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search for a location"
      autoComplete="off"
    />
  );
}
