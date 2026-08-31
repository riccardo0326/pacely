import type { PerformanceReportOutput } from "@/lib/llm/schemas";

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-xl border border-border bg-background p-4">
      <h2 className="font-medium">{title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function PerformanceReportView({
  content,
}: {
  content: PerformanceReportOutput;
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-background p-4">
        <h2 className="font-medium">Sintesi</h2>
        <p className="mt-2 text-sm leading-relaxed">{content.summary}</p>
      </section>
      <ReportList title="Punti di forza" items={content.strengths} />
      <ReportList title="Aree di miglioramento" items={content.improvements} />
      <ReportList title="Suggerimenti" items={content.suggestions} />
      <p className="text-xs text-muted-foreground">
        Il report è informativo: non modifica il programma di allenamento.
      </p>
    </div>
  );
}
