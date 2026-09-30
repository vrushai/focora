import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: () => (
    <Shell>
      <Outlet />
    </Shell>
  ),
});
