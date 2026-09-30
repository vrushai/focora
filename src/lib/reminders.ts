import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { pushNotification, type Exam, type Profile, type Session, type Task } from "./data";
import { daysUntil, studiedOn, fmtMin } from "./stats";

function browserNotify(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  } catch {
    /* ignore */
  }
}

/** Checks tasks/exams/goals every 30s and raises in-app + browser reminders (deduped per event). */
export function useReminders(profile?: Profile, tasks?: Task[], exams?: Exam[], sessions?: Session[]) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!profile || !profile.reminders_enabled || !tasks) return;
    const run = async () => {
      const now = new Date();
      const events: { category: string; title: string; body: string; dedupe_key: string }[] = [];
      for (const t of tasks) {
        if (t.completed_at || !t.due_at) continue;
        const due = new Date(t.due_at);
        const mins = (+due - +now) / 60000;
        if (t.reminder_min != null && mins > 0 && mins <= t.reminder_min) {
          events.push({
            category: "tasks",
            title: "📚 Study Reminder",
            body: `${t.subject}: “${t.title}” is due in ${Math.ceil(mins)} minutes.`,
            dedupe_key: `rem-${t.id}-${t.due_at}`,
          });
        }
        if (mins < 0 && mins > -60 * 24 * 3) {
          events.push({
            category: "tasks",
            title: "⏰ Task overdue",
            body: `${t.subject}: “${t.title}” was due ${due.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}.`,
            dedupe_key: `overdue-${t.id}-${t.due_at}`,
          });
        }
      }
      for (const e of exams ?? []) {
        const d = daysUntil(e.exam_date);
        if (d === 7 || d === 3 || d === 1) {
          events.push({
            category: "exams",
            title: `📝 ${e.name}`,
            body: `${d} day${d > 1 ? "s" : ""} remaining · preparation ${e.progress}%`,
            dedupe_key: `exam-${e.id}-${d}`,
          });
        }
      }
      if (sessions && now.getHours() >= 18) {
        const done = studiedOn(sessions, now);
        if (done < profile.daily_goal_min) {
          events.push({
            category: "goals",
            title: "🎯 Daily goal check-in",
            body: `You've studied ${fmtMin(done)} of ${fmtMin(profile.daily_goal_min)} today. One more session?`,
            dedupe_key: `goal-${now.toDateString()}`,
          });
        }
      }
      let created = false;
      for (const ev of events) {
        if (await pushNotification(ev)) {
          created = true;
          toast(ev.title, { description: ev.body });
          browserNotify(ev.title, ev.body);
        }
      }
      if (created) qc.invalidateQueries({ queryKey: ["notifications"] });
    };
    run();
    const id = setInterval(run, 30000);
    return () => clearInterval(id);
  }, [profile, tasks, exams, sessions, qc]);
}
