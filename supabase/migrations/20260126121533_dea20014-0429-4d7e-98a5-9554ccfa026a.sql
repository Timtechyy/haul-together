CREATE OR REPLACE FUNCTION public.check_driver_availability(
  p_vehicle_type text,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_radius_km integer DEFAULT 10
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
  SELECT
    dv.user_id,
    (
      6371 * acos(
        cos(radians(p_pickup_lat)) *
        cos(radians(dv.current_lat)) *
        cos(radians(dv.current_lng) - radians(p_pickup_lng)) +
        sin(radians(p_pickup_lat)) *
        sin(radians(dv.current_lat))
      )
    ) AS distance_km
  FROM driver_vehicles dv
  JOIN driver_verifications v
    ON v.user_id = dv.user_id
   AND v.verification_status = 'approved'
  WHERE
    dv.is_online = true
    AND dv.vehicle_type = p_vehicle_type
    AND dv.current_lat IS NOT NULL
    AND dv.current_lng IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM deliveries d
      WHERE d.driver_id = dv.user_id
        AND d.status IN ('accepted','picking_up','in_transit')
    )
  HAVING
    (
      6371 * acos(
        cos(radians(p_pickup_lat)) *
        cos(radians(dv.current_lat)) *
        cos(radians(dv.current_lng) - radians(p_pickup_lng)) +
        sin(radians(p_pickup_lat)) *
        sin(radians(dv.current_lat))
      )
    ) <= p_radius_km
  ORDER BY distance_km
  LIMIT 10;
END;
$$;