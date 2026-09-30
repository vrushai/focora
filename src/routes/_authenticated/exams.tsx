import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/Shell";

export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({ meta: [{ title: "Exams — FocusStudy" }, { name: "description", content: "Exams in FocusStudy." }, { property: "og:title", content: "Exams — FocusStudy" }, { property: "og:description", content: "Exams in FocusStudy." }] }),
  component: () => (
    <div>
      <PageHeader title="Exams" />
      <EmptyState title="Being built" text="This section is next on the list." />
    </div>
  ),
});
