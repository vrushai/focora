import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { Flame, CheckCircle2, Timer, Clock, Trophy, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { Progress } from "@/components/ui/progress";
import { useProfile, useSessions, useTasks } from "@/lib/data";
import { fmtMin, levelFor, LEVELS, streak, studiedOn } from "@/lib/stats";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Progress — FocusStudy" }, { name: "description", content: "Weekly study time, streaks, sessions and subject breakdown." }, { property: "og:title", content: "Progress — FocusStudy" }, { property: "og:description", content: "Weekly study time, streaks, sessions and subject breakdown." }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const profile = useProfile().data;
  const sessions = useSessions().data ?? [];
  const tasks = useTasks().data ?? [];
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { day: format(d, "EEE"), full: format(d, "EEEE"), min: studiedOn(sessions, d) };
  });
  const weekTotal = week.reduce((a, d) => a + d.min, 0);
  const done = sessions.filter((s) => s.actual_min > 0);
  const avg = done.length ? done.reduce((a, s) => a + s.actual_min, 0) / done.length : 0;
  const byDow = Array(7).fill(0) as number[];
  done.forEach((s) => { byDow[new Date(s.started_at).getDay()]! += s.actual_min; });
  const bestIdx = byDow.indexOf(Math.max(...byDow));
  const bestDay = done.length ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][bestIdx] : "—";
  const subj = new Map<string, number>();
  done.forEach((s) => subj.set(s.subject, (subj.get(s.subject) ?? 0) + s.actual_min));
  const subjects = [...subj.entries()].sort((a, b) => b[1] - a[1]);
  const maxSub = subjects[0]?.[1] ?? 1;
  const lvl = levelFor(profile?.points ?? 0);

  const stats = [
    { icon: CheckCircle2, l: "Tasks completed", v: String(tasks.filter((t) => t.completed_at).length) },
    { icon: Timer, l: "Focus sessions", v: String(done.length) },
    { icon: Clock, l: "Avg session", v: fmtMin(avg) },
    { icon: Flame, l: "Study streak", v: `${streak(sessions)} days` },
    { icon: CalendarDays, l: "Most productive", v: bestDay! },
    { icon: Trophy, l: "Focus Points", v: String(profile?.points ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Progress" subtitle="Small steps, every day." />
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">Weekly study time</p>
          <p className="text-sm text-muted-foreground">{fmtMin(weekTotal)} this week</p>
        </div>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={week}>
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={36} stroke="var(--muted-foreground)" tickFormatter={(v) => `${Math.round(v / 60 * 10) / 10}h`} />
              <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => [fmtMin(v), "Studied"]} labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""} />
              <Bar dataKey="min" fill="var(--primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map((s) => (
          <div key={s.l} className="rounded-2xl border bg-card p-4">
            <s.icon className="size-5 text-primary" />
            <p className="mt-2 font-display text-xl font-semibold">{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4">
          <p className="mb-3 font-semibold">Subject-wise study time</p>
          {subjects.length === 0 ? <p className="text-sm text-muted-foreground">Finish a focus session to see your subjects.</p> : (
            <div className="space-y-3">
              {subjects.map(([s, m]) => (
                <div key={s}>
                  <div className="mb-1 flex justify-between text-sm"><span>{s}</span><span className="font-medium">{fmtMin(m)}</span></div>
                  <Progress value={(m / maxSub) * 100} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="font-semibold">Level {lvl.level} — {lvl.name}</p>
          <p className="text-sm text-muted-foreground">{lvl.next ? `${lvl.next.min - (profile?.points ?? 0)} points to ${lvl.next.name}` : "Top level reached!"}</p>
          <Progress value={lvl.pct} className="mt-3 h-2" />
          <ul className="mt-4 space-y-1.5 text-sm">
            {LEVELS.map((l) => (
              <li key={l.level} className={l.level <= lvl.level ? "font-medium" : "text-muted-foreground"}>Level {l.level} — {l.name} <span className="text-muted-foreground">({l.min}+)</span></li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">Earn points: +10 per task, +20 per focus session, bonus for streaks and daily goals.</p>
        </div>
      </div>
    </div>
  );
}
