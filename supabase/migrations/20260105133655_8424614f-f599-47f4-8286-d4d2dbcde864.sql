-- Drop existing INSERT and UPDATE policies (only edge function should do this)
DROP POLICY IF EXISTS "Users can insert their own verification " ON public.driver_verifications;
DROP POLICY IF EXISTS "Users can update their own verification " ON public.driver_verifications;

-- Keep only the SELECT policy for users to view their own verification
-- The edge function uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS