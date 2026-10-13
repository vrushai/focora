import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSessions, useTasks } from "@/lib/data";
import { streak } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/focus")({
  validateSearch: (s: Record<string, unknown>) => ({ task: typeof s["task"] === "string" ? (s["task"] as string) : undefined }),
  head: () => ({ meta: [{ title: "Focus — focora" }, { name: "description", content: "Distraction-free focus sessions." }, { property: "og:title", content: "Focus — focora" }, { property: "og:description", content: "Distraction-free focus sessions." }] }),
  component: FocusPage,
});

const PRESETS = { pomodoro: [25, 5], long: [50, 10] } as const;
const CHECKS = ["Put phone on silent", "Close unnecessary tabs", "Keep only required study material open", "Turn off unnecessary notifications"];

function FocusPage() {
  const { task: taskId } = Route.useSearch();
  const tasks = useTasks().data ?? [];
  const profile = useProfile().data!;
  const sessions = useSessions().data ?? [];
  const qc = useQueryClient();
  const [selected, setSelected] = useState(taskId ?? "");
  const [preset, setPreset] = useState<"pomodoro" | "long" | "custom">("pomodoro");
  const [custom, setCustom] = useState(profile.custom_focus_min);
  const [phase, setPhase] = useState<"setup" | "shield" | "focus" | "done">("setup");
  const [checks, setChecks] = useState<boolean[]>(CHECKS.map(() => false));
  const [left, setLeft] = useState(0);
  const [total, setTotal] = useState(0);
  const [paused, setPaused] = useState(false);
  const [away, setAway] = useState(0);
  const [result, setResult] = useState<{ min: number; pts: number } | null>(null);
  const saved = useRef(false);
  const sessionId = useRef<string | null>(null);
  const task = tasks.find((t) => t.id === selected);
  const mins = preset === "custom" ? custom : PRESETS[preset][0];

  useEffect(() => {
    if (phase !== "focus" || paused) return;
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, [phase, paused]);
  useEffect(() => { if (phase === "focus" && left === 0 && total > 0) finish(true); }, [left]); // eslint-disable-line
  useEffect(() => {
    if (phase !== "focus") return;
    const vis = () => document.hidden && setAway((a) => a + 1);
    const bu = (e: BeforeUnloadEvent) => { if (profile.leave_warning) e.preventDefault(); };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("beforeunload", bu);
    return () => { document.removeEventListener("visibilitychange", vis); window.removeEventListener("beforeunload", bu); };
  }, [phase, profile.leave_warning]);

  const start = async () => {
    const planned = mins;
    const { data: created, error } = await supabase.rpc("start_focus_session", {
      _task_id: task?.id ?? null,
      _subject: task?.subject ?? "General",
      _planned_min: planned,
    });
    if (error || !created) {
      toast.error(error?.message ?? "Could not start the focus session. Please try again.");
      return;
    }
    sessionId.current = created;
    if (preset === "custom" && custom !== profile.custom_focus_min) {
      const { error: saveError } = await supabase.from("profiles").update({ custom_focus_min: custom }).eq("id", profile.id);
      if (saveError) toast.error("Session started, but your timer preference could not be saved.");
    }
    saved.current = false; setTotal(mins * 60); setLeft(mins * 60); setPaused(false); setAway(0); setPhase("focus");
    document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const finish = async (completed: boolean) => {
    if (saved.current || !sessionId.current) return;
    saved.current = true;
    const { data: finished, error } = await supabase.rpc("finish_focus_session", {
      _session_id: sessionId.current,
      _completed: completed,
    });
    if (error || !finished) {
      saved.current = false;
      toast.error(error?.message ?? "Could not save your focus session. Please retry.");
      return;
    }
    const actual = finished.actual_min;
    const pts = finished.points;
    sessionId.current = null;
    qc.invalidateQueries({ queryKey: ["sessions"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setResult({ min: actual, pts }); setPhase(finished.completed ? "done" : "setup");
  };
  const extendByFive = async () => {
    if (!sessionId.current || total / 60 >= 240) return;
    const { error } = await supabase.rpc("extend_focus_session", {
      _session_id: sessionId.current,
      _extra_min: 5,
    });
    if (error) {
      toast.error(error.message || "Could not extend this focus session.");
      return;
    }
    setLeft((value) => value + 300);
    setTotal((value) => value + 300);
  };

  if (phase === "focus") {
    const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-focus-bg px-6 text-center text-focus-fg">
        <p className="text-sm uppercase tracking-widest opacity-60">Current task</p>
        <p className="font-display text-xl font-semibold">{task ? `${task.subject} — ${task.title}` : "Free study session"}</p>
        <p className="font-display text-7xl font-semibold tabular md:text-9xl">{mm}:{ss}</p>
        {away > 0 && <p className="text-sm opacity-70">Welcome back — you left the page {away}×. Stay with it.</p>}
        <div className="grid w-full max-w-md grid-cols-2 gap-3">
          <Button variant="secondary" className="h-12 rounded-xl" onClick={() => setPaused(!paused)}>{paused ? "Resume" : "Pause"}</Button>
          <Button variant="secondary" className="h-12 rounded-xl" onClick={extendByFive} disabled={total / 60 >= 240}>+5 minutes</Button>
          <Button className="h-12 rounded-xl" onClick={() => finish(true)}>Finish session</Button>
          <Button variant="ghost" className="h-12 rounded-xl text-focus-fg/70" onClick={() => confirm("Leave this focus session?") && finish(false)}>Emergency exit</Button>
        </div>
        <p className="text-sm opacity-60">One task. One session. Stay focused.</p>
      </div>
    );
  }

  if (phase === "done" && result) {
    return (
      <div className="card-surface mx-auto max-w-md space-y-4 p-8 text-center">
        <p className="text-4xl">🎉</p>
        <h1 className="text-2xl font-semibold">Focus session completed!</h1>
        <p className="text-muted-foreground">{result.min} min studied{task ? ` · ${task.title}` : ""}</p>
        <p>🔥 {streak(sessions)} day streak · +{result.pts} Focus Points</p>
        <Button className="h-12 w-full rounded-xl" onClick={() => setPhase("setup")}>Start another session</Button>
        <Button asChild variant="outline" className="h-12 w-full rounded-xl"><Link to="/">Back home</Link></Button>
      </div>
    );
  }

  if (phase === "shield") {
    return (
      <div className="card-surface mx-auto max-w-md space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Ready to Focus?</h1>
        {CHECKS.map((c, i) => (
          <label key={c} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
            <Checkbox checked={!!checks[i]} onCheckedChange={(v) => setChecks(checks.map((x, j) => (j === i ? !!v : x)))} /> {c}
          </label>
        ))}
        <p className="text-xs text-muted-foreground">Note: a web app can't block other apps or websites on your device. Focus Shield goes full-screen, hides everything else and warns you if you leave.</p>
        <Button className="h-12 w-full rounded-xl" onClick={start}>Activate Focus Shield</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-2xl font-semibold">Start a focus session</h1>
      <select className="h-12 w-full rounded-xl border bg-card px-3" value={selected} onChange={(e) => setSelected(e.target.value)}>
        <option value="">Free study (no task)</option>
        {tasks.filter((t) => !t.completed_at).map((t) => <option key={t.id} value={t.id}>{t.subject} — {t.title}</option>)}
      </select>
      <div className="grid grid-cols-3 gap-2">
        {([["pomodoro", "Pomodoro", "25 / 5"], ["long", "Long focus", "50 / 10"], ["custom", "Custom", `${custom} min`]] as const).map(([v, l, d]) => (
          <button key={v} onClick={() => setPreset(v)} className={cn("rounded-2xl border bg-card p-3 text-left", preset === v && "border-primary ring-2 ring-primary/20")}>
            <p className="text-sm font-semibold">{l}</p><p className="text-xs text-muted-foreground">{d}</p>
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="card-surface space-y-4 p-4">
          <p className="text-sm font-semibold">Custom timer</p>
          <div className="flex items-center justify-center gap-4">
            <Button type="button" variant="outline" size="icon" className="size-12 rounded-full text-lg" aria-label="5 minutes less" onClick={() => setCustom((c) => Math.max(5, c - 5))}>−</Button>
            <div className="text-center">
              <p className="font-display text-5xl font-semibold tabular">{custom}</p>
              <p className="text-xs text-muted-foreground">minutes</p>
            </div>
            <Button type="button" variant="outline" size="icon" className="size-12 rounded-full text-lg" aria-label="5 minutes more" onClick={() => setCustom((c) => Math.min(240, c + 5))}>+</Button>
          </div>
          <input type="range" min={5} max={180} step={5} value={Math.min(custom, 180)} onChange={(e) => setCustom(Number(e.target.value))} className="w-full accent-[var(--primary)]" aria-label="Focus length" />
          <div className="flex flex-wrap justify-center gap-2">
            {[10, 15, 20, 30, 40, 45, 60, 90, 120].map((m) => (
              <button key={m} type="button" onClick={() => setCustom(m)} className={cn("rounded-full border px-3 py-1.5 text-sm tabular", custom === m ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{m}m</button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Exact minutes</span>
            <Input type="number" min={1} max={240} value={custom} onChange={(e) => setCustom(Math.min(240, Math.max(1, Number(e.target.value) || 1)))} className="h-10 w-24 text-center" />
          </div>
          <p className="text-center text-xs text-muted-foreground">Ends around {new Date(Date.now() + custom * 60000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
        </div>
      )}
      <Button size="lg" className="h-14 w-full rounded-xl text-base" onClick={() => setPhase("shield")}>▶ Start Focus</Button>
    </div>
  );
}
