import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Plus, Users, LogOut, Target, Trash2, Play } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({ meta: [{ title: "Study Groups — FocusStudy" }, { name: "description", content: "Private study groups with shared goals, tasks and a quiet focus room." }, { property: "og:title", content: "Study Groups — FocusStudy" }, { property: "og:description", content: "Private study groups with shared goals, tasks and a quiet focus room." }] }),
  component: GroupsPage,
});

const STATUS = { focusing: { l: "Focusing", c: "bg-success" }, break: { l: "On break", c: "bg-warning" }, offline: { l: "Offline", c: "bg-muted-foreground/40" } } as const;

function GroupsPage() {
  const { user } = useAuth();
  const profile = useProfile().data;
  const qc = useQueryClient();
  const groups = useQuery({
    queryKey: ["groups", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("study_groups").select("*").order("created_at")).data ?? [],
  });
  const [sel, setSel] = useState<string | null>(null);
  const [open, setOpen] = useState<"create" | "join" | null>(null);
  const [name, setName] = useState(""); const [goal, setGoal] = useState(""); const [code, setCode] = useState("");
  const active = groups.data?.find((g) => g.id === sel) ?? groups.data?.[0];

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from("study_groups").insert({ name: name.trim(), goal: goal.trim() }).select().single();
    if (error || !data) return toast.error(error?.message ?? "Could not create group");
    await supabase.from("group_members").insert({ group_id: data.id, display_name: profile?.name || "Student" });
    qc.invalidateQueries({ queryKey: ["groups"] }); setSel(data.id); setOpen(null); setName(""); setGoal("");
  };
  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.rpc("join_group_by_code", { _code: code, _name: profile?.name || "Student" });
    if (error) return toast.error("That invite code doesn't match a group.");
    qc.invalidateQueries({ queryKey: ["groups"] }); setSel(data as string); setOpen(null); setCode("");
    toast.success("Joined the group");
  };

  return (
    <div>
      <PageHeader title="Study Groups" subtitle="Study together, quietly." action={
        <div className="flex gap-2"><Button variant="outline" className="h-11 rounded-xl" onClick={() => setOpen("join")}>Join</Button><Button className="h-11 rounded-xl" onClick={() => setOpen("create")}><Plus /> New group</Button></div>
      } />
      {!groups.data?.length ? (
        <EmptyState title="No study groups yet" text="Create a private group or join one with an invite code." action={<Button className="rounded-xl" onClick={() => setOpen("create")}><Plus /> Create group</Button>} />
      ) : (
        <>
          {groups.data.length > 1 && (
            <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
              {groups.data.map((g) => <button key={g.id} onClick={() => setSel(g.id)} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", active?.id === g.id ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{g.name}</button>)}
            </div>
          )}
          {active && <GroupView key={active.id} group={active} onLeft={() => { setSel(null); qc.invalidateQueries({ queryKey: ["groups"] }); }} />}
        </>
      )}
      <Dialog open={open === "create"} onOpenChange={(o) => setOpen(o ? "create" : null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader><DialogTitle>New study group</DialogTitle></DialogHeader>
          <form onSubmit={createGroup} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="g-name">Group name</Label><Input id="g-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Class 9 Science Group" className="h-11" /></div>
            <div className="space-y-1.5"><Label htmlFor="g-goal">Shared study goal</Label><Input id="g-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Complete Chapter 3 revision" className="h-11" /></div>
            <Button type="submit" className="h-12 w-full rounded-xl">Create group</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={open === "join"} onOpenChange={(o) => setOpen(o ? "join" : null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader><DialogTitle>Join a group</DialogTitle></DialogHeader>
          <form onSubmit={join} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="g-code">Invite code</Label><Input id="g-code" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="AB12CD" className="h-11 font-mono tracking-widest" /></div>
            <Button type="submit" className="h-12 w-full rounded-xl">Join</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type G = { id: string; name: string; goal: string; invite_code: string; owner_id: string };

function GroupView({ group, onLeft }: { group: G; onLeft: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newTask, setNewTask] = useState("");
  const [goal, setGoal] = useState(group.goal);
  const data = useQuery({
    queryKey: ["group", group.id],
    refetchInterval: 15000,
    queryFn: async () => {
      const [m, t] = await Promise.all([
        supabase.from("group_members").select("*").eq("group_id", group.id),
        supabase.from("group_tasks").select("*").eq("group_id", group.id).order("created_at"),
      ]);
      const ids = (t.data ?? []).map((x) => x.id);
      const d = ids.length ? (await supabase.from("group_task_done").select("*").in("task_id", ids)).data ?? [] : [];
      return { members: m.data ?? [], tasks: t.data ?? [], done: d };
    },
  });
  const inv = () => qc.invalidateQueries({ queryKey: ["group", group.id] });
  const members = data.data?.members ?? [];
  const tasks = data.data?.tasks ?? [];
  const done = data.data?.done ?? [];
  const fresh = (m: { status: string; status_at: string }) => (Date.now() - +new Date(m.status_at) < 3 * 3600000 ? m.status : "offline");
  const focusing = members.filter((m) => fresh(m) === "focusing").length;
  const me = members.find((m) => m.user_id === user?.id);
  const totalPossible = tasks.length * members.length;
  const groupPct = totalPossible ? Math.round((done.length / totalPossible) * 100) : 0;

  const setStatus = async (s: string) => { await supabase.from("group_members").update({ status: s, status_at: new Date().toISOString() }).eq("group_id", group.id).eq("user_id", user!.id); inv(); };
  const addTask = async (e: React.FormEvent) => { e.preventDefault(); if (!newTask.trim()) return; await supabase.from("group_tasks").insert({ group_id: group.id, title: newTask.trim() }); setNewTask(""); inv(); };
  const toggleDone = async (taskId: string, isDone: boolean) => {
    if (isDone) await supabase.from("group_task_done").delete().eq("task_id", taskId).eq("user_id", user!.id);
    else await supabase.from("group_task_done").insert({ task_id: taskId });
    inv();
  };
  const delTask = async (id: string) => { await supabase.from("group_tasks").delete().eq("id", id); inv(); };
  const saveGoal = async () => { if (goal === group.goal) return; await supabase.from("study_groups").update({ goal }).eq("id", group.id); qc.invalidateQueries({ queryKey: ["groups"] }); toast.success("Goal updated"); };
  const leave = async () => {
    if (group.owner_id === user?.id) await supabase.from("study_groups").delete().eq("id", group.id);
    else await supabase.from("group_members").delete().eq("group_id", group.id).eq("user_id", user!.id);
    onLeft();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-semibold">{group.name}</h2>
            <p className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="size-4" />{members.length} member{members.length !== 1 && "s"}</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-lg font-mono" onClick={() => { navigator.clipboard.writeText(group.invite_code); toast.success("Invite code copied — share it with classmates"); }}>
            <Copy className="size-4" />{group.invite_code}
          </Button>
        </div>
        <Label className="mt-4 flex items-center gap-1.5"><Target className="size-4 text-primary" />Today's goal</Label>
        <Input value={goal} onChange={(e) => setGoal(e.target.value)} onBlur={saveGoal} placeholder="Set a shared goal" className="mt-1.5 h-11" />
        <div className="mt-4"><div className="mb-1 flex justify-between text-sm"><span>Group progress</span><span className="font-semibold">{groupPct}%</span></div><Progress value={groupPct} className="h-2" /></div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <p className="font-semibold">Focus Room</p>
        <p className="mt-1 font-display text-3xl font-semibold text-primary">{focusing}</p>
        <p className="text-sm text-muted-foreground">student{focusing !== 1 && "s"} currently focusing</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm", me && fresh(me) === s && "border-primary bg-primary/10")}>
              <span className={cn("size-2.5 rounded-full", STATUS[s].c)} />{STATUS[s].l}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {members.map((m, i) => <span key={m.user_id} title={STATUS[fresh(m) as keyof typeof STATUS]?.l} className={cn("size-3 rounded-full", STATUS[fresh(m) as keyof typeof STATUS]?.c ?? STATUS.offline.c)} aria-label={`Member ${i + 1}`} />)}
        </div>
        <Button asChild className="mt-4 h-11 w-full rounded-xl" onClick={() => setStatus("focusing")}><Link to="/focus" search={{ task: undefined }}><Play /> Start focus</Link></Button>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <p className="mb-3 font-semibold">Shared tasks</p>
        <form onSubmit={addTask} className="mb-3 flex gap-2"><Input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a shared task" className="h-11" /><Button type="submit" className="h-11 rounded-xl"><Plus /></Button></form>
        {tasks.length === 0 ? <p className="text-sm text-muted-foreground">No shared tasks yet.</p> : (
          <div className="space-y-2">
            {tasks.map((t) => {
              const doneBy = done.filter((d) => d.task_id === t.id);
              const mine = doneBy.some((d) => d.user_id === user?.id);
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <Checkbox checked={mine} onCheckedChange={() => toggleDone(t.id, mine)} className="size-5" />
                  <span className={cn("min-w-0 flex-1 text-sm", mine && "line-through opacity-60")}>{t.title}</span>
                  <span className="text-xs text-muted-foreground">{doneBy.length}/{members.length} done</span>
                  {t.created_by === user?.id && <Button size="icon" variant="ghost" className="size-8 rounded-full" aria-label="Delete task" onClick={() => delTask(t.id)}><Trash2 className="size-4" /></Button>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Button variant="ghost" className="w-full text-destructive" onClick={leave}><LogOut />{group.owner_id === user?.id ? "Delete group" : "Leave group"}</Button>
    </div>
  );
}
