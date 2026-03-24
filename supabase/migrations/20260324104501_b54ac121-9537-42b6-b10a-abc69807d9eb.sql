
-- Add deadline and is_closed to polls
ALTER TABLE public.polls ADD COLUMN deadline timestamptz DEFAULT NULL;
ALTER TABLE public.polls ADD COLUMN is_closed boolean NOT NULL DEFAULT false;

-- Add is_deleted to profiles
ALTER TABLE public.profiles ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;

-- Add unique constraint on votes (poll_id, batch_no)
ALTER TABLE public.votes ADD CONSTRAINT votes_poll_batch_unique UNIQUE (poll_id, batch_no);

-- RLS: Allow admin to update profiles (for soft delete)
CREATE POLICY "Admin can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::app_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::app_role);

-- RLS: Reps can update profiles of their gender
CREATE POLICY "Reps can update own gender profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (
  (get_user_role(auth.uid()) = 'boys_rep'::app_role AND gender = 'boy'::gender_type)
  OR
  (get_user_role(auth.uid()) = 'girls_rep'::app_role AND gender = 'girl'::gender_type)
)
WITH CHECK (
  (get_user_role(auth.uid()) = 'boys_rep'::app_role AND gender = 'boy'::gender_type)
  OR
  (get_user_role(auth.uid()) = 'girls_rep'::app_role AND gender = 'girl'::gender_type)
);

-- Allow admin to update polls (close manually)
CREATE POLICY "Admin can update polls"
ON public.polls FOR UPDATE TO authenticated
USING (get_user_role(auth.uid()) = 'admin'::app_role)
WITH CHECK (get_user_role(auth.uid()) = 'admin'::app_role);
