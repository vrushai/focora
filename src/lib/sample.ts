import { supabase } from "@/integrations/supabase/client";

/** Demo data is always flagged is_sample=true so it can be cleared without touching real data. */
export async function loadSampleData() {
  const at = (dayOffset: number, h: number, m = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const tasks = [
    { title: "Complete Exercise 2.3", subject: "Mathematics", priority: "high", due_at: at(0, 17), duration_min: 45, reminder_min: 15 },
    { title: "Learn Laws of Motion", subject: "Physics", priority: "high", due_at: at(0, 19), duration_min: 45, reminder_min: 15 },
    { title: "Revise Cell Structure notes", subject: "Biology", priority: "medium", due_at: at(0, 20, 30), duration_min: 30 },
    { title: "Essay outline: climate change", subject: "English", priority: "medium", due_at: at(2, 18), duration_min: 40 },
    { title: "Chemical reactions worksheet", subject: "Chemistry", priority: "low", due_at: at(3, 17), duration_min: 30 },
    { title: "Read History chapter 4", subject: "History", priority: "medium", due_at: at(-1, 18), duration_min: 35 },
  ].map((t) => ({ ...t, is_sample: true }));
  const subjects = ["Mathematics", "Physics", "Biology", "English", "Chemistry"];
  const sessions = [] as { subject: string; planned_min: number; actual_min: number; completed: boolean; points: number; started_at: string; is_sample: boolean }[];
  for (let d = 1; d <= 7; d++) {
    const count = d % 3 === 0 ? 1 : 2;
    for (let i = 0; i < count; i++) {
      const len = i === 0 ? 50 : 25;
      sessions.push({
        subject: subjects[(d + i) % subjects.length]!,
        planned_min: len,
        actual_min: len,
        completed: true,
        points: 20,
        started_at: at(-d, 16 + i * 2),
        is_sample: true,
      });
    }
  }
  const dateIn = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const exams = [
    { name: "Mathematics Mid-term", subject: "Mathematics", exam_date: dateIn(12), topics: "Algebra, Linear equations, Polynomials", progress: 65, is_sample: true },
    { name: "Science Unit Test", subject: "Physics", exam_date: dateIn(5), topics: "Motion, Force, Laws of motion", progress: 40, is_sample: true },
  ];
  const r1 = await supabase.from("tasks").insert(tasks);
  const r2 = await supabase.from("focus_sessions").insert(sessions);
  const r3 = await supabase.from("exams").insert(exams);
  const err = r1.error || r2.error || r3.error;
  if (err) throw new Error(err.message);
}

export async function clearSampleData() {
  await supabase.from("focus_sessions").delete().eq("is_sample", true);
  await supabase.from("tasks").delete().eq("is_sample", true);
  await supabase.from("exams").delete().eq("is_sample", true);
}
