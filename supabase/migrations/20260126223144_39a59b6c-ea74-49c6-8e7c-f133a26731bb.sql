DROP FUNCTION IF EXISTS public.accept_delivery(uuid, uuid);

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

  -- Ensure driver has no active delivery
  SELECT count(*) INTO v_active_count
  FROM deliveries
  WHERE driver_id = v_driver_id
    AND status IN ('accepted', 'picking_up', 'in_transit');

  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'Driver already has an active delivery';
  END IF;

  -- Lock delivery row and validate availability
  SELECT *
  INTO v_delivery
  FROM deliveries
  WHERE id = p_delivery_id
    AND status = 'pending'
    AND driver_id IS NULL
    AND NOT (v_driver_id = ANY(COALESCE(declined_driver_ids, '{}')))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery unavailable or already declined';
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