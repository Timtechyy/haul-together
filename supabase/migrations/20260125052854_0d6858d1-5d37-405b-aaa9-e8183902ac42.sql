-- Rename completed_at column to driver_paid
ALTER TABLE public.deliveries 
RENAME COLUMN completed_at TO driver_paid;