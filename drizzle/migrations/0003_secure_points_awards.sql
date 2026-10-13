ALTER TABLE public.focus_sessions ADD COLUMN finished_at timestamptz;

CREATE TABLE public.points_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('task', 'focus_session')),
  source_id uuid NOT NULL,
  points integer NOT NULL CHECK (points > 0),
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id)
);
REVOKE ALL ON TABLE public.points_awards FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.points_awards TO service_role;
ALTER TABLE public.points_awards ENABLE ROW LEVEL SECURITY;

REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (name, grade, subjects, study_hours, daily_goal_min, reminder_style, problem, onboarded, focus_preset, custom_focus_min, reminders_enabled, leave_warning) ON TABLE public.profiles TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.focus_sessions FROM authenticated;
GRANT SELECT ON TABLE public.focus_sessions TO authenticated;

CREATE OR REPLACE FUNCTION public.award_task_completion_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE awarded_id uuid;
BEGIN
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
    INSERT INTO public.points_awards (user_id, source_type, source_id, points)
    VALUES (NEW.user_id, 'task', NEW.id, 10)
    ON CONFLICT (source_type, source_id) DO NOTHING
    RETURNING id INTO awarded_id;
    IF awarded_id IS NOT NULL THEN
      UPDATE public.profiles SET points = points + 10 WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.award_task_completion_points() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER award_task_completion_points
AFTER UPDATE OF completed_at ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.award_task_completion_points();

CREATE OR REPLACE FUNCTION public.start_focus_session(_task_id uuid, _subject text, _planned_min integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE session_id uuid;
DECLARE session_subject text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _planned_min < 1 OR _planned_min > 240 THEN RAISE EXCEPTION 'Focus duration must be between 1 and 240 minutes'; END IF;
  IF _task_id IS NOT NULL THEN
    SELECT subject INTO session_subject FROM public.tasks
      WHERE id = _task_id AND user_id = auth.uid() AND completed_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Task is unavailable'; END IF;
  ELSE
    session_subject := COALESCE(NULLIF(left(trim(_subject), 120), ''), 'General');
  END IF;
  INSERT INTO public.focus_sessions (user_id, task_id, subject, planned_min, started_at)
    VALUES (auth.uid(), _task_id, session_subject, _planned_min, clock_timestamp())
    RETURNING id INTO session_id;
  RETURN session_id;
END;
$$;
REVOKE ALL ON FUNCTION public.start_focus_session(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_focus_session(uuid, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.extend_focus_session(_session_id uuid, _extra_min integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE new_planned integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _extra_min < 1 OR _extra_min > 5 THEN RAISE EXCEPTION 'Extension must be between 1 and 5 minutes'; END IF;
  UPDATE public.focus_sessions
    SET planned_min = planned_min + _extra_min
    WHERE id = _session_id AND user_id = auth.uid() AND finished_at IS NULL
      AND planned_min + _extra_min <= 240
    RETURNING planned_min INTO new_planned;
  IF new_planned IS NULL THEN RAISE EXCEPTION 'Focus session cannot be extended'; END IF;
  RETURN new_planned;
END;
$$;
REVOKE ALL ON FUNCTION public.extend_focus_session(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extend_focus_session(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.finish_focus_session(_session_id uuid, _completed boolean)
RETURNS public.focus_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE s public.focus_sessions%ROWTYPE;
DECLARE elapsed_seconds integer;
DECLARE did_complete boolean;
DECLARE awarded_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO s FROM public.focus_sessions
    WHERE id = _session_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Focus session not found'; END IF;
  IF s.finished_at IS NOT NULL THEN RETURN s; END IF;
  elapsed_seconds := GREATEST(0, floor(extract(epoch FROM (clock_timestamp() - s.started_at)))::integer);
  did_complete := COALESCE(_completed, false) AND elapsed_seconds >= s.planned_min * 60;
  IF did_complete THEN
    INSERT INTO public.points_awards (user_id, source_type, source_id, points)
    VALUES (auth.uid(), 'focus_session', s.id, 20)
    ON CONFLICT (source_type, source_id) DO NOTHING
    RETURNING id INTO awarded_id;
    IF awarded_id IS NOT NULL THEN
      UPDATE public.profiles SET points = points + 20 WHERE id = auth.uid();
    END IF;
  END IF;
  UPDATE public.focus_sessions SET
    actual_min = floor(elapsed_seconds / 60.0)::integer,
    completed = did_complete,
    points = CASE WHEN did_complete THEN 20 ELSE 0 END,
    finished_at = clock_timestamp()
    WHERE id = s.id
    RETURNING * INTO s;
  RETURN s;
END;
$$;
REVOKE ALL ON FUNCTION public.finish_focus_session(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_focus_session(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.reset_own_points()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.profiles SET points = 0 WHERE id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.reset_own_points() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_own_points() TO authenticated;