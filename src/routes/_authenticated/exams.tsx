import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExamMutations, useExams, useProfile, type Exam } from "@/lib/data";
import { daysUntil } from "@/lib/stats";
import { SUBJECTS } from "@/components/Onboarding";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({ meta: [{ title: "Exams & Deadlines — FocusStudy" }, { name: "description", content: "Track exam dates, syllabus and preparation progress." }, { property: "og:title", content: "Exams & Deadlines — FocusStudy" }, { property: "og:description", content: "Track exam dates, syllabus and preparation progress." }] }),
  component: ExamsPage,
});

function ExamsPage() {
  const exams = useExams().data ?? [];
  const { upsert, remove } = useExamMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const upcoming = exams.filter((e) => daysUntil(e.exam_date) >= 0);
  const past = exams.filter((e) => daysUntil(e.exam_date) < 0);

  const card = (e: Exam) => {
    const d = daysUntil(e.exam_date);
    return (
      <div key={e.id} className="rounded-2xl border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{e.subject} · {format(new Date(e.exam_date + "T00:00:00"), "EEE d MMM yyyy")}</p>
            <p className="font-display text-lg font-semibold">{e.name}</p>
          </div>
          <div className="flex shrink-0">
            <Button size="icon" variant="ghost" className="size-9 rounded-full" aria-label="Edit exam" onClick={() => { setEditing(e); setOpen(true); }}><Pencil className="size-4" /></Button>
            <Button size="icon" variant="ghost" className="size-9 rounded-full" aria-label="Delete exam" onClick={() => remove.mutate(e.id)}><Trash2 className="size-4" /></Button>
          </div>
        </div>
        <p className={cn("mt-1 text-sm font-semibold", d <= 3 && d >= 0 ? "text-destructive" : "text-primary")}>
          {d < 0 ? "Completed" : d === 0 ? "Today!" : `${d} day${d > 1 ? "s" : ""} remaining`}
        </p>
        {e.topics && <p className="mt-2 text-sm text-muted-foreground">{e.topics}</p>}
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs"><span>Preparation</span><span className="font-semibold">{e.progress}%</span></div>
          <Slider value={[e.progress]} max={100} step={5} onValueCommit={(v) => upsert.mutate({ ...e, progress: v[0]! })} aria-label="Preparation progress" />
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Exams & Deadlines" subtitle="Know exactly how much time you have." action={<Button className="h-11 rounded-xl" onClick={() => { setEditing(null); setOpen(true); }}><Plus /> Add exam</Button>} />
      {exams.length === 0 ? (
        <EmptyState title="No exams added" text="Add your next exam to start a countdown." action={<Button className="rounded-xl" onClick={() => setOpen(true)}><Plus /> Add exam</Button>} />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">{upcoming.map(card)}</div>
          {past.length > 0 && (<><p className="mb-2 mt-8 text-sm font-semibold text-muted-foreground">Past</p><div className="grid gap-3 opacity-70 md:grid-cols-2">{past.map(card)}</div></>)}
        </>
      )}
      <ExamDialog open={open} onOpenChange={setOpen} exam={editing} />
    </div>
  );
}

function ExamDialog({ open, onOpenChange, exam }: { open: boolean; onOpenChange: (o: boolean) => void; exam: Exam | null }) {
  const { upsert } = useExamMutations();
  const profile = useProfile().data;
  const subjects = Array.from(new Set([...(profile?.subjects ?? []), ...SUBJECTS, "General"]));
  const [f, setF] = useState({ name: "", subject: "General", exam_date: "", topics: "", progress: 0 });
  useEffect(() => {
    if (!open) return;
    setF(exam ? { name: exam.name, subject: exam.subject, exam_date: exam.exam_date, topics: exam.topics, progress: exam.progress }
      : { name: "", subject: profile?.subjects?.[0] ?? "General", exam_date: "", topics: "", progress: 0 });
  }, [open, exam]); // eslint-disable-line
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsert.mutateAsync({ ...(exam ? { id: exam.id } : {}), ...f, name: f.name.trim() });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader><DialogTitle>{exam ? "Edit exam" : "Add exam"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="e-name">Exam name</Label><Input id="e-name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Mathematics Mid-term" className="h-11" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Subject</Label>
              <Select value={f.subject} onValueChange={(v) => setF({ ...f, subject: v })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="e-date">Date</Label><Input id="e-date" type="date" required value={f.exam_date} onChange={(e) => setF({ ...f, exam_date: e.target.value })} className="h-11" /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="e-topics">Syllabus / topics</Label><Textarea id="e-topics" rows={3} value={f.topics} onChange={(e) => setF({ ...f, topics: e.target.value })} /></div>
          <div className="space-y-2"><Label>Preparation: {f.progress}%</Label><Slider value={[f.progress]} max={100} step={5} onValueChange={(v) => setF({ ...f, progress: v[0]! })} /><Progress value={f.progress} className="h-1.5" /></div>
          <Button type="submit" className="h-12 w-full rounded-xl" disabled={upsert.isPending}>{exam ? "Save changes" : "Add exam"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
