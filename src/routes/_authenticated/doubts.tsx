import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Search, Sparkles, Lightbulb, ListOrdered, Globe, HelpCircle, Loader2, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useDoubts, useProfile, type Doubt } from "@/lib/data";
import { solveDoubt, type DoubtAnswer } from "@/lib/doubt.functions";
import { SUBJECTS } from "@/components/Onboarding";

export const Route = createFileRoute("/_authenticated/doubts")({
  head: () => ({ meta: [{ title: "Ask a Doubt — focora" }, { name: "description", content: "Get clear, grade-appropriate explanations for your study doubts." }, { property: "og:title", content: "Ask a Doubt — focora" }, { property: "og:description", content: "Get clear, grade-appropriate explanations for your study doubts." }] }),
  component: DoubtsPage,
});

type Mode = "default" | "different" | "example" | "simpler";

function DoubtsPage() {
  const profile = useProfile().data;
  const doubts = useDoubts();
  const qc = useQueryClient();
  const solve = useServerFn(solveDoubt);
  const subjects = Array.from(new Set([...(profile?.subjects ?? []), ...SUBJECTS, "General"]));
  const [tab, setTab] = useState<"ask" | "history">("ask");
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState(profile?.subjects?.[0] ?? "General");
  const [topic, setTopic] = useState("");
  const [answer, setAnswer] = useState<DoubtAnswer | null>(null);
  const [current, setCurrent] = useState<{ question: string; subject: string; topic: string; id?: string | undefined } | null>(null);
  const [loading, setLoading] = useState<Mode | null>(null);
  const [search, setSearch] = useState("");

  const ask = async (mode: Mode) => {
    const base = mode === "default" ? { question: q.trim(), subject, topic: topic.trim() } : current;
    if (!base || base.question.length < 3) { toast.error("Type your question first."); return; }
    setLoading(mode);
    try {
      const prev = mode !== "default" && answer ? `${answer.simple}\n${answer.steps.join("\n")}\n${answer.example}` : undefined;
      const res = await solve({ data: { ...base, grade: profile?.grade ?? "", mode, previous: prev } });
      setAnswer(res);
      if (mode === "default") {
        const { data } = await supabase.from("doubts").insert({ question: base.question, subject: base.subject, topic: base.topic, answer: res as unknown as Json }).select().single();
        setCurrent({ ...base, id: data?.id });
      } else if (current?.id) {
        await supabase.from("doubts").update({ answer: res }).eq("id", current.id);
      }
      qc.invalidateQueries({ queryKey: ["doubts"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const reopen = (d: Doubt) => {
    setCurrent({ question: d.question, subject: d.subject, topic: d.topic, id: d.id });
    setAnswer(d.answer as unknown as DoubtAnswer);
    setQ(d.question); setSubject(d.subject); setTopic(d.topic);
    setTab("ask");
  };
  const removeDoubt = async (id: string) => {
    await supabase.from("doubts").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["doubts"] });
  };

  const s = search.toLowerCase();
  const history = (doubts.data ?? []).filter((d) => !s || [d.question, d.subject, d.topic].some((x) => x.toLowerCase().includes(s)));

  return (
    <div>
      <PageHeader title="Ask a Doubt" subtitle="Understand it, don't just memorise it." />
      <Tabs value={tab} onValueChange={(v) => setTab(v as "ask" | "history")}>
        <TabsList className="mb-4 h-11 rounded-xl">
          <TabsTrigger value="ask" className="rounded-lg">Ask</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg">History {doubts.data?.length ? <span className="ml-1 text-muted-foreground">{doubts.data.length}</span> : null}</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "ask" ? (
        <div className="space-y-5">
          <form onSubmit={(e) => { e.preventDefault(); ask("default"); }} className="space-y-3 rounded-2xl border bg-card p-4">
            <Textarea rows={3} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Why does an object continue moving when no force is applied?" className="text-base" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{subjects.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topic">Topic</Label>
                <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Laws of motion" className="h-11" />
              </div>
            </div>
            <Button type="submit" className="h-12 w-full rounded-xl" disabled={!!loading}>
              {loading === "default" ? <Loader2 className="animate-spin" /> : <Sparkles />} Explain this
            </Button>
          </form>

          {answer && (
            <div className="space-y-3">
              {current && <p className="text-sm text-muted-foreground">{current.subject}{current.topic && ` · ${current.topic}`} — <span className="text-foreground">{current.question}</span></p>}
              <Section icon={Lightbulb} title="Simple explanation"><p>{answer.simple}</p></Section>
              <Section icon={ListOrdered} title="Step by step">
                <ol className="list-decimal space-y-1.5 pl-5">{answer.steps.map((st, i) => <li key={i}>{st}</li>)}</ol>
              </Section>
              {!!answer.key_points?.length && (
                <Section icon={Sparkles} title="Key points & formulas">
                  <ul className="list-disc space-y-1.5 pl-5">{answer.key_points.map((k, i) => <li key={i}>{k}</li>)}</ul>
                </Section>
              )}
              <Section icon={Globe} title="Example"><p>{answer.example}</p></Section>
              {answer.common_mistake && <Section icon={Lightbulb} title="Common mistake"><p>{answer.common_mistake}</p></Section>}
              <Section icon={HelpCircle} title="Check your understanding"><p className="font-medium">{answer.check_question}</p></Section>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button variant="default" className="rounded-xl" onClick={() => { toast.success("Great! Keep going."); setAnswer(null); setQ(""); setTopic(""); setCurrent(null); }}>I understand</Button>
                {([["different", "Explain differently"], ["example", "Give an example"], ["simpler", "Make it simpler"]] as const).map(([m, l]) => (
                  <Button key={m} variant="outline" className="rounded-xl" disabled={!!loading} onClick={() => ask(m)}>
                    {loading === m && <Loader2 className="animate-spin" />}{l}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your doubts" className="h-11 pl-9" />
          </div>
          {history.length === 0 ? (
            <EmptyState title="No doubts yet" text="Questions you ask will be saved here." />
          ) : history.map((d) => (
            <div key={d.id} className="flex items-start gap-2 rounded-2xl border bg-card p-3.5">
              <button className="min-w-0 flex-1 text-left" onClick={() => reopen(d)}>
                <p className="text-xs text-muted-foreground">{d.subject}{d.topic && ` · ${d.topic}`} · {format(new Date(d.created_at), "d MMM yyyy")}</p>
                <p className="mt-0.5 font-medium">{d.question}</p>
              </button>
              <Button size="icon" variant="ghost" className="size-9 rounded-full" aria-label="Delete doubt" onClick={() => removeDoubt(d.id)}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Lightbulb; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><Icon className="size-4" />{title}</p>
      <div className="text-[15px] leading-relaxed">{children}</div>
    </div>
  );
}
