-- Add CHECK constraint for verification_status to include resubmit
ALTER TABLE public.driver_verifications
ADD CONSTRAINT driver_verifications_status_check 
CHECK (verification_status IN ('pending', 'approved', 'rejected', 'resubmit'));