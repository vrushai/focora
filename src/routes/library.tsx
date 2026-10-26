import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, Heart, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getLibraryDoubts, type LibraryEntry } from "@/lib/library.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library")({
  loader: () => getLibraryDoubts(),
  head: () => ({
    meta: [
      { title: "Doubt Library — focora" },
      { name: "description", content: "Browse clear, grade-appropriate explanations for common study doubts — free, no account needed." },
      { property: "og:title", content: "Doubt Library — focora" },
      { property: "og:description", content: "Clear explanations for common study doubts, free for every student." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://focora.lovable.app/library" }],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const entries = Route.useLoaderData();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [deltas, setDeltas] = useState<Record<string, number>>({});

  const heartsQ = useQuery({
    queryKey: ["my-library-hearts", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("doubt_hearts").select("doubt_id")).data?.map((r) => r.doubt_id) ?? [],
  });
  const isLiked = (id: string) => liked[id] ?? (heartsQ.data ?? []).includes(id);
  const heartCount = (e: LibraryEntry) => e.hearts + (deltas[e.id] ?? 0);

  const toggleHeart = async (ev: React.MouseEvent, entry: LibraryEntry) => {
    ev.stopPropagation();
    if (!user) return;
    const was = isLiked(entry.id);
    const next = !was;
    setLiked((p) => ({ ...p, [entry.id]: next }));
    setDeltas((p) => ({ ...p, [entry.id]: (p[entry.id] ?? 0) + (next ? 1 : -1) }));
    const { error } = await supabase.rpc("toggle_doubt_heart", { _doubt_id: entry.id });
    if (error) {
      setLiked((p) => ({ ...p, [entry.id]: was }));
      setDeltas((p) => ({ ...p, [entry.id]: (p[entry.id] ?? 0) + (next ? -1 : 1) }));
      toast.error("Couldn't save your heart. Please try again.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["my-library-hearts"] });
  };

  const subjects = ["All", ...Array.from(new Set(entries.map((e) => e.subject)))];
  const s = q.trim().toLowerCase();
  const list = entries.filter(
    (e) =>
      (subject === "All" || e.subject === subject) &&
      (!s || [e.question, e.subject, e.topic, e.answer.simple ?? ""].some((x) => x.toLowerCase().includes(s))),
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2"><Logo /></Link>
          {!user && (
            <Button asChild variant="outline" className="h-10 rounded-xl"><Link to="/auth">Sign in</Link></Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <div className="flex items-center gap-2 text-primary"><Sparkles className="size-5" /><p className="text-sm font-semibold uppercase tracking-wider">Doubt Library</p></div>
        <h1 className="mt-1 text-3xl font-semibold">Clear answers, free for every student.</h1>
        <p className="mt-2 text-muted-foreground">Real explanations to real study doubts — tap any question to see the full answer. No account needed.</p>

        {!user && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-primary p-4 text-primary-foreground">
            <p className="text-sm leading-snug">Sign in to ask your own doubts and share your solutions here.</p>
            <Button asChild variant="secondary" className="shrink-0 rounded-xl"><Link to="/auth">Sign in</Link></Button>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search doubts, topics, subjects…" className="h-12 pl-9" />
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {subjects.map((sub) => (
              <button key={sub} onClick={() => setSubject(sub)} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", subject === sub ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{sub}</button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-6 py-10 text-center">
              <p className="font-display text-lg font-semibold">Nothing here yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search or subject.</p>
            </div>
          ) : list.map((e) => {
            const open = openId === e.id;
            const hearted = user ? isLiked(e.id) : false;
            return (
              <div key={e.id} className="rounded-2xl border bg-card p-4">
                <div className="cursor-pointer" onClick={() => setOpenId(open ? null : e.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-primary">{e.subject}{e.topic && ` · ${e.topic}`}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      {user ? (
                        <button onClick={(ev) => toggleHeart(ev, e)} aria-label={hearted ? "Remove heart" : "Add heart"} className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-xs", hearted ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
                          <Heart className={cn("size-4", hearted && "fill-current")} />{heartCount(e)}
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Heart className="size-4" />{heartCount(e)}</span>
                      )}
                      <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                    </div>
                  </div>
                  <p className="mt-1.5 font-medium leading-snug">{e.question}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{e.author_name} · {format(new Date(e.created_at), "d MMM yyyy")}</p>
                </div>
                {open && <AnswerBlock a={e.answer} />}
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Plan → Focus → Learn → Complete → Improve · <Link to="/auth" className="text-primary">Start with focora</Link>
        </p>
      </main>
    </div>
  );
}

function AnswerBlock({ a }: { a: LibraryEntry["answer"] }) {
  return (
    <div className="mt-3 space-y-3 border-t pt-3 text-[15px] leading-relaxed">
      {a.simple && <Block title="Simple explanation"><p>{a.simple}</p></Block>}
      {!!a.steps?.length && <Block title="Step by step"><ol className="list-decimal space-y-1 pl-5">{a.steps.map((st, i) => <li key={i}>{st}</li>)}</ol></Block>}
      {!!a.key_points?.length && <Block title="Key points & formulas"><ul className="list-disc space-y-1 pl-5">{a.key_points.map((k, i) => <li key={i}>{k}</li>)}</ul></Block>}
      {a.example && <Block title="Example"><p>{a.example}</p></Block>}
      {a.common_mistake && <Block title="Common mistake"><p>{a.common_mistake}</p></Block>}
      {a.check_question && <Block title="Check yourself"><p className="font-medium">{a.check_question}</p></Block>}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-primary">{title}</p>
      <div>{children}</div>
    </div>
  );
}
