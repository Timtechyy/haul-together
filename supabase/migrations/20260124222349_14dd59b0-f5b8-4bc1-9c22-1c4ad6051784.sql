-- Drop existing function
DROP FUNCTION IF EXISTS public.driver_confirm_delivery(uuid, text);

-- Create updated function with enhanced validation
CREATE OR REPLACE FUNCTION public.driver_confirm_delivery(
  p_delivery_id uuid,
  p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_driver_id uuid;
  v_current_status text;
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch delivery and lock row
  SELECT driver_id, status
  INTO v_driver_id, v_current_status
  FROM deliveries
  WHERE id = p_delivery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  -- Ensure caller is assigned driver
  IF v_driver_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You are not assigned to this delivery';
  END IF;

  -- Validate allowed statuses
  IF p_new_status NOT IN (
    'accepted',
    'picking_up',
    'in_transit',
    'delivered',
    'cancelled'
  ) THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  -- Enforce valid transitions
  IF v_current_status = 'delivered' THEN
    RAISE EXCEPTION 'Delivery already completed';
  END IF;

  UPDATE deliveries
  SET
    status = p_new_status,
    picked_up_at = CASE
      WHEN p_new_status = 'picking_up'
        AND picked_up_at IS NULL
      THEN now()
      ELSE picked_up_at
    END,
    delivered_at = CASE
      WHEN p_new_status = 'delivered'
        AND delivered_at IS NULL
      THEN now()
      ELSE delivered_at
    END,
    driver_confirmed_at = CASE
      WHEN p_new_status = 'delivered'
        AND driver_confirmed_at IS NULL
      THEN now()
      ELSE driver_confirmed_at
    END
  WHERE id = p_delivery_id;
END;
$$;