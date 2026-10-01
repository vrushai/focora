import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Coffee, Sparkles, CalendarPlus, Play } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useExams, useProfile, useTaskMutations, useTasks, type Task } from "@/lib/data";
import { daysUntil, fmtMin } from "@/lib/stats";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [{ title: "Plan My Study Day — FocusStudy" }, { name: "description", content: "Build a realistic study schedule with breaks from your tasks and exams." }, { property: "og:title", content: "Plan My Study Day — FocusStudy" }, { property: "og:description", content: "Build a realistic study schedule with breaks from your tasks and exams." }] }),
  component: PlannerPage,
});

type Block = { start: Date; end: Date; kind: "study" | "break"; label: string; subject?: string; taskId?: string };
const PRI: Record<string, number> = { high: 3, medium: 2, low: 1 };
const pad = (n: number) => String(n).padStart(2, "0");

function PlannerPage() {
  const profile = useProfile().data!;
  const tasks = (useTasks().data ?? []).filter((t) => !t.completed_at);
  const exams = useExams().data ?? [];
  const { create } = useTaskMutations();
  const now = new Date();
  const [start, setStart] = useState(`${pad(Math.min(23, now.getHours() + 1))}:00`);
  const [hours, setHours] = useState(Math.max(1, Math.round(profile.daily_goal_min / 60)));
  const [picked, setPicked] = useState<Set<string>>(() => new Set(tasks.slice(0, 6).map((t) => t.id)));
  const [extra, setExtra] = useState<Set<string>>(new Set());
  const [plan, setPlan] = useState<Block[] | null>(null);

  const examSoon = useMemo(() => {
    const m = new Map<string, number>();
    exams.forEach((e) => { const d = daysUntil(e.exam_date); if (d >= 0 && d <= 21) m.set(e.subject, Math.min(m.get(e.subject) ?? 99, d)); });
    return m;
  }, [exams]);

  const score = (t: Task) => {
    let s = (PRI[t.priority] ?? 2) * 10;
    if (t.due_at) { const h = (+new Date(t.due_at) - Date.now()) / 3600000; s += h < 0 ? 30 : h < 24 ? 20 : h < 72 ? 10 : 0; }
    const ex = examSoon.get(t.subject); if (ex != null) s += 25 - ex;
    return s;
  };

  const generate = () => {
    const [h, m] = start.split(":").map(Number);
    let cur = new Date(); cur.setHours(h!, m!, 0, 0);
    const budget = Math.round(hours * 60);
    let used = 0, sinceLong = 0;
    const items: { label: string; subject: string; min: number; taskId?: string }[] = tasks
      .filter((t) => picked.has(t.id)).sort((a, b) => score(b) - score(a))
      .map((t) => ({ label: t.title, subject: t.subject, min: t.duration_min, taskId: t.id }));
    extra.forEach((s) => items.push({ label: `${s} revision${examSoon.has(s) ? " (exam soon)" : ""}`, subject: s, min: 30 }));
    if (!items.length) return toast.error("Pick at least one task or subject.");
    const out: Block[] = [];
    for (const it of items) {
      let remaining = it.min;
      while (remaining > 0 && used < budget) {
        const len = Math.min(remaining, 45, budget - used);
        if (len < 10) break;
        const end = new Date(+cur + len * 60000);
        out.push({ start: cur, end, kind: "study", label: it.label, subject: it.subject, taskId: it.taskId });
        cur = end; used += len; remaining -= len; sinceLong += len;
        if (used >= budget) break;
        const br = sinceLong >= 90 ? 20 : 10;
        if (br === 20) sinceLong = 0;
        const bEnd = new Date(+cur + br * 60000);
        out.push({ start: cur, end: bEnd, kind: "break", label: br === 20 ? "Long break — stretch & water" : "Short break" });
        cur = bEnd;
      }
      if (used >= budget) break;
    }
    if (out.at(-1)?.kind === "break") out.pop();
    setPlan(out);
  };

  const save = async () => {
    if (!plan) return;
    for (const b of plan.filter((x) => x.kind === "study" && !x.taskId)) {
      await create.mutateAsync({ title: b.label, subject: b.subject!, due_at: b.end.toISOString(), duration_min: Math.round((+b.end - +b.start) / 60000), reminder_min: 5, priority: "medium" });
    }
    toast.success("Revision blocks added to your tasks with reminders.");
  };

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, k: string) => { const n = new Set(set); n.has(k) ? n.delete(k) : n.add(k); setter(n); };
  const studyMin = plan?.filter((b) => b.kind === "study").reduce((a, b) => a + (+b.end - +b.start) / 60000, 0) ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Plan My Study Day" subtitle="A realistic schedule with breaks built in." />
      <div className="space-y-4 rounded-2xl border bg-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label htmlFor="p-start">Start at</Label><Input id="p-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-11" /></div>
          <div className="space-y-1.5"><Label htmlFor="p-h">Available hours</Label><Input id="p-h" type="number" min={0.5} max={10} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="h-11" /></div>
        </div>
        <div>
          <Label>Tasks to include</Label>
          {tasks.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">No open tasks — add subjects below for revision.</p> : (
            <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
              {[...tasks].sort((a, b) => score(b) - score(a)).map((t) => (
                <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-xl border p-2.5">
                  <Checkbox checked={picked.has(t.id)} onCheckedChange={() => toggle(picked, setPicked, t.id)} />
                  <span className="min-w-0 flex-1 truncate text-sm"><span className="text-muted-foreground">{t.subject} · </span>{t.title}</span>
                  <span className="shrink-0 text-xs capitalize text-muted-foreground">{t.priority} · {t.duration_min}m</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div>
          <Label>Add subject revision (30 min each)</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(profile.subjects.length ? profile.subjects : ["General"]).map((s) => (
              <button key={s} onClick={() => toggle(extra, setExtra, s)} className={cn("rounded-full border px-3 py-1.5 text-sm", extra.has(s) ? "border-primary bg-primary text-primary-foreground" : "bg-background")}>
                {s}{examSoon.has(s) && ` · exam in ${examSoon.get(s)}d`}
              </button>
            ))}
          </div>
        </div>
        <Button className="h-12 w-full rounded-xl" onClick={generate}><Sparkles /> Create my schedule</Button>
      </div>

      {plan && (plan.length === 0 ? <EmptyState title="Not enough time" text="Increase your available hours." /> : (
        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-3 flex items-baseline justify-between"><p className="font-semibold">Your schedule</p><p className="text-sm text-muted-foreground">{fmtMin(studyMin)} study</p></div>
          <ol className="space-y-2">
            {plan.map((b, i) => (
              <li key={i} className={cn("flex items-center gap-3 rounded-xl p-3", b.kind === "break" ? "bg-muted/60 text-muted-foreground" : "border")}>
                <span className="w-28 shrink-0 text-sm font-medium tabular-nums">{format(b.start, "h:mm")}–{format(b.end, "h:mm a")}</span>
                {b.kind === "break" ? <><Coffee className="size-4" /><span className="text-sm">{b.label}</span></> : (
                  <>
                    <span className="min-w-0 flex-1 text-sm"><span className="font-semibold">{b.subject}</span> — {b.label}</span>
                    {b.taskId && <Button asChild size="icon" variant="ghost" className="size-8 rounded-full text-primary" aria-label="Focus"><Link to="/focus" search={{ task: b.taskId }}><Play className="size-4" /></Link></Button>}
                  </>
                )}
              </li>
            ))}
          </ol>
          {plan.some((b) => b.kind === "study" && !b.taskId) && <Button variant="outline" className="mt-4 w-full rounded-xl" onClick={save}><CalendarPlus /> Add revision blocks to my tasks</Button>}
        </div>
      ))}
    </div>
  );
}
