import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
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

  const all = tasks.data ?? [];
  const groups = Object.fromEntries(TABS.map((t) => [t.v, [] as Task[]])) as Record<TaskBucket, Task[]>;
  for (const t of all) {
    const b = bucketOf(t);
    (groups[b === "someday" ? "upcoming" : b] ??= []).push(t);
  }
  groups.completed.sort((a, b) => +new Date(b.completed_at!) - +new Date(a.completed_at!));
  (["today", "upcoming", "overdue"] as const).forEach((k) => groups[k].sort(sortTasks));
  const list = groups[tab];
  const cur = TABS.find((t) => t.v === tab)!;

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Plan what you need to study."
        action={<Button className="h-11 rounded-xl" onClick={() => { setEditing(null); setOpen(true); }}><Plus /> New task</Button>}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as TaskBucket)}>
        <TabsList className="grid h-11 w-full grid-cols-4 rounded-xl md:w-auto md:inline-grid">
          {TABS.map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="rounded-lg text-xs sm:text-sm">
              {t.l}{groups[t.v].length > 0 && <span className="ml-1 text-muted-foreground">{groups[t.v].length}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="mt-4 space-y-2">
        {tasks.isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : list.length === 0 ? (
          <EmptyState title={cur.empty[0]} text={cur.empty[1]} action={tab !== "completed" ? <Button className="rounded-xl" onClick={() => { setEditing(null); setOpen(true); }}><Plus /> Add task</Button> : undefined} />
        ) : (
          list.map((t) => <TaskItem key={t.id} task={t} onEdit={(x) => { setEditing(x); setOpen(true); }} />)
        )}
      </div>
      <TaskDialog open={open} onOpenChange={setOpen} task={editing} />
    </div>
  );
}
