import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUpdateProfile, type Profile } from "@/lib/data";
import { loadSampleData } from "@/lib/sample";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

export const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "History", "Geography", "Computer Science", "Economics", "Languages"];
export const PROBLEMS = [
  "I get distracted easily",
  "I procrastinate",
  "I forget tasks",
  "I cannot stay consistent",
  "I don't know what to study first",
  "I spend too much time on my phone",
];

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
        on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

export function Onboarding({ profile }: { profile: Profile }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    name: profile.name,
    grade: profile.grade,
    subjects: profile.subjects,
    study_hours: profile.study_hours || "Evening",
    daily_goal_min: profile.daily_goal_min,
    reminder_style: profile.reminder_style,
    problem: profile.problem,
  });
  const [sample, setSample] = useState(true);
  const update = useUpdateProfile();
  const qc = useQueryClient();

  const steps = [
    {
      title: "Hi! What should we call you?",
      valid: f.name.trim() && f.grade.trim(),
      body: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" className="h-12" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Aarav" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grade">Class / Grade</Label>
            <Input id="grade" className="h-12" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} placeholder="Class 9" />
          </div>
        </div>
      ),
    },
    {
      title: "Which subjects are you studying?",
      valid: f.subjects.length > 0,
      body: (
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <Chip key={s} on={f.subjects.includes(s)} onClick={() => setF({ ...f, subjects: f.subjects.includes(s) ? f.subjects.filter((x) => x !== s) : [...f.subjects, s] })}>
              {s}
            </Chip>
          ))}
        </div>
      ),
    },
    {
      title: "How do you like to study?",
      valid: true,
      body: (
        <div className="space-y-6">
          <div>
            <Label>When do you usually study?</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Morning", "Afternoon", "Evening", "Night"].map((s) => (
                <Chip key={s} on={f.study_hours === s} onClick={() => setF({ ...f, study_hours: s })}>{s}</Chip>
              ))}
            </div>
          </div>
          <div>
            <Label>Daily study goal</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[60, 120, 180, 240, 300].map((m) => (
                <Chip key={m} on={f.daily_goal_min === m} onClick={() => setF({ ...f, daily_goal_min: m })}>{m / 60}h</Chip>
              ))}
            </div>
          </div>
          <div>
            <Label>Reminder style</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {([["gentle", "Gentle"], ["standard", "Standard"], ["strict", "Keep me accountable"]] as const).map(([v, l]) => (
                <Chip key={v} on={f.reminder_style === v} onClick={() => setF({ ...f, reminder_style: v })}>{l}</Chip>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "What is your biggest study problem?",
      valid: !!f.problem,
      body: (
        <div className="space-y-4">
          <div className="grid gap-2">
            {PROBLEMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setF({ ...f, problem: p })}
                className={cn(
                  "flex items-center justify-between rounded-2xl border bg-card px-4 py-3.5 text-left text-sm font-medium transition-colors",
                  f.problem === p ? "border-primary ring-2 ring-primary/20" : "hover:bg-muted",
                )}
              >
                {p}
                {f.problem === p && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between gap-4 rounded-2xl bg-muted px-4 py-3 text-sm">
            <span>
              <span className="font-medium">Add demo data</span>
              <span className="block text-xs text-muted-foreground">Sample tasks, sessions and exams, marked “Demo” — remove anytime in Settings.</span>
            </span>
            <Switch checked={sample} onCheckedChange={setSample} />
          </label>
        </div>
      ),
    },
  ];

  const cur = steps[step]!;
  const finish = async () => {
    try {
      if (sample) await loadSampleData();
      await update.mutateAsync({ ...f, name: f.name.trim(), grade: f.grade.trim(), onboarded: true });
      qc.invalidateQueries();
      toast.success(`Welcome, ${f.name.trim()}!`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-8">
      <Logo />
      <div className="mt-8 flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
      <h1 className="mt-8 text-2xl font-semibold">{cur.title}</h1>
      <div className="mt-6 flex-1">{cur.body}</div>
      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <Button variant="outline" size="lg" className="h-12 rounded-xl" onClick={() => setStep(step - 1)}>
            <ArrowLeft /> Back
          </Button>
        )}
        <Button
          size="lg"
          className="h-12 flex-1 rounded-xl"
          disabled={!cur.valid || update.isPending}
          onClick={() => (step < steps.length - 1 ? setStep(step + 1) : finish())}
        >
          {step < steps.length - 1 ? <>Continue <ArrowRight /></> : update.isPending ? "Setting up…" : "Start studying"}
        </Button>
      </div>
    </div>
  );
}
