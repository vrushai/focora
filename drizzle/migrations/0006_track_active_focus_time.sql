ALTER TABLE public.focus_sessions
  ADD COLUMN accumulated_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN paused_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_focus_session_paused(_session_id uuid, _paused boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE s public.focus_sessions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO s FROM public.focus_sessions
    WHERE id = _session_id AND user_id = auth.uid() AND finished_at IS NULL
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active focus session not found'; END IF;
  IF _paused AND s.paused_at IS NULL THEN
    UPDATE public.focus_sessions SET paused_at = clock_timestamp() WHERE id = s.id;
  ELSIF NOT _paused AND s.paused_at IS NOT NULL THEN
    UPDATE public.focus_sessions
      SET accumulated_seconds = accumulated_seconds + GREATEST(0, floor(extract(epoch FROM (clock_timestamp() - paused_at)))::integer),
          paused_at = NULL
      WHERE id = s.id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_focus_session_paused(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_focus_session_paused(uuid, boolean) TO authenticated;

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
  elapsed_seconds := s.accumulated_seconds + GREATEST(0, floor(extract(epoch FROM (COALESCE(s.paused_at, clock_timestamp()) - s.started_at)))::integer);
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
    finished_at = clock_timestamp(),
    paused_at = NULL
    WHERE id = s.id
    RETURNING * INTO s;
  RETURN s;
END;
$$;