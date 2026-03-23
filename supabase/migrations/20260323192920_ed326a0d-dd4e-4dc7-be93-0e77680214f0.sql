
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'boys_rep', 'girls_rep', 'student');
CREATE TYPE public.gender_type AS ENUM ('boy', 'girl');
CREATE TYPE public.target_group AS ENUM ('all', 'boys', 'girls');

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_no TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  gender gender_type NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_gender(user_id UUID)
RETURNS gender_type
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT gender FROM public.profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_rep(user_id UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND role IN ('admin', 'boys_rep', 'girls_rep'));
$$;

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  file_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  target_group target_group NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see targeted announcements" ON public.announcements FOR SELECT TO authenticated
  USING (
    target_group = 'all'
    OR (target_group = 'boys' AND public.get_user_gender(auth.uid()) = 'boy')
    OR (target_group = 'girls' AND public.get_user_gender(auth.uid()) = 'girl')
    OR public.is_admin_or_rep(auth.uid())
  );
CREATE POLICY "Admin/rep can create announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_rep(auth.uid()));

-- Announcement delivery
CREATE TABLE public.announcement_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  batch_no TEXT NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcement_delivery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/rep can view delivery" ON public.announcement_delivery FOR SELECT TO authenticated
  USING (public.is_admin_or_rep(auth.uid()));
CREATE POLICY "System can insert delivery" ON public.announcement_delivery FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_rep(auth.uid()));

-- Announcement views
CREATE TABLE public.announcement_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  batch_no TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, batch_no)
);
ALTER TABLE public.announcement_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own view" ON public.announcement_views FOR INSERT TO authenticated
  WITH CHECK (batch_no = (SELECT p.batch_no FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY "Admin/rep can view all views" ON public.announcement_views FOR SELECT TO authenticated
  USING (public.is_admin_or_rep(auth.uid()) OR batch_no = (SELECT p.batch_no FROM public.profiles p WHERE p.id = auth.uid()));

-- Polls
CREATE TABLE public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  target_group target_group NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see targeted polls" ON public.polls FOR SELECT TO authenticated
  USING (
    target_group = 'all'
    OR (target_group = 'boys' AND public.get_user_gender(auth.uid()) = 'boy')
    OR (target_group = 'girls' AND public.get_user_gender(auth.uid()) = 'girl')
    OR public.is_admin_or_rep(auth.uid())
  );
CREATE POLICY "Admin can create polls" ON public.polls FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Votes
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  batch_no TEXT NOT NULL,
  selected_option TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, batch_no)
);
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can vote once" ON public.votes FOR INSERT TO authenticated
  WITH CHECK (batch_no = (SELECT p.batch_no FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY "Admin/rep can view votes" ON public.votes FOR SELECT TO authenticated
  USING (public.is_admin_or_rep(auth.uid()) OR batch_no = (SELECT p.batch_no FROM public.profiles p WHERE p.id = auth.uid()));

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_batch_no TEXT NOT NULL,
  receiver_batch_no TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own messages" ON public.messages FOR SELECT TO authenticated
  USING (
    sender_batch_no = (SELECT p.batch_no FROM public.profiles p WHERE p.id = auth.uid())
    OR receiver_batch_no = (SELECT p.batch_no FROM public.profiles p WHERE p.id = auth.uid())
  );
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_batch_no = (SELECT p.batch_no FROM public.profiles p WHERE p.id = auth.uid()));

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_batch_no TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL,
  reference_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_batch_no = (SELECT p.batch_no FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_batch_no = (SELECT p.batch_no FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);
CREATE POLICY "Anyone can view uploads" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'uploads');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
