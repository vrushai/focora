import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/Shell";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — FocusStudy" }, { name: "description", content: "Notifications in FocusStudy." }, { property: "og:title", content: "Notifications — FocusStudy" }, { property: "og:description", content: "Notifications in FocusStudy." }] }),
  component: () => (
    <div>
      <PageHeader title="Notifications" />
      <EmptyState title="Being built" text="This section is next on the list." />
    </div>
  ),
});
