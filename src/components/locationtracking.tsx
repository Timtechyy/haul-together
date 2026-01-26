import { createContext, useContext } from "react";

type LocationTrackingContextType = {
  isTracking: boolean;
};

export const LocationTrackingContext =
  createContext<LocationTrackingContextType | null>(null);

export const useLocationTrackingContext = () => {
  const ctx = useContext(LocationTrackingContext);
  if (!ctx) {
    throw new Error(
      "useLocationTrackingContext must be used within LocationTrackingProvider"
    );
  }
  return ctx;
};