
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_rep(auth.uid()));
