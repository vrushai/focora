import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Flame, Play, Plus, Sparkles, GraduationCap, Users, CheckCircle2, Clock, Target } from "lucide-react";
import { Shell, EmptyState } from "@/components/Shell";
import { TaskItem, TaskDialog } from "@/components/tasks";
import { Ring } from "@/components/Ring";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useExams, useProfile, useSessions, useTasks } from "@/lib/data";
import { bucketOf, daysUntil, fmtMin, greeting, levelFor, sortTasks, streak, studiedOn } from "@/lib/stats";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "FocusStudy — Your study dashboard" },
      { name: "description", content: "See today's priorities, start a distraction-free focus session and track your study streak." },
      { property: "og:title", content: "FocusStudy — Your study dashboard" },
      { property: "og:description", content: "See today's priorities, start focusing and track your streak." },
    ],
  }),
  component: () => (
    <Shell>
      <Home />
    </Shell>
  ),
});

function Home() {
  const profile = useProfile().data!;
  const tasks = useTasks();
  const sessions = useSessions();
  const exams = useExams();
  const [open, setOpen] = useState(false);

  const s = sessions.data ?? [];
  const done = studiedOn(s, new Date());
  const goal = profile.daily_goal_min;
  const today = (tasks.data ?? [])
    .filter((t) => ["today", "overdue"].includes(bucketOf(t)) || (t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString()))
    .sort((a, b) => Number(!!a.completed_at) - Number(!!b.completed_at) || sortTasks(a, b))
    .slice(0, 5);
  const nextTask = today.find((t) => !t.completed_at);
  const st = streak(s);
  const lvl = levelFor(profile.points);
  const totalMin = s.reduce((a, x) => a + x.actual_min, 0);
  const completedTasks = (tasks.data ?? []).filter((t) => t.completed_at).length;
  const upcomingExams = (exams.data ?? []).filter((e) => daysUntil(e.exam_date) >= 0).slice(0, 2);

  const tip: Record<string, string> = {
    "I get distracted easily": "Tip: turn on the Focus Shield before each session.",
    "I procrastinate": "Tip: start with just one 25-minute session. Momentum follows.",
    "I forget tasks": "Tip: add reminders to your tasks so nothing slips.",
    "I cannot stay consistent": "Tip: a short session every day keeps your streak alive.",
    "I don't know what to study first": "Tip: let Plan My Day order your tasks for you.",
    "I spend too much time on my phone": "Tip: put your phone in another room while focusing.",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{greeting()}, {profile.name.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tip[profile.problem] ?? "One task. One session. Stay focused."}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <section className="card-surface flex items-center gap-5 p-5 md:col-span-3">
          <Ring pct={(done / goal) * 100}>
            <div>
              <p className="font-display text-2xl font-semibold tabular">{Math.min(100, Math.round((done / goal) * 100))}%</p>
              <p className="text-[11px] text-muted-foreground">of goal</p>
            </div>
          </Ring>
          <div className="flex-1 space-y-3">
            <p className="text-sm font-semibold">Today's Focus</p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><p className="text-xs text-muted-foreground">Goal</p><p className="font-display text-lg font-semibold tabular">{fmtMin(goal)}</p></div>
              <div><p className="text-xs text-muted-foreground">Done</p><p className="font-display text-lg font-semibold tabular text-primary">{fmtMin(done)}</p></div>
              <div><p className="text-xs text-muted-foreground">Left</p><p className="font-display text-lg font-semibold tabular">{fmtMin(Math.max(0, goal - done))}</p></div>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-between gap-4 rounded-2xl bg-primary p-5 text-primary-foreground md:col-span-2">
          <div>
            <p className="text-sm opacity-80">Up next</p>
            <p className="mt-1 font-display text-lg font-semibold leading-snug">
              {nextTask ? `${nextTask.subject} — ${nextTask.title}` : "Free study session"}
            </p>
          </div>
          <Button asChild size="lg" variant="secondary" className="h-14 rounded-xl text-base font-semibold">
            <Link to="/focus" search={{ task: nextTask?.id }}><Play className="fill-current" /> Start Focus Session</Link>
          </Button>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<Flame className="size-4 text-streak" />} label="Focus streak" value={`${st} day${st === 1 ? "" : "s"}`} />
        <Stat icon={<Clock className="size-4 text-primary" />} label="Total study" value={fmtMin(totalMin)} />
        <Stat icon={<Target className="size-4 text-primary" />} label="Sessions" value={String(s.filter((x) => x.completed).length)} />
        <Stat icon={<CheckCircle2 className="size-4 text-success" />} label="Tasks done" value={String(completedTasks)} />
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <section className="md:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today's tasks</h2>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setOpen(true)}><Plus /> Add</Button>
          </div>
          {tasks.isLoading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
          ) : today.length === 0 ? (
            <EmptyState title="Your schedule is clear 🎉" text="Add your first study task." action={<Button className="rounded-xl" onClick={() => setOpen(true)}><Plus /> Add task</Button>} />
          ) : (
            <div className="space-y-2">{today.map((t) => <TaskItem key={t.id} task={t} compact />)}</div>
          )}
          <Link to="/tasks" className="mt-3 inline-block text-sm font-medium text-primary">View all tasks →</Link>
        </section>

        <aside className="space-y-4 md:col-span-2">
          <div className="card-surface p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Level {lvl.level} — {lvl.name}</span>
              <span className="text-muted-foreground tabular">{profile.points} pts</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${lvl.pct}%` }} /></div>
            {lvl.next && <p className="mt-2 text-xs text-muted-foreground">{lvl.next.min - profile.points} pts to {lvl.next.name}</p>}
          </div>

          <div className="card-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Upcoming exams</p>
              <Link to="/exams" className="text-xs font-medium text-primary">Manage</Link>
            </div>
            {upcomingExams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No exams added yet.</p>
            ) : (
              <div className="space-y-3">
                {upcomingExams.map((e) => (
                  <div key={e.id}>
                    <div className="flex justify-between text-sm"><span className="font-medium">{e.name}</span><span className="text-muted-foreground">{daysUntil(e.exam_date)}d left</span></div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${e.progress}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <QuickLink to="/planner" icon={<Sparkles className="size-5" />} label="Plan day" />
            <QuickLink to="/exams" icon={<GraduationCap className="size-5" />} label="Exams" />
            <QuickLink to="/groups" icon={<Users className="size-5" />} label="Groups" />
          </div>
        </aside>
      </div>
      <TaskDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="mt-1.5 font-display text-xl font-semibold tabular">{value}</p>
    </div>
  );
}

function QuickLink({ to, icon, label }: { to: "/planner" | "/exams" | "/groups"; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="card-surface flex flex-col items-center gap-1.5 py-4 text-xs font-medium hover:bg-muted">
      <span className="text-primary">{icon}</span>{label}
    </Link>
  );
}
