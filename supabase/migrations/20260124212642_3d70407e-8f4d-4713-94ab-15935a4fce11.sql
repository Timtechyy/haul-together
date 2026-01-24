CREATE OR REPLACE FUNCTION public.cancel_delivery(
  p_delivery_id uuid,
  p_driver_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_delivery record;
BEGIN
  -- Ensure authenticated user matches driver
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() <> p_driver_id THEN
    RAISE EXCEPTION 'Unauthorized: driver mismatch';
  END IF;

  -- Fetch delivery
  SELECT *
  INTO v_delivery
  FROM deliveries
  WHERE id = p_delivery_id
    AND driver_id = p_driver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found or not owned by driver';
  END IF;

  -- Ensure delivery can be cancelled
  IF v_delivery.status NOT IN ('in_transit', 'delivered') THEN
    RAISE EXCEPTION 'Delivery cannot be cancelled at this stage';
  END IF;

  -- Cancel delivery
  UPDATE deliveries
  SET
    status = 'cancelled',
    cancelled_at = now()
  WHERE id = p_delivery_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Delivery request cancelled successfully'
  );
END;
$$;