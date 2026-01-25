-- Update driver_payout function with hardcoded edge URL
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
      url := 'https://xetmpurtfpdgwysynnil.supabase.co/functions/v1/create-transfer',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
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