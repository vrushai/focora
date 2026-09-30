import type { Session, Task } from "./data";

export const LEVELS = [
  { level: 1, name: "Starter", min: 0 },
  { level: 2, name: "Consistent", min: 200 },
  { level: 3, name: "Focused", min: 500 },
  { level: 4, name: "Dedicated", min: 1000 },
  { level: 5, name: "Master", min: 2000 },
];

export function levelFor(points: number) {
  let cur = LEVELS[0]!;
  for (const l of LEVELS) if (points >= l.min) cur = l;
  const next = LEVELS.find((l) => l.min > points);
  const pct = next ? ((points - cur.min) / (next.min - cur.min)) * 100 : 100;
  return { ...cur, next, pct };
}

export function fmtMin(min: number) {
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  return `${h}h ${String(r).padStart(2, "0")}m`;
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function isSameDay(a: Date, b: Date) {
  return dayKey(a) === dayKey(b);
}

export function studiedOn(sessions: Session[], d: Date) {
  return sessions
    .filter((s) => isSameDay(new Date(s.started_at), d))
    .reduce((a, s) => a + s.actual_min, 0);
}

export function streak(sessions: Session[]) {
  const days = new Set(sessions.filter((s) => s.actual_min > 0).map((s) => dayKey(new Date(s.started_at))));
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export type TaskBucket = "today" | "upcoming" | "overdue" | "completed" | "someday";

export function bucketOf(t: Task, now = new Date()): TaskBucket {
  if (t.completed_at) return "completed";
  if (!t.due_at) return "someday";
  const due = new Date(t.due_at);
  if (due < now) return "overdue";
  if (isSameDay(due, now)) return "today";
  return "upcoming";
}

const PRI = { high: 0, medium: 1, low: 2 } as Record<string, number>;
export function sortTasks(a: Task, b: Task) {
  const p = (PRI[a.priority] ?? 1) - (PRI[b.priority] ?? 1);
  if (p !== 0) return p;
  return (a.due_at ? +new Date(a.due_at) : Infinity) - (b.due_at ? +new Date(b.due_at) : Infinity);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function daysUntil(date: string) {
  const d = new Date(date + "T00:00:00");
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((+d - +t) / 86400000);
}
