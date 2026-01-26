-- Drop existing function
DROP FUNCTION IF EXISTS public.check_driver_availability(text, double precision, double precision, integer);

-- Recreate with expanded return type including profile and vehicle details
CREATE OR REPLACE FUNCTION public.check_driver_availability(
  vehicle_type text,
  pickup_lat double precision,
  pickup_lng double precision,
  radius_km integer DEFAULT 7
)
RETURNS TABLE (
  driver_id uuid,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  vehicle_type text,
  make text,
  model text,
  year integer,
  color text,
  license_plate text,
  current_lat double precision,
  current_lng double precision,
  distance_km double precision
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    dv.user_id AS driver_id,
    p.first_name,
    p.last_name,
    p.phone,
    p.avatar_url,
    dv.vehicle_type,
    dv.make,
    dv.model,
    dv.year,
    dv.color,
    dv.license_plate,
    dv.current_lat::double precision,
    dv.current_lng::double precision,
    (
      6371 * acos(
        cos(radians(pickup_lat)) *
        cos(radians(dv.current_lat)) *
        cos(radians(dv.current_lng) - radians(pickup_lng)) +
        sin(radians(pickup_lat)) *
        sin(radians(dv.current_lat))
      )
    ) AS distance_km
  FROM driver_vehicles dv
  JOIN driver_verifications v
    ON v.user_id = dv.user_id
   AND v.verification_status = 'approved'
  JOIN profiles p
    ON p.id = dv.user_id
  WHERE
    dv.is_online = true
    AND dv.vehicle_type = check_driver_availability.vehicle_type
    AND dv.current_lat IS NOT NULL
    AND dv.current_lng IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM deliveries d
      WHERE d.driver_id = dv.user_id
        AND d.status IN ('accepted', 'picking_up', 'in_transit')
    )
    AND (
      6371 * acos(
        cos(radians(pickup_lat)) *
        cos(radians(dv.current_lat)) *
        cos(radians(dv.current_lng) - radians(pickup_lng)) +
        sin(radians(pickup_lat)) *
        sin(radians(dv.current_lat))
      )
    ) <= radius_km
  ORDER BY distance_km
  LIMIT 10;
$$;