-- Add stripe_connect_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN stripe_connect_id text;