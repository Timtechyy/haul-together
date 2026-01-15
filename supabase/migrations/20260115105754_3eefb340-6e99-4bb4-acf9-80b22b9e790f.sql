ALTER TABLE public.deliveries
ADD COLUMN driver_confirmed_at timestamptz,
ADD COLUMN customer_confirmed_at timestamptz,
ADD COLUMN completed_at timestamptz;