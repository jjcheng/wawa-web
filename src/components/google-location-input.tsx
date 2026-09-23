"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";

type GoogleLegacyAutocomplete = {
  addListener: (event: string, handler: () => void) => void;
  getPlace: () => {
    formatted_address?: string;
    name?: string;
    geometry?: { location?: GoogleLatLng };
  };
};

type GoogleLatLng = {
  lat: () => number;
  lng: () => number;
};

type GooglePlace = {
  fetchFields: (options: { fields: string[] }) => Promise<void>;
  formattedAddress?: string;
  displayName?: string;
  location?: GoogleLatLng;
};

type GooglePlacePrediction = {
  toPlace: () => GooglePlace;
};

type GooglePlacePredictionSelectEvent = Event & {
  placePrediction?: GooglePlacePrediction;
};

export type GoogleLocationSelection = {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

type GooglePlaceAutocompleteElement = HTMLElement & {
  addEventListener: (
    type: string,
    listener: (event: Event) => void,
  ) => void;
  placeholder?: string;
  value?: string;
};

declare global {
  interface Window {
    __googleMapsPlacesLoaded?: () => void;
    __googleMapsPlacesPromise?: Promise<void>;
    google?: {
      maps: {
        importLibrary?: (libraryName: string) => Promise<unknown>;
        places?: {
          PlaceAutocompleteElement?: new (options?: {
            requestedLanguage?: string;
            requestedRegion?: string;
          }) => GooglePlaceAutocompleteElement;
          Autocomplete?: new (
            input: HTMLInputElement,
            options: { fields: string[]; types: string[] },
          ) => GoogleLegacyAutocomplete;
        };
      };
    };
  }
}

const SCRIPT_ID = "google-maps-places";

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (window.__googleMapsPlacesPromise) return window.__googleMapsPlacesPromise;

  window.__googleMapsPlacesPromise = new Promise<void>((resolve, reject) => {
    window.__googleMapsPlacesLoaded = () => {
      delete window.__googleMapsPlacesLoaded;
      resolve();
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
      `&v=weekly&loading=async&callback=__googleMapsPlacesLoaded`;
    script.async = true;
    script.addEventListener(
      "error",
      () => {
        delete window.__googleMapsPlacesLoaded;
        delete window.__googleMapsPlacesPromise;
        reject(new Error("Google Maps JavaScript API failed to load."));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  return window.__googleMapsPlacesPromise;
}

export function GoogleLocationInput({
  value,
  onChange,
  onSearchChange,
  onPlaceSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  onSearchChange?: (value: string) => void;
  onPlaceSelect?: (location: GoogleLocationSelection | null) => void;
}) {
  const { resolvedTheme } = useTheme();
  const placeContainerRef = useRef<HTMLDivElement>(null);
  const placeAutocompleteRef = useRef<GooglePlaceAutocompleteElement | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || !placeContainerRef.current) return;
    const container = placeContainerRef.current;
    let cancelled = false;

    async function initialize() {
      try {
        await loadGoogleMaps(apiKey as string);
      } catch {
        if (!cancelled) setLoadError("Google Maps search could not be loaded.");
        return;
      }
      if (cancelled || !window.google?.maps) return;

      let places = window.google.maps.places;
      if (typeof window.google.maps.importLibrary === "function") {
        try {
          places = (await window.google.maps.importLibrary("places")) as typeof places;
        } catch {
          if (!cancelled) setLoadError("Google Places search is unavailable for this site.");
          return;
        }
      }
      if (cancelled || !places || !container) return;

      if (!places.PlaceAutocompleteElement) {
        setLoadError("Google Places search is unavailable for this site.");
        return;
      }

      if (placeAutocompleteRef.current) return;

      const placeAutocomplete = new places.PlaceAutocompleteElement();
      placeAutocompleteRef.current = placeAutocomplete;
      placeAutocomplete.placeholder = "Search for a location";
      placeAutocomplete.value = value;
      Object.assign(placeAutocomplete.style, {
        background: "transparent",
        border: "0",
        borderRadius: "inherit",
        color: "inherit",
        colorScheme: resolvedTheme === "dark" ? "dark" : "light",
        display: "block",
        font: "inherit",
        height: "100%",
        outline: "none",
        width: "100%",
      });

      placeAutocomplete.addEventListener("gmp-select", (event: Event) => {
        const prediction = (event as GooglePlacePredictionSelectEvent).placePrediction;
        if (!prediction) return;

        const place = prediction.toPlace();
        void place
          .fetchFields({ fields: ["formattedAddress", "displayName", "location"] })
          .then(() => {
            const name = place.displayName || place.formattedAddress || "";
            const address = place.displayName || place.formattedAddress || "";
            if (address) onChange(address);
            if (name && address) {
              onPlaceSelect?.({
                name,
                address,
                latitude: place.location?.lat(),
                longitude: place.location?.lng(),
              });
            }
          })
          .catch(() => {
            const name = place.displayName || place.formattedAddress || "";
            const address = place.displayName || place.formattedAddress || "";
            if (address) onChange(address);
            if (name && address) onPlaceSelect?.({ name, address });
          });
      });

      placeAutocomplete.addEventListener("input", (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target && typeof target.value === "string") {
          (onSearchChange ?? onChange)(target.value);
          onPlaceSelect?.(null);
        }
      });

      container.replaceChildren(placeAutocomplete);
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [apiKey, onChange, onPlaceSelect, onSearchChange, resolvedTheme, value]);

  useEffect(() => {
    if (placeAutocompleteRef.current && placeAutocompleteRef.current.value !== value) {
      placeAutocompleteRef.current.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (placeAutocompleteRef.current) {
      placeAutocompleteRef.current.style.colorScheme = resolvedTheme === "dark" ? "dark" : "light";
    }
  }, [resolvedTheme]);

  return (
    <div className="w-full overflow-visible" style={{ overflow: "visible" }}>
      <div
        ref={placeContainerRef}
        className="border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 h-11 w-full rounded-lg border bg-transparent text-sm text-foreground transition-colors outline-none focus-within:ring-3"
        style={{ overflow: "visible", maxWidth: "100%" }}
      />
      {!apiKey ? <p className="text-destructive mt-2 text-sm">Google Maps key is not configured.</p> : null}
      {loadError ? <p className="text-destructive mt-2 text-sm">{loadError}</p> : null}
    </div>
  );
}
