import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Timer, ListChecks, MessageCircleQuestion } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — focora" },
      { name: "description", content: "Sign in to focora to plan, focus and track your study progress." },
      { property: "og:title", content: "Sign in — focora" },
      { property: "og:description", content: "Sign in to focora to plan, focus and track your study progress." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-focus-bg p-12 text-focus-fg md:flex">
        <Logo />
        <div>
          <h1 className="text-5xl font-semibold leading-tight">Focus on<br />what matters.</h1>
          <p className="mt-4 max-w-sm text-focus-fg/70">Plan your day, study without distractions, clear your doubts and build a streak that sticks.</p>
          <ul className="mt-10 space-y-4 text-sm text-focus-fg/85">
            <li className="flex items-center gap-3"><ListChecks className="size-5" /> Tasks, deadlines and smart reminders</li>
            <li className="flex items-center gap-3"><Timer className="size-5" /> Distraction-free focus sessions</li>
            <li className="flex items-center gap-3"><MessageCircleQuestion className="size-5" /> Ask doubts without leaving your study flow</li>
          </ul>
        </div>
        <p className="text-xs text-focus-fg/50">Plan → Focus → Learn → Complete → Improve</p>
      </div>
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="md:hidden"><Logo /></div>
          <h2 className="mt-8 text-2xl font-semibold md:mt-0">{mode === "in" ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{mode === "in" ? "Sign in to continue studying." : "It takes less than a minute."}</p>
          <Button variant="outline" className="mt-6 h-12 w-full rounded-xl" onClick={google}>
            <svg viewBox="0 0 24 24" className="size-4"><path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.23 1.5-1.7 4.4-5.35 4.4-3.22 0-5.85-2.67-5.85-5.95S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.68 3.94 14.55 3 12 3 7.03 3 3 7.03 3 12s4.03 9 9 9c5.2 0 8.64-3.65 8.64-8.8 0-.6-.07-1.05-.29-1.1z" /></svg>
            Continue with Google
          </Button>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required className="h-12" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} className="h-12" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="h-12 w-full rounded-xl" disabled={busy}>
              {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "in" ? "New to focora?" : "Already have an account?"}{" "}
            <button className="font-medium text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
