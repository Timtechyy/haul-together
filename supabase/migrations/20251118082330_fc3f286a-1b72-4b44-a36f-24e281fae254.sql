-- Rename stripe_customer_id to stripe_id in profiles table
ALTER TABLE public.profiles 
RENAME COLUMN stripe_customer_id TO stripe_id;