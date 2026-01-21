ALTER TABLE driver_verifications
ADD CONSTRAINT fk_driver_verification
FOREIGN KEY (user_id)
REFERENCES profiles(id);