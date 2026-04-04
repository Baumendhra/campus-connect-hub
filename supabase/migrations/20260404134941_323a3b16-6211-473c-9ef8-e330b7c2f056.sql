CREATE POLICY "Allow anon read profiles"
ON public.profiles
FOR SELECT
TO anon
USING (true);