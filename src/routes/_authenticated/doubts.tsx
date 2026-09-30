import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/Shell";

export const Route = createFileRoute("/_authenticated/doubts")({
  head: () => ({ meta: [{ title: "Doubts — FocusStudy" }, { name: "description", content: "Doubts in FocusStudy." }, { property: "og:title", content: "Doubts — FocusStudy" }, { property: "og:description", content: "Doubts in FocusStudy." }] }),
  component: () => (
    <div>
      <PageHeader title="Doubts" />
      <EmptyState title="Being built" text="This section is next on the list." />
    </div>
  ),
});
