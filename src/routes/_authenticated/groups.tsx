import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Copy, Plus, Users, LogOut, Target, Trash2, Play, MessageCircle, Send } from "lucide-react";
import { PriorityBadge } from "@/components/tasks";
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
  const [lastRead, setLastRead] = useState<Record<string, string>>({});
  useEffect(() => { try { setLastRead(JSON.parse(localStorage.getItem("fs-chat-read") ?? "{}")); } catch { /* ignore */ } }, []);
  const markRead = (gid: string, at: string) => setLastRead((prev) => {
    if (prev[gid] && prev[gid] >= at) return prev;
    const next = { ...prev, [gid]: at };
    localStorage.setItem("fs-chat-read", JSON.stringify(next));
    return next;
  });
  const recent = useQuery({
    queryKey: ["group-chat-recent", user?.id],
    enabled: !!user && !!groups.data?.length,
    refetchInterval: 8000,
    queryFn: async () => {
      const { data, error } = await supabase.from("group_messages").select("group_id,user_id,created_at").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });
  const unread = (gid: string) => (recent.data ?? []).filter((m) => m.group_id === gid && m.user_id !== user?.id && m.created_at > (lastRead[gid] ?? "")).length;

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from("study_groups").insert({ name: name.trim(), goal: goal.trim() }).select().single();
    if (error || !data) { toast.error(error?.message ?? "Could not create group"); return; }
    await supabase.from("group_members").insert({ group_id: data.id, display_name: profile?.name || "Student" });
    qc.invalidateQueries({ queryKey: ["groups"] }); setSel(data.id); setOpen(null); setName(""); setGoal("");
  };
  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.rpc("join_group_by_code", { _code: code, _name: profile?.name || "Student" });
    if (error) { toast.error("That invite code doesn't match a group."); return; }
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
              {groups.data.map((g) => <button key={g.id} onClick={() => setSel(g.id)} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", active?.id === g.id ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{g.name}{unread(g.id) > 0 && <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">{unread(g.id)}</span>}</button>)}
            </div>
          )}
          {active && <GroupView key={active.id} group={active} unread={unread(active.id)} onRead={(at) => markRead(active.id, at)} onLeft={() => { setSel(null); qc.invalidateQueries({ queryKey: ["groups"] }); }} />}
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

function GroupView({ group, onLeft, unread, onRead }: { group: G; onLeft: () => void; unread: number; onRead: (at: string) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newTask, setNewTask] = useState("");
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState("");
  const [prio, setPrio] = useState("medium");
  const [goal, setGoal] = useState(group.goal);
  const today = format(new Date(), "yyyy-MM-dd");
  const data = useQuery({
    queryKey: ["group", group.id],
    refetchInterval: 15000,
    queryFn: async () => {
      const [m, t] = await Promise.all([
        supabase.from("group_members").select("*").eq("group_id", group.id),
        supabase.from("group_tasks").select("*").eq("group_id", group.id).order("created_at"),
      ]);
      if (m.error || t.error) throw m.error ?? t.error;
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

  const setStatus = async (s: string) => { const { error } = await supabase.from("group_members").update({ status: s, status_at: new Date().toISOString() }).eq("group_id", group.id).eq("user_id", user!.id); if (error) toast.error("Couldn't update your status — check your connection and try again."); inv(); };
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newTask.trim()) return;
    const { error } = await supabase.from("group_tasks").insert({ group_id: group.id, title: newTask.trim(), due_date: due || null, assigned_to: assignee || null, priority: prio });
    if (error) { toast.error("Couldn't add the shared task — it wasn't saved. Please try again."); return; }
    setNewTask(""); setDue(""); setAssignee(""); setPrio("medium"); inv();
  };
  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sortedTasks = [...tasks].sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1));
  const toggleDone = async (taskId: string, isDone: boolean) => {
    const { error } = isDone
      ? await supabase.from("group_task_done").delete().eq("task_id", taskId).eq("user_id", user!.id)
      : await supabase.from("group_task_done").insert({ task_id: taskId });
    if (error) toast.error("Couldn't sync your progress on this task. Please try again.");
    inv();
  };
  const delTask = async (id: string) => { const { error } = await supabase.from("group_tasks").delete().eq("id", id); if (error) toast.error("Couldn't delete the task. Please try again."); inv(); };
  const saveGoal = async () => { if (goal === group.goal) return; const { error } = await supabase.from("study_groups").update({ goal }).eq("id", group.id); if (error) { toast.error("Couldn't save the goal. Please try again."); setGoal(group.goal); return; } qc.invalidateQueries({ queryKey: ["groups"] }); toast.success("Goal updated"); };
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

      {data.isError && <SyncError text="Couldn't load the latest group updates. Retrying automatically…" onRetry={() => data.refetch()} />}
      <div className="rounded-2xl border bg-card p-4">
        <p className="mb-1 font-semibold">Shared task plan</p>
        <p className="mb-3 text-xs text-muted-foreground">Plan who does what and by when. Everyone ticks off their own progress.</p>
        <form onSubmit={addTask} className="mb-4 space-y-2">
          <Input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="e.g. Revise Chapter 3 notes" className="h-11" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-11" aria-label="Due date" />
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="h-11 rounded-md border bg-background px-2 text-sm" aria-label="Assign to">
              <option value="">Everyone</option>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.user_id === user?.id ? "Me" : m.display_name}</option>)}
            </select>
            <select value={prio} onChange={(e) => setPrio(e.target.value)} className="h-11 rounded-md border bg-background px-2 text-sm" aria-label="Priority">
              <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
            <Button type="submit" className="h-11 rounded-xl"><Plus /> Add</Button>
          </div>
        </form>
        {tasks.length === 0 ? <p className="text-sm text-muted-foreground">No shared tasks yet.</p> : (
          <div className="space-y-2">
            {sortedTasks.map((t) => {
              const doneBy = done.filter((d) => d.task_id === t.id);
              const mine = doneBy.some((d) => d.user_id === user?.id);
              const who = t.assigned_to ? members.find((m) => m.user_id === t.assigned_to) : null;
              const target = t.assigned_to ? 1 : members.length;
              const late = t.due_date && t.due_date < today && doneBy.length < target;
              return (
                <div key={t.id} className="flex items-start gap-3 rounded-xl border p-3">
                  <Checkbox checked={mine} onCheckedChange={() => toggleDone(t.id, mine)} className="mt-0.5 size-5" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", mine && "line-through opacity-60")}>{t.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <PriorityBadge p={t.priority} />
                      <span>{who ? (who.user_id === user?.id ? "Assigned to you" : `Assigned to ${who.display_name}`) : "Everyone"}</span>
                      {t.due_date && <span className={cn(late && "font-medium text-destructive")}>Due {format(new Date(`${t.due_date}T00:00`), "EEE d MMM")}</span>}
                      <span>{doneBy.length}/{target} done</span>
                    </div>
                  </div>
                  {t.created_by === user?.id && <Button size="icon" variant="ghost" className="size-8 rounded-full" aria-label="Delete task" onClick={() => delTask(t.id)}><Trash2 className="size-4" /></Button>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <GroupChat groupId={group.id} myName={me?.display_name ?? "Student"} unread={unread} onRead={onRead} />

      <Button variant="ghost" className="w-full text-destructive" onClick={leave}><LogOut />{group.owner_id === user?.id ? "Delete group" : "Leave group"}</Button>
    </div>
  );
}

function SyncError({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <span>{text}</span>
      <Button size="sm" variant="outline" className="rounded-lg" onClick={onRetry}>Retry</Button>
    </div>
  );
}

function GroupChat({ groupId, myName, unread, onRead }: { groupId: string; myName: string; unread: number; onRead: (at: string) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const msgs = useQuery({
    queryKey: ["group-chat", groupId],
    refetchInterval: 4000,
    queryFn: async () => {
      const { data, error } = await supabase.from("group_messages").select("*").eq("group_id", groupId).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data?.reverse() ?? [];
    },
  });
  const list = msgs.data ?? [];
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [list.length]);
  const latest = list[list.length - 1]?.created_at;
  useEffect(() => {
    const el = boxRef.current;
    if (!el || !latest) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) onRead(latest); }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [latest, onRead]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const { error } = await supabase.from("group_messages").insert({ group_id: groupId, body: body.slice(0, 1000), display_name: myName });
    setSending(false);
    if (error) { setFailed(body); toast.error("Message not sent — tap Retry to send it again."); return; }
    setFailed(null);
    setText("");
    qc.invalidateQueries({ queryKey: ["group-chat", groupId] });
  };
  const del = async (id: string) => { const { error } = await supabase.from("group_messages").delete().eq("id", id); if (error) toast.error("Couldn't delete the message."); qc.invalidateQueries({ queryKey: ["group-chat", groupId] }); };

  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="mb-3 flex items-center gap-2 font-semibold"><MessageCircle className="size-4 text-primary" /> Group chat
        {unread > 0 && <span className="rounded-full bg-destructive px-2 text-xs font-semibold text-destructive-foreground">{unread} new</span>}
      </p>
      {msgs.isError && <div className="mb-2"><SyncError text="Chat is out of sync — new messages may be missing." onRetry={() => msgs.refetch()} /></div>}
      <div ref={boxRef} className="max-h-80 space-y-2 overflow-y-auto rounded-xl bg-muted/40 p-3">
        {list.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No messages yet — say hi 👋</p> : list.map((m) => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className={cn("group flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border bg-card")}>
                {!mine && <p className="text-[11px] font-semibold text-primary">{m.display_name}</p>}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cn("mt-0.5 flex items-center gap-2 text-[10px]", mine ? "justify-end opacity-70" : "text-muted-foreground")}>
                  {format(new Date(m.created_at), "h:mm a")}
                  {mine && <button onClick={() => del(m.id)} className="underline-offset-2 hover:underline">delete</button>}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {failed && (
        <div role="alert" className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <span className="truncate">Not sent: “{failed}”</span>
          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => { setText(failed); setFailed(null); }}>Retry</Button>
        </div>
      )}
      <form onSubmit={send} className="mt-3 flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Message your group" className="h-11" />
        <Button type="submit" className="h-11 rounded-xl" disabled={sending || !text.trim()} aria-label="Send"><Send /></Button>
      </form>
    </div>
  );
}
