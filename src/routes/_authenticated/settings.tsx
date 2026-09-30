import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/Shell";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — FocusStudy" }, { name: "description", content: "Settings in FocusStudy." }, { property: "og:title", content: "Settings — FocusStudy" }, { property: "og:description", content: "Settings in FocusStudy." }] }),
  component: () => (
    <div>
      <PageHeader title="Settings" />
      <EmptyState title="Being built" text="This section is next on the list." />
    </div>
  ),
});
