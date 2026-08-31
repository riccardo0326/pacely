import {
  intensityMetricSchema,
  workoutBlockSchema,
  type WorkoutBlock,
} from "@/lib/llm/schemas";

export type EditableBlock = {
  type: WorkoutBlock["type"];
  durationMin: number;
  description: string;
  zone: string;
  metric: string;
};

export function parseEditableBlocks(raw: unknown): EditableBlock[] {
  const parsed = workoutBlockSchema.array().safeParse(raw);
  if (!parsed.success) {
    return [
      {
        type: "main-set",
        durationMin: 20,
        description: "",
        zone: "",
        metric: "",
      },
    ];
  }
  return parsed.data.map((block) => ({
    type: block.type,
    durationMin: block.durationMin,
    description: block.description,
    zone: block.target?.zone != null ? String(block.target.zone) : "",
    metric: block.target?.metric ?? "",
  }));
}

export function toStoredWorkoutBlocks(blocks: EditableBlock[]): WorkoutBlock[] {
  return blocks.map((block) => {
    const zoneRaw = block.zone.trim();
    const zone = zoneRaw ? Number(zoneRaw) : undefined;
    const metric = intensityMetricSchema.safeParse(block.metric);
    const targetZone = Number.isInteger(zone) ? zone : undefined;
    const targetMetric = metric.success ? metric.data : undefined;
    const target =
      targetZone != null || targetMetric
        ? { zone: targetZone, metric: targetMetric }
        : undefined;
    return {
      type: block.type,
      durationMin: block.durationMin,
      description: block.description.trim() || "Blocco",
      target,
    };
  });
}
