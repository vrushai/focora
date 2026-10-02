CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  display_name text NOT NULL DEFAULT 'Student',
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.group_messages TO authenticated;
GRANT ALL ON public.group_messages TO service_role;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read messages" ON public.group_messages FOR SELECT TO authenticated USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "members send messages" ON public.group_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_group_member(group_id, auth.uid()));
CREATE POLICY "delete own messages" ON public.group_messages FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX group_messages_group_idx ON public.group_messages(group_id, created_at);

ALTER TABLE public.group_tasks ADD COLUMN due_date date;
ALTER TABLE public.group_tasks ADD COLUMN assigned_to uuid;
ALTER TABLE public.group_tasks ADD COLUMN priority text NOT NULL DEFAULT 'medium';
ALTER TABLE public.tasks ADD COLUMN sort_order double precision;