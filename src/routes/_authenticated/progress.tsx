import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/Shell";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Progress — FocusStudy" }, { name: "description", content: "Progress in FocusStudy." }, { property: "og:title", content: "Progress — FocusStudy" }, { property: "og:description", content: "Progress in FocusStudy." }] }),
  component: () => (
    <div>
      <PageHeader title="Progress" />
      <EmptyState title="Being built" text="This section is next on the list." />
    </div>
  ),
});
