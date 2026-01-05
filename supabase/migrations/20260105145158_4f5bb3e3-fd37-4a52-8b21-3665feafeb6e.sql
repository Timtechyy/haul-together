-- Drop existing constraint and recreate with resubmit
ALTER TABLE public.driver_verifications
DROP CONSTRAINT IF EXISTS driver_verifications_verification_status_check;

ALTER TABLE public.driver_verifications
DROP CONSTRAINT IF EXISTS driver_verifications_status_check;

ALTER TABLE public.driver_verifications
ADD CONSTRAINT driver_verifications_verification_status_check 
CHECK (verification_status IN ('pending', 'approved', 'rejected', 'resubmit'));