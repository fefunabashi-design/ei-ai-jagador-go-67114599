DROP POLICY IF EXISTS "Authenticated users can view any profile" ON public.profiles;
CREATE POLICY "Authenticated users can view any profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);