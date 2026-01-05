-- Remove columns from driver_verifications
ALTER TABLE public.driver_verifications 
  DROP COLUMN first_name,
  DROP COLUMN last_name,
  DROP COLUMN date_of_birth,
  DROP COLUMN ssn_last_four,
  DROP COLUMN license_number,
  DROP COLUMN license_state,
  DROP COLUMN license_front_url,
  DROP COLUMN license_back_url;

-- Rename id to session_id
ALTER TABLE public.driver_verifications RENAME COLUMN id TO session_id;

-- Rename created_at to submitted_at
ALTER TABLE public.driver_verifications RENAME COLUMN created_at TO submitted_at;