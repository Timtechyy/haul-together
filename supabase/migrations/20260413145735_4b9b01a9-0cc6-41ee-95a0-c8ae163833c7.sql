DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;