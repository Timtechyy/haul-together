-- Create driver payout function
CREATE OR REPLACE FUNCTION public.driver_payout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_driver_account text;
BEGIN
  -- Prevent double execution
  IF NEW.driver_paid = true THEN
    RETURN NEW;
  END IF;

  -- Strict conditions
  IF
    NEW.status = 'delivered'
    AND NEW.driver_confirmed_at IS NOT NULL
    AND NEW.customer_confirmed_at IS NOT NULL
    AND NEW.delivered_at IS NOT NULL
    AND NEW.driver_paid = false
  THEN
    SELECT stripe_connect_id
    INTO v_driver_account
    FROM profiles
    WHERE id = NEW.driver_id;

    IF v_driver_account IS NULL THEN
      RAISE EXCEPTION 'Driver Stripe account missing';
    END IF;

    PERFORM net.http_post(
      url := current_setting('app.edge_url') || '/create-transfer',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'delivery_id', NEW.id,
        'destination', v_driver_account
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger with conditions in WHEN clause
CREATE TRIGGER auto_driver_payout
AFTER UPDATE ON public.deliveries
FOR EACH ROW
WHEN (
  NEW.status = 'delivered'
  AND NEW.driver_confirmed_at IS NOT NULL
  AND NEW.customer_confirmed_at IS NOT NULL
  AND NEW.delivered_at IS NOT NULL
  AND NEW.driver_paid = false
)
EXECUTE FUNCTION public.driver_payout();