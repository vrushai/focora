import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Clock, MoreHorizontal, Play, Repeat, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProfile, useTaskMutations, type Task } from "@/lib/data";
import { bucketOf } from "@/lib/stats";
import { SUBJECTS } from "./Onboarding";
import { cn } from "@/lib/utils";

export function PriorityBadge({ p }: { p: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
        p === "high" && "bg-destructive/10 text-destructive",
        p === "medium" && "bg-warning/15 text-warning",
        p === "low" && "bg-success/15 text-success",
      )}
    >
      {p}
    </span>
  );
}

export function TaskItem({ task, onEdit, compact }: { task: Task; onEdit?: (t: Task) => void; compact?: boolean }) {
  const { toggle, remove, update, create } = useTaskMutations();
  const b = bucketOf(task);
  const done = !!task.completed_at;
  const postpone = () => {
    const d = task.due_at ? new Date(task.due_at) : new Date();
    d.setDate(d.getDate() + 1);
    update.mutate({ id: task.id, due_at: d.toISOString() });
  };
  const duplicate = () => {
    const { id: _i, created_at: _c, completed_at: _d, user_id: _u, ...rest } = task;
    create.mutate({ ...rest, title: `${task.title} (copy)`, is_sample: false });
  };
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border bg-card p-3.5 transition-opacity", done && "opacity-60")}>
      <Checkbox
        checked={done}
        onCheckedChange={() => toggle.mutate(task)}
        className="mt-0.5 size-6 rounded-lg"
        aria-label={done ? "Mark incomplete" : "Mark complete"}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">
          {task.subject}
          {task.is_sample && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Demo</span>}
        </p>
        <p className={cn("font-medium leading-snug", done && "line-through")}>{task.title}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <PriorityBadge p={task.priority} />
          <span className="flex items-center gap-1"><Clock className="size-3.5" />{task.duration_min} min</span>
          {task.due_at && (
            <span className={cn(b === "overdue" && "font-medium text-destructive")}>
              Due {b === "today" || b === "overdue" && new Date(task.due_at).toDateString() === new Date().toDateString()
                ? format(new Date(task.due_at), "h:mm a")
                : format(new Date(task.due_at), "EEE d MMM, h:mm a")}
            </span>
          )}
          {!compact && task.reminder_min != null && <span className="flex items-center gap-1"><Bell className="size-3" />{task.reminder_min}m before</span>}
          {!compact && task.repeat !== "none" && <span className="flex items-center gap-1"><Repeat className="size-3" />{task.repeat}</span>}
        </div>
      </div>
      {!done && (
        <Button asChild size="icon" variant="ghost" className="size-9 shrink-0 rounded-full text-primary" aria-label="Focus on this task">
          <Link to="/focus" search={{ task: task.id }}><Play className="size-4" /></Link>
        </Button>
      )}
      {onEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="size-9 shrink-0 rounded-full" aria-label="Task options"><MoreHorizontal className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(task)}>Edit</DropdownMenuItem>
            {!done && <DropdownMenuItem onClick={postpone}>Postpone 1 day</DropdownMenuItem>}
            <DropdownMenuItem onClick={duplicate}>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => remove.mutate(task.id)}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const toDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function TaskDialog({ open, onOpenChange, task }: { open: boolean; onOpenChange: (o: boolean) => void; task?: Task | null }) {
  const { create, update } = useTaskMutations();
  const profile = useProfile();
  const subjects = Array.from(new Set([...(profile.data?.subjects ?? []), ...SUBJECTS, "General"]));
  const blank = () => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return {
      title: "", subject: profile.data?.subjects?.[0] ?? "General", description: "", priority: "medium",
      date: toDate(d), time: toTime(d), duration_min: 45, reminder: "15", repeat: "none", notes: "",
    };
  };
  const [f, setF] = useState(blank);
  useEffect(() => {
    if (!open) return;
    if (task) {
      const d = task.due_at ? new Date(task.due_at) : null;
      setF({
        title: task.title, subject: task.subject, description: task.description, priority: task.priority,
        date: d ? toDate(d) : "", time: d ? toTime(d) : "", duration_min: task.duration_min,
        reminder: task.reminder_min == null ? "none" : String(task.reminder_min), repeat: task.repeat, notes: task.notes,
      });
    } else setF(blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const due_at = f.date ? new Date(`${f.date}T${f.time || "23:59"}`).toISOString() : null;
    const payload = {
      title: f.title.trim(), subject: f.subject, description: f.description, priority: f.priority, due_at,
      duration_min: Number(f.duration_min) || 30, reminder_min: f.reminder === "none" ? null : Number(f.reminder),
      repeat: f.repeat, notes: f.notes,
    };
    if (task) await update.mutateAsync({ id: task.id, ...payload });
    else await create.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader><DialogTitle>{task ? "Edit task" : "New study task"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Task title</Label>
            <Input id="t-title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Learn Laws of Motion" className="h-11" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={f.subject} onValueChange={(v) => setF({ ...f, subject: v })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-date">Due date</Label>
              <Input id="t-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-time">Due time</Label>
              <Input id="t-time" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-dur">Duration (min)</Label>
              <Input id="t-dur" type="number" min={5} max={600} value={f.duration_min} onChange={(e) => setF({ ...f, duration_min: Number(e.target.value) })} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Reminder</Label>
              <Select value={f.reminder} onValueChange={(v) => setF({ ...f, reminder: v })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No reminder</SelectItem>
                  <SelectItem value="5">5 min before</SelectItem>
                  <SelectItem value="15">15 min before</SelectItem>
                  <SelectItem value="30">30 min before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Repeat</Label>
              <Select value={f.repeat} onValueChange={(v) => setF({ ...f, repeat: v })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea id="t-desc" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-notes">Notes</Label>
            <Textarea id="t-notes" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
          <Button type="submit" className="h-12 w-full rounded-xl" disabled={create.isPending || update.isPending}>
            {task ? "Save changes" : "Add task"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
