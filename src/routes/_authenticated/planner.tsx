import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/Shell";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [{ title: "Plan My Day — FocusStudy" }, { name: "description", content: "Plan My Day in FocusStudy." }, { property: "og:title", content: "Plan My Day — FocusStudy" }, { property: "og:description", content: "Plan My Day in FocusStudy." }] }),
  component: () => (
    <div>
      <PageHeader title="Plan My Day" />
      <EmptyState title="Being built" text="This section is next on the list." />
    </div>
  ),
});
