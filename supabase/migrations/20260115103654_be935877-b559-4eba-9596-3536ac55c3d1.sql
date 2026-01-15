CREATE OR REPLACE FUNCTION public.accept_delivery(
  p_delivery_id uuid,
  p_driver_id uuid
)
RETURNS deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count int;
  result deliveries;
BEGIN
  -- Lock driver state
  SELECT count(*) INTO active_count
  FROM deliveries
  WHERE driver_id = p_driver_id
    AND status IN ('accepted', 'in_progress');

  IF active_count > 0 THEN
    RAISE EXCEPTION 'Driver already has an active delivery';
  END IF;

  -- Accept delivery if still pending
  UPDATE deliveries
  SET
    driver_id = p_driver_id,
    status = 'accepted',
    accepted_at = now()
  WHERE id = p_delivery_id
    AND status = 'pending'
    AND driver_id IS NULL
  RETURNING * INTO result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery already taken';
  END IF;

  RETURN result;
END;
$$;