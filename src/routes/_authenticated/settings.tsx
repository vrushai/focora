import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Moon, Sun, Bell, Database } from "lucide-react";
import { PageHeader } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useUpdateProfile } from "@/lib/data";
import { useTheme } from "@/lib/theme";
import { loadSampleData, clearSampleData } from "@/lib/sample";
import { SUBJECTS } from "@/components/Onboarding";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — focora" }, { name: "description", content: "Profile, goals, reminders, focus timer, theme and data settings." }, { property: "og:title", content: "Settings — focora" }, { property: "og:description", content: "Profile, goals, reminders, focus timer, theme and data settings." }] }),
  component: SettingsPage,
});

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-4 rounded-2xl border bg-card p-4"><h2 className="font-semibold">{title}</h2>{children}</section>;
}
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">{label}</p>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>{children}</div>;
}

function SettingsPage() {
  const profile = useProfile().data!;
  const update = useUpdateProfile();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { dark, setDark } = useTheme();
  const [name, setName] = useState(profile.name);
  const [grade, setGrade] = useState(profile.grade);
  const [goalH, setGoalH] = useState(profile.daily_goal_min / 60);
  const [perm, setPerm] = useState<string>("default");
  const [busy, setBusy] = useState(false);
  useEffect(() => setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission), []);
  const save = (patch: Parameters<typeof update.mutate>[0], msg = "Saved") => update.mutate(patch, { onSuccess: () => toast.success(msg) });
  const toggleSubject = (s: string) => {
    const has = profile.subjects.includes(s);
    save({ subjects: has ? profile.subjects.filter((x) => x !== s) : [...profile.subjects, s] });
  };
  const askPerm = async () => {
    if (typeof Notification === "undefined") { toast("Your browser doesn't support notifications — you'll get in-app reminders instead."); return; }
    const p = await Notification.requestPermission();
    setPerm(p);
    toast(p === "granted" ? "Browser notifications enabled" : "Permission not granted — in-app reminders will still work.");
  };
  const refresh = () => qc.invalidateQueries();
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try { await fn(); refresh(); toast.success(msg); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const deleteAll = async () => {
    for (const t of ["focus_sessions", "doubts", "notifications", "exams"] as const) await supabase.from(t).delete().not("id", "is", null);
    await supabase.from("tasks").delete().not("id", "is", null);
    await supabase.from("profiles").update({ points: 0 }).eq("id", profile.id);
  };
  const logout = async () => { await supabase.auth.signOut(); qc.clear(); nav({ to: "/auth" }); };

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" />
      <Card title="Profile">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="s-name">Name</Label><Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== profile.name && save({ name })} className="h-11" /></div>
          <div className="space-y-1.5"><Label htmlFor="s-grade">Grade / class</Label><Input id="s-grade" value={grade} onChange={(e) => setGrade(e.target.value)} onBlur={() => grade !== profile.grade && save({ grade })} className="h-11" /></div>
        </div>
        <div>
          <Label>Subjects</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <button key={s} onClick={() => toggleSubject(s)} className={cn("rounded-full border px-3 py-1.5 text-sm", profile.subjects.includes(s) ? "border-primary bg-primary text-primary-foreground" : "bg-background")}>{s}</button>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Daily study goal">
        <Row label="Hours per day" hint={`${goalH}h goal`}>
          <Input type="number" min={0.5} max={12} step={0.5} value={goalH} onChange={(e) => setGoalH(Number(e.target.value))} onBlur={() => save({ daily_goal_min: Math.round(goalH * 60) })} className="h-10 w-24" />
        </Row>
      </Card>

      <Card title="Reminders & notifications">
        <Row label="Reminders" hint="Tasks, overdue, exams and goal check-ins"><Switch checked={profile.reminders_enabled} onCheckedChange={(v) => save({ reminders_enabled: v })} /></Row>
        <Row label="Reminder style">
          <Select value={profile.reminder_style} onValueChange={(v) => save({ reminder_style: v })}>
            <SelectTrigger className="h-10 w-36"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="gentle">Gentle</SelectItem><SelectItem value="motivating">Motivating</SelectItem><SelectItem value="strict">Strict</SelectItem></SelectContent>
          </Select>
        </Row>
        <Row label="Browser notifications" hint={perm === "granted" ? "Enabled" : perm === "denied" ? "Blocked in your browser settings — in-app reminders still work" : perm === "unsupported" ? "Not supported — using in-app reminders" : "Get reminders even when the tab is in the background"}>
          <Button variant="outline" size="sm" className="rounded-lg" disabled={perm === "granted"} onClick={askPerm}><Bell className="size-4" />{perm === "granted" ? "On" : "Enable"}</Button>
        </Row>
      </Card>

      <Card title="Focus & timer">
        <Row label="Default timer">
          <Select value={profile.focus_preset} onValueChange={(v) => save({ focus_preset: v })}>
            <SelectTrigger className="h-10 w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="pomodoro">Pomodoro 25/5</SelectItem><SelectItem value="long">Long focus 50/10</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
          </Select>
        </Row>
        <Row label="Custom session length" hint="Minutes">
          <Input type="number" min={5} max={180} defaultValue={profile.custom_focus_min} onBlur={(e) => save({ custom_focus_min: Math.max(5, Math.min(180, Number(e.target.value) || 30)) })} className="h-10 w-24" />
        </Row>
        <Row label="Warn when leaving a session" hint="Shows a reminder if you switch tabs"><Switch checked={profile.leave_warning} onCheckedChange={(v) => save({ leave_warning: v })} /></Row>
      </Card>

      <Card title="Appearance">
        <Row label="Theme" hint={dark ? "Dark mode" : "Light mode"}>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setDark(!dark)}>{dark ? <Sun className="size-4" /> : <Moon className="size-4" />}{dark ? "Light" : "Dark"}</Button>
        </Row>
      </Card>

      <Card title="Data management">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" disabled={busy} onClick={() => run(loadSampleData, "Demo data added")}><Database /> Load demo data</Button>
          <Button variant="outline" className="rounded-xl" disabled={busy} onClick={() => run(clearSampleData, "Demo data removed")}>Clear demo data</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" className="rounded-xl text-destructive" disabled={busy}>Delete all my data</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Delete all your data?</AlertDialogTitle><AlertDialogDescription>This removes all tasks, focus sessions, doubts, exams and notifications, and resets your points. It cannot be undone.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => run(deleteAll, "All data deleted")}>Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      <Button variant="outline" className="h-12 w-full rounded-xl" onClick={logout}><LogOut /> Log out</Button>
    </div>
  );
}
