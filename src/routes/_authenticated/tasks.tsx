import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, GripVertical, Plus, Search } from "lucide-react";
import { SortableTaskList, byManualOrder } from "@/components/SortableTasks";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, EmptyState } from "@/components/Shell";
import { TaskItem, TaskDialog } from "@/components/tasks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTasks, type Task } from "@/lib/data";
import { bucketOf, sortTasks, type TaskBucket } from "@/lib/stats";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — FocusStudy" },
      { name: "description", content: "Organise study tasks by today, upcoming, overdue and completed." },
      { property: "og:title", content: "Tasks — FocusStudy" },
      { property: "og:description", content: "Organise study tasks by today, upcoming, overdue and completed." },
    ],
  }),
  component: TasksPage,
});

const TABS: { v: TaskBucket; l: string; empty: [string, string] }[] = [
  { v: "today", l: "Today", empty: ["Your schedule is clear 🎉", "Add your first study task."] },
  { v: "upcoming", l: "Upcoming", empty: ["Nothing coming up", "Plan ahead by adding tasks with future due dates."] },
  { v: "overdue", l: "Overdue", empty: ["You're all caught up", "No overdue tasks. Nice work."] },
  { v: "completed", l: "Completed", empty: ["No completed tasks yet", "Tick off a task to see it here."] },
];

function TasksPage() {
  const tasks = useTasks();
  const [tab, setTab] = useState<TaskBucket>("today");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("all");

  const raw = tasks.data ?? [];
  const subjects = Array.from(new Set(raw.map((t) => t.subject))).sort();
  const s = q.toLowerCase();
  const all = raw.filter((t) => (subject === "all" || t.subject === subject) && (!s || `${t.title} ${t.subject} ${t.description} ${t.notes}`.toLowerCase().includes(s)));
  const groups = Object.fromEntries(TABS.map((t) => [t.v, [] as Task[]])) as Record<TaskBucket, Task[]>;
  for (const t of all) {
    const b = bucketOf(t);
    (groups[b === "someday" ? "upcoming" : b] ??= []).push(t);
  }
  groups.completed.sort((a, b) => +new Date(b.completed_at!) - +new Date(a.completed_at!));
  (["today", "upcoming", "overdue"] as const).forEach((k) => groups[k].sort(byManualOrder(sortTasks)));
  const list = groups[tab];
  const cur = TABS.find((t) => t.v === tab)!;
  const pending = raw.filter((t) => !t.completed_at);
  const todayMin = groups.today.reduce((a, t) => a + t.duration_min, 0);
  const edit = (x: Task) => { setEditing(x); setOpen(true); };
  const showOverdueBlock = tab === "today" && groups.overdue.length > 0;

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={`${pending.length} open · ${groups.overdue.length} overdue · ${todayMin} min planned today`}
        action={<Button className="h-11 rounded-xl" onClick={() => { setEditing(null); setOpen(true); }}><Plus /> New task</Button>}
      />
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks" className="h-11 pl-9" />
        </div>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="h-11 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as TaskBucket)}>
        <TabsList className="grid h-11 w-full grid-cols-4 rounded-xl md:w-auto md:inline-grid">
          {TABS.map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="rounded-lg text-xs sm:text-sm">
              {t.l}{groups[t.v].length > 0 && <span className={t.v === "overdue" ? "ml-1 text-destructive" : "ml-1 text-muted-foreground"}>{groups[t.v].length}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {showOverdueBlock && (
        <section className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-destructive"><AlertTriangle className="size-4" /> Overdue · {groups.overdue.length}</p>
            <button className="text-xs font-medium text-destructive underline-offset-2 hover:underline" onClick={() => setTab("overdue")}>See all</button>
          </div>
          <SortableTaskList tasks={groups.overdue} onEdit={edit} />
        </section>
      )}

      {tab !== "completed" && list.length > 1 && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"><GripVertical className="size-3.5" /> Drag tasks to set your own priority order</p>
      )}
      <div className="mt-3 space-y-2">
        {showOverdueBlock && <p className="px-1 pt-1 text-sm font-semibold">Today</p>}
        {tasks.isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : list.length === 0 ? (
          <EmptyState title={cur.empty[0]} text={cur.empty[1]} action={tab !== "completed" ? <Button className="rounded-xl" onClick={() => { setEditing(null); setOpen(true); }}><Plus /> Add task</Button> : undefined} />
        ) : tab === "completed" ? (
          list.map((t) => <TaskItem key={t.id} task={t} onEdit={edit} />)
        ) : (
          <SortableTaskList tasks={list} onEdit={edit} />
        )}
      </div>
      <TaskDialog open={open} onOpenChange={setOpen} task={editing} />
    </div>
  );
}
