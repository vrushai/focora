REVOKE UPDATE ON TABLE public.group_members FROM authenticated;
GRANT UPDATE (display_name, status, status_at) ON TABLE public.group_members TO authenticated;

REVOKE UPDATE ON TABLE public.study_groups FROM authenticated;
GRANT UPDATE (name, goal) ON TABLE public.study_groups TO authenticated;

DROP POLICY IF EXISTS "self update" ON public.group_members;
CREATE POLICY "self update member details" ON public.group_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "members update groups" ON public.study_groups;
CREATE POLICY "members update group details" ON public.study_groups
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_group_member(id, auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_group_member(id, auth.uid()));