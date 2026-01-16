-- Enable RLS (already enabled, but safe to run)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create public read policy for profiles
CREATE POLICY "public_read_profiles"
ON profiles
FOR SELECT
USING (true);