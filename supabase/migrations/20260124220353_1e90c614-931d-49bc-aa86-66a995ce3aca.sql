CREATE OR REPLACE FUNCTION public.requeue_delivery_for_drivers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_driver_id uuid;
BEGIN
  -- Only act when delivery is cancelled & unassigned
  IF NEW.status <> 'cancelled'
     OR NEW.driver_id IS NOT NULL
     OR NEW.declined_driver_ids IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find closest available driver
  SELECT dv.user_id
  INTO v_driver_id
  FROM driver_vehicles dv
  JOIN driver_verifications dvf
    ON dvf.user_id = dv.user_id
  WHERE
    dvf.verification_status = 'approved'
    AND dv.is_online = true
    AND dv.current_lat IS NOT NULL
    AND dv.current_lng IS NOT NULL
    -- Exclude declined drivers
    AND NOT (dv.user_id = ANY(NEW.declined_driver_ids))
    -- Exclude busy drivers
    AND dv.user_id NOT IN (
      SELECT driver_id
      FROM deliveries
      WHERE status IN ('accepted', 'picking_up', 'in_transit')
        AND driver_id IS NOT NULL
    )
  ORDER BY distance_calculator(
    NEW.pickup_lat::double precision,
    NEW.pickup_lng::double precision,
    dv.current_lat::double precision,
    dv.current_lng::double precision
  )
  LIMIT 1;

  -- If no driver found, keep cancelled
  IF v_driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Reassign delivery
  UPDATE deliveries
  SET
    driver_id = v_driver_id,
    status = 'pending'
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Create trigger to fire after delivery updates
DROP TRIGGER IF EXISTS trg_requeue_delivery ON deliveries;
CREATE TRIGGER trg_requeue_delivery
  AFTER UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION requeue_delivery_for_drivers();