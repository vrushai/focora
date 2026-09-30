import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/Shell";

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({ meta: [{ title: "Study Groups — FocusStudy" }, { name: "description", content: "Study Groups in FocusStudy." }, { property: "og:title", content: "Study Groups — FocusStudy" }, { property: "og:description", content: "Study Groups in FocusStudy." }] }),
  component: () => (
    <div>
      <PageHeader title="Study Groups" />
      <EmptyState title="Being built" text="This section is next on the list." />
    </div>
  ),
});
