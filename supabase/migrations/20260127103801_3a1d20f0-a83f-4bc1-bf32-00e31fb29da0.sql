DROP FUNCTION IF EXISTS public.accept_delivery(uuid);

CREATE OR REPLACE FUNCTION public.accept_delivery(
  p_delivery_id uuid
)
RETURNS deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_driver_id uuid := auth.uid();
  v_active_count int;
  v_delivery deliveries;
  v_is_driver boolean;
  v_is_verified boolean;
  v_driver_lat double precision;
  v_driver_lng double precision;
  v_distance_km double precision;
BEGIN
  -- Ensure authenticated
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure user is a driver
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = v_driver_id
      AND role = 'driver'
  )
  INTO v_is_driver;

  IF NOT v_is_driver THEN
    RAISE EXCEPTION 'Only drivers can accept deliveries';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM driver_verification
    WHERE user_id = v_driver_id
      AND verification_status = 'approved'
  )
  INTO v_is_verified;

  IF NOT v_is_verified THEN
    RAISE EXCEPTION 'You need to be verified before accepting deliveries';
  END IF;

  -- Ensure driver has no active delivery
  SELECT count(*) INTO v_active_count
  FROM deliveries
  WHERE driver_id = v_driver_id
    AND status IN ('accepted', 'picking_up', 'in_transit');

  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'You already have an active delivery, Deliver that first';
  END IF;

  -- Lock delivery row
  SELECT *
  INTO v_delivery
  FROM deliveries
  WHERE id = p_delivery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;


  IF v_delivery.status <> 'pending' THEN
    RAISE EXCEPTION 'Delivery unavailable';
  END IF;

  IF v_delivery.driver_id IS NOT NULL THEN
    RAISE EXCEPTION 'Delivery already taken by another driver';
  END IF;

  IF v_driver_id = ANY(COALESCE(v_delivery.declined_driver_ids, '{}')) THEN
    RAISE EXCEPTION 'You already declined this delivery';
  END IF;

  -- Get driver current location
  SELECT current_lat, current_lng
  INTO v_driver_lat, v_driver_lng
  FROM driver_vehicles
  WHERE user_id = v_driver_id
    AND is_online = true;

  IF v_driver_lat IS NULL OR v_driver_lng IS NULL THEN
    RAISE EXCEPTION 'Your location is unavailable';
  END IF;

  -- Calculate distance (km)
  v_distance_km := distance_calculator(
    v_driver_lat,
    v_driver_lng,
    v_delivery.pickup_lat,
    v_delivery.pickup_lng
  );

  IF v_distance_km > 5 THEN
    RAISE EXCEPTION 'You are too far from pickup location (%.2f km)', v_distance_km;
  END IF;

  -- Accept delivery
  UPDATE deliveries
  SET
    driver_id = v_driver_id,
    status = 'accepted',
    accepted_at = now()
  WHERE id = p_delivery_id
  RETURNING * INTO v_delivery;

  RETURN v_delivery;
END;
$$;