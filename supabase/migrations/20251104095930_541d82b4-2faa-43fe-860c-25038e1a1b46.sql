-- Add stripe_customer_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN stripe_customer_id TEXT;

-- Create index for faster lookups
CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);