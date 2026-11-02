import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, isToday } from "date-fns";
import { CheckCheck, SlidersHorizontal, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications, useProfile, useUpdateProfile } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — focora" }, { name: "description", content: "Your task, exam, goal and focus reminders." }, { property: "og:title", content: "Notifications — focora" }, { property: "og:description", content: "Your task, exam, goal and focus reminders." }] }),
  component: NotificationsPage,
});

const CATS = [
  { v: "all", l: "All" }, { v: "tasks", l: "Tasks" }, { v: "reminders", l: "Reminders" },
  { v: "exams", l: "Exams" }, { v: "goals", l: "Study Goals" }, { v: "focus", l: "Focus" },
];

const PREF_CATS = [
  { v: "tasks", l: "Tasks", d: "Due-soon and overdue task reminders" },
  { v: "reminders", l: "Reminders", d: "Study reminders you set on tasks" },
  { v: "exams", l: "Exams", d: "Exam countdowns at 7, 3 and 1 days" },
  { v: "goals", l: "Study goals", d: "Daily goal check-ins each evening" },
  { v: "focus", l: "Focus", d: "Focus session streaks and updates" },
] as const;

function NotificationsPage() {
  const notifs = useNotifications();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const qc = useQueryClient();
  const [cat, setCat] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const inv = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  const markRead = async (id: string) => { await supabase.from("notifications").update({ read: true }).eq("id", id); inv(); };
  const markAll = async () => { await supabase.from("notifications").update({ read: true }).eq("read", false); inv(); };
  const del = async (id: string) => { await supabase.from("notifications").delete().eq("id", id); inv(); };
  const unreadAll = (notifs.data ?? []).filter((n) => !n.read);
  const unread = unreadAll.length;

  const prefs = (profile.data?.notification_prefs ?? {}) as Record<string, boolean>;
  const setPref = (key: string, v: boolean) =>
    updateProfile.mutate({ notification_prefs: { ...prefs, [key]: v } });

  const list = (notifs.data ?? []).filter((n) => (cat === "all" || n.category === cat) && (!unreadOnly || !n.read));
  const today = list.filter((n) => isToday(new Date(n.created_at)));
  const earlier = list.filter((n) => !isToday(new Date(n.created_at)));

  const row = (n: NonNullable<typeof notifs.data>[number]) => (
    <div key={n.id} onClick={() => !n.read && markRead(n.id)} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border bg-card p-3.5", !n.read && "border-primary/40 bg-primary/5")}>
      {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{n.title}</p>
        {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
        <p className="mt-1 text-xs capitalize text-muted-foreground">{n.category} · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
      </div>
      <Button size="icon" variant="ghost" className="size-9 rounded-full" aria-label="Delete notification" onClick={(e) => { e.stopPropagation(); del(n.id); }}><Trash2 className="size-4" /></Button>
    </div>
  );

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Reminders and updates in one place." action={
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => setPrefsOpen(true)}><SlidersHorizontal /> Preferences</Button>
          {unread > 0 && <Button variant="outline" className="h-11 rounded-xl" onClick={markAll}><CheckCheck /> Mark all read</Button>}
        </div>
      } />
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {CATS.map((c) => (
          <button key={c.v} onClick={() => setCat(c.v)} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", cat === c.v && !unreadOnly ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{c.l}</button>
        ))}
        <button onClick={() => setUnreadOnly((v) => !v)} className={cn("ml-auto flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm", unreadOnly ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
          Unread{unread > 0 && <span className={cn("rounded-full px-1.5 text-[11px] font-semibold", unreadOnly ? "bg-primary-foreground/20" : "bg-destructive text-destructive-foreground")}>{unread}</span>}
        </button>
      </div>
      {list.length === 0 ? (
        <EmptyState title="You're all caught up" text={unreadOnly ? "No unread notifications in this category." : "New reminders will appear here."} />
      ) : (
        <div className="space-y-2">
          {today.length > 0 && <p className="pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today</p>}
          {today.map(row)}
          {earlier.length > 0 && <p className="pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Earlier</p>}
          {earlier.map(row)}
        </div>
      )}

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader><DialogTitle>Notification preferences</DialogTitle></DialogHeader>
          <p className="-mt-1 text-sm text-muted-foreground">Choose which reminders reach your notification centre. Changes apply to new reminders right away.</p>
          <div className="divide-y rounded-xl border">
            {PREF_CATS.map((c) => (
              <div key={c.v} className="flex items-center justify-between gap-3 px-3 py-3">
                <div>
                  <p className="text-sm font-medium">{c.l}</p>
                  <p className="text-xs text-muted-foreground">{c.d}</p>
                </div>
                <Switch
                  checked={prefs[c.v] !== false}
                  onCheckedChange={(v) => setPref(c.v, v)}
                  aria-label={`${c.l} notifications`}
                />
              </div>
            ))}
          </div>
          <Button className="h-11 w-full rounded-xl" onClick={() => setPrefsOpen(false)}>Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
