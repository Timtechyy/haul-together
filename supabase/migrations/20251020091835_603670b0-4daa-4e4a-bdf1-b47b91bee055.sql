-- Add location tracking fields to driver_vehicles table
ALTER TABLE public.driver_vehicles 
ADD COLUMN IF NOT EXISTS current_lat numeric,
ADD COLUMN IF NOT EXISTS current_lng numeric,
ADD COLUMN IF NOT EXISTS last_location_update timestamp with time zone DEFAULT now();

-- Create index for faster location queries
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_location 
ON public.driver_vehicles(current_lat, current_lng) 
WHERE current_lat IS NOT NULL AND current_lng IS NOT NULL;