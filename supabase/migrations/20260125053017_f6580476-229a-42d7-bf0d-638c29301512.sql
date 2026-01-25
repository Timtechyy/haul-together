-- Change driver_paid from timestamp to boolean
ALTER TABLE public.deliveries 
ALTER COLUMN driver_paid TYPE boolean 
USING CASE WHEN driver_paid IS NOT NULL THEN true ELSE false END;

-- Set default value to false
ALTER TABLE public.deliveries 
ALTER COLUMN driver_paid SET DEFAULT false;