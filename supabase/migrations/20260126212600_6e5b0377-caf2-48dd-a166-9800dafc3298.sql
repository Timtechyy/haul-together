DROP FUNCTION IF EXISTS public.cancel_delivery(uuid, uuid);

CREATE OR REPLACE FUNCTION public.cancel_delivery(
  delivery_id uuid,
  driver_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure driver owns the request
  IF auth.uid() <> driver_id THEN
    RAISE EXCEPTION 'Unauthorized: driver mismatch';
  END IF;

  -- Fetch delivery status
  SELECT status
  INTO v_status
  FROM deliveries
  WHERE id = delivery_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found or not owned by driver';
  END IF;

  -- Ensure delivery can be cancelled
  IF v_status NOT IN ('in_transit', 'delivered') THEN
    RAISE EXCEPTION 'Delivery cannot be cancelled at this stage';
  END IF;

  -- Cancel delivery: add driver to declined list and unassign
  UPDATE deliveries
  SET
    status = 'cancelled',
    declined_driver_ids = array_append(
      COALESCE(declined_driver_ids, '{}'),
      driver_id
    ),
    driver_id = NULL
  WHERE id = delivery_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Delivery request cancelled successfully'
  );
END;
$$;