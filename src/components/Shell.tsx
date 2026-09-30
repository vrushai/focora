import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Home, ListChecks, Timer, MessageCircleQuestion, BarChart3, Settings, Bell, CalendarClock,
  GraduationCap, Users, Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useExams, useNotifications, useProfile, useSessions, useTasks } from "@/lib/data";
import { useReminders } from "@/lib/reminders";
import { Onboarding } from "./Onboarding";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/focus", label: "Focus", icon: Timer },
  { to: "/doubts", label: "Doubts", icon: MessageCircleQuestion },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const MORE = [
  { to: "/planner", label: "Plan My Day", icon: Sparkles },
  { to: "/exams", label: "Exams", icon: GraduationCap },
  { to: "/groups", label: "Study Groups", icon: Users },
  { to: "/notifications", label: "Notifications", icon: Bell },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const profile = useProfile();
  const tasks = useTasks();
  const exams = useExams();
  const sessions = useSessions();
  const notifs = useNotifications();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useReminders(profile.data, tasks.data, exams.data, sessions.data);

  if (loading || (user && profile.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-10 animate-pulse rounded-2xl bg-primary/20" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;
  if (profile.data && !profile.data.onboarded) return <Onboarding profile={profile.data} />;

  const unread = notifs.data?.filter((n) => !n.read).length ?? 0;
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar px-4 py-6 md:flex">
        <Link to="/" className="px-2"><Logo /></Link>
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive(n.to) && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <n.icon className="size-[18px]" /> {n.label}
            </Link>
          ))}
        </nav>
        <p className="mt-8 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">More</p>
        <nav className="mt-2 flex flex-col gap-1">
          {MORE.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive(n.to) && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <n.icon className="size-[18px]" /> {n.label}
              {n.to === "/notifications" && unread > 0 && (
                <span className="ml-auto rounded-full bg-primary px-2 text-xs text-primary-foreground">{unread}</span>
              )}
            </Link>
          ))}
        </nav>
        <p className="mt-auto px-3 text-xs text-muted-foreground">Focus on what matters.</p>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-3 backdrop-blur md:hidden">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-1">
            <Link to="/planner" aria-label="Plan my day" className="rounded-full p-2.5 hover:bg-muted"><CalendarClock className="size-5" /></Link>
            <Link to="/notifications" aria-label="Notifications" className="relative rounded-full p-2.5 hover:bg-muted">
              <Bell className="size-5" />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-streak" />}
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground",
              isActive(n.to) && "text-primary",
            )}
          >
            <n.icon className="size-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
