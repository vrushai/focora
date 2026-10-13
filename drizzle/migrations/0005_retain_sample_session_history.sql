GRANT INSERT ON TABLE public.focus_sessions TO authenticated;
DROP POLICY IF EXISTS "own sessions" ON public.focus_sessions;
CREATE POLICY "read own sessions" ON public.focus_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert sample sessions" ON public.focus_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND is_sample = true AND points = 0);
CREATE POLICY "delete own sessions" ON public.focus_sessions FOR DELETE TO authenticated USING (user_id = auth.uid());