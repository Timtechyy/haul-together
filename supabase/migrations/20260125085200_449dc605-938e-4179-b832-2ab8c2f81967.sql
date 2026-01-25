-- Add transfer_id column to track Stripe transfer for driver payouts
ALTER TABLE public.deliveries ADD COLUMN transfer_id text;