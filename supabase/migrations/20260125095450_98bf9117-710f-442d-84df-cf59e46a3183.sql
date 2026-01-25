-- Add paymentIntentId column to deliveries table
ALTER TABLE public.deliveries
ADD COLUMN payment_intent_id text;