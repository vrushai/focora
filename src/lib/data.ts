import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "./auth";

export type Profile = Tables<"profiles">;
export type Task = Tables<"tasks">;
export type Session = Tables<"focus_sessions">;
export type Doubt = Tables<"doubts">;
export type Exam = Tables<"exams">;
export type Notification = Tables<"notifications">;
export type Group = Tables<"study_groups">;

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

const onErr = (e: Error) => toast.error(e.message || "Something went wrong");

// ---------- Profile ----------
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const r = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      let p = must(r);
      if (!p) {
        p = must(await supabase.from("profiles").insert({ id: user!.id }).select().single());
      }
      return p as Profile;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const editableFields = new Set([
    "name", "grade", "subjects", "study_hours", "daily_goal_min", "reminder_style",
    "problem", "onboarded", "focus_preset", "custom_focus_min", "reminders_enabled", "leave_warning",
  ]);
  return useMutation({
    mutationFn: async (patch: Pick<TablesUpdate<"profiles">, "name" | "grade" | "subjects" | "study_hours" | "daily_goal_min" | "reminder_style" | "problem" | "onboarded" | "focus_preset" | "custom_focus_min" | "reminders_enabled" | "leave_warning">) => {
      const safePatch = Object.fromEntries(Object.entries(patch).filter(([key]) => editableFields.has(key))) as typeof patch;
      return must(await supabase.from("profiles").update(safePatch).eq("id", user!.id).select().single());
    },
    onSuccess: (p) => qc.setQueryData(["profile", user?.id], p),
    onError: onErr,
  });
}

// ---------- Tasks ----------
export function useTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user,
    queryFn: async () =>
      must(await supabase.from("tasks").select("*").order("due_at", { ascending: true, nullsFirst: false })) as Task[],
  });
}

export function useTaskMutations() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["tasks"] });
  const create = useMutation({
    mutationFn: async (t: TablesInsert<"tasks">) => must(await supabase.from("tasks").insert(t).select().single()),
    onSuccess: inv,
    onError: onErr,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: TablesUpdate<"tasks"> & { id: string }) =>
      must(await supabase.from("tasks").update(patch).eq("id", id).select().single()),
    onSuccess: inv,
    onError: onErr,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => must(await supabase.from("tasks").delete().eq("id", id)),
    onSuccess: inv,
    onError: onErr,
  });
  const toggle = useMutation({
    mutationFn: async (t: Task) => {
      const completing = !t.completed_at;
      const res = must(
        await supabase
          .from("tasks")
          .update({ completed_at: completing ? new Date().toISOString() : null })
          .eq("id", t.id)
          .select()
          .single(),
      );
      if (completing && t.repeat !== "none" && t.due_at) {
        const d = new Date(t.due_at);
        if (t.repeat === "daily") d.setDate(d.getDate() + 1);
        if (t.repeat === "weekly") d.setDate(d.getDate() + 7);
        const { id: _id, created_at: _c, completed_at: _d, ...rest } = t;
        await supabase.from("tasks").insert({ ...rest, due_at: d.toISOString() });
      }
      if (completing) {
        toast.success("Task complete · +10 Focus Points");
        await qc.invalidateQueries({ queryKey: ["profile"] });
      }
      return res;
    },
    onSuccess: inv,
    onError: onErr,
  });
  return { create, update, remove, toggle };
}

// ---------- Sessions ----------
export function useSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sessions", user?.id],
    enabled: !!user,
    queryFn: async () =>
      must(await supabase.from("focus_sessions").select("*").order("started_at", { ascending: false }).limit(1000)) as Session[],
  });
}

// ---------- Doubts ----------
export function useDoubts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["doubts", user?.id],
    enabled: !!user,
    queryFn: async () =>
      must(await supabase.from("doubts").select("*").order("created_at", { ascending: false }).limit(200)) as Doubt[],
  });
}

// ---------- Exams ----------
export function useExams() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["exams", user?.id],
    enabled: !!user,
    queryFn: async () => must(await supabase.from("exams").select("*").order("exam_date")) as Exam[],
  });
}

export function useExamMutations() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["exams"] });
  const upsert = useMutation({
    mutationFn: async ({ id, ...e }: TablesInsert<"exams">) =>
      id
        ? must(await supabase.from("exams").update(e).eq("id", id).select().single())
        : must(await supabase.from("exams").insert(e).select().single()),
    onSuccess: inv,
    onError: onErr,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => must(await supabase.from("exams").delete().eq("id", id)),
    onSuccess: inv,
    onError: onErr,
  });
  return { upsert, remove };
}

// ---------- Notifications ----------
export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () =>
      must(await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100)) as Notification[],
  });
}

/** Inserts a notification once per dedupe key. Returns true when newly created. */
export async function pushNotification(n: { category: string; title: string; body: string; dedupe_key: string }) {
  const { data, error } = await supabase
    .from("notifications")
    .upsert(n, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
    .select();
  if (error) return false;
  return (data?.length ?? 0) > 0;
}
