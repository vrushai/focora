import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { CheckCheck, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — FocusStudy" }, { name: "description", content: "Your task, exam, goal and focus reminders." }, { property: "og:title", content: "Notifications — FocusStudy" }, { property: "og:description", content: "Your task, exam, goal and focus reminders." }] }),
  component: NotificationsPage,
});

const CATS = [
  { v: "all", l: "All" }, { v: "tasks", l: "Tasks" }, { v: "reminders", l: "Reminders" },
  { v: "exams", l: "Exams" }, { v: "goals", l: "Study Goals" }, { v: "focus", l: "Focus" },
];

function NotificationsPage() {
  const notifs = useNotifications();
  const qc = useQueryClient();
  const [cat, setCat] = useState("all");
  const inv = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  const list = (notifs.data ?? []).filter((n) => cat === "all" || n.category === cat);
  const markRead = async (id: string) => { await supabase.from("notifications").update({ read: true }).eq("id", id); inv(); };
  const markAll = async () => { await supabase.from("notifications").update({ read: true }).eq("read", false); inv(); };
  const del = async (id: string) => { await supabase.from("notifications").delete().eq("id", id); inv(); };
  const unread = (notifs.data ?? []).some((n) => !n.read);

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Reminders and updates in one place." action={unread ? <Button variant="outline" className="rounded-xl" onClick={markAll}><CheckCheck /> Mark all read</Button> : undefined} />
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {CATS.map((c) => (
          <button key={c.v} onClick={() => setCat(c.v)} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", cat === c.v ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{c.l}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState title="You're all caught up" text="New reminders will appear here." />
      ) : (
        <div className="space-y-2">
          {list.map((n) => (
            <div key={n.id} onClick={() => !n.read && markRead(n.id)} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border bg-card p-3.5", !n.read && "border-primary/40 bg-primary/5")}>
              {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs capitalize text-muted-foreground">{n.category} · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
              </div>
              <Button size="icon" variant="ghost" className="size-9 rounded-full" aria-label="Delete notification" onClick={(e) => { e.stopPropagation(); del(n.id); }}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
