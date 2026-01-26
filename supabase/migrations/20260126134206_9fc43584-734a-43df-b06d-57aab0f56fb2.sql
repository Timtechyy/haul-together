-- Drop existing function first
DROP FUNCTION IF EXISTS public.check_driver_availability(text, double precision, double precision, integer);

-- Recreate with new parameter names
CREATE OR REPLACE FUNCTION public.check_driver_availability(
  vehicle_type text,
  pickup_lat double precision,
  pickup_lng double precision,
  radius_km integer DEFAULT 7
)
RETURNS TABLE (
  driver_id uuid,
  distance_km double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM (
    SELECT
      dv.user_id AS driver_id,
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
  ) t
  WHERE t.distance_km <= radius_km
  ORDER BY t.distance_km
  LIMIT 10;
END;
$$;