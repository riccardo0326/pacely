import {
  EXTEND_RECOVERY_MAX_WORKOUTS,
  LOAD_SCALE,
  MIN_BLOCK_DURATION_MIN,
  REDUCE_LOAD_MAX_WORKOUTS,
  RECALC_ACTION,
  type RecalcAction,
} from "@/lib/feedback/constants";
import type { RecalcChanges, RecalcWorkoutPatch } from "@/lib/feedback/schema";
import type { FeedbackAnalysisOutput } from "@/lib/llm/schemas";
import { workoutBlockSchema, type WorkoutBlock } from "@/lib/llm/schemas";
import { WORKOUT_STATUS } from "@/lib/matching/constants";
import { addUtcDays, utcDateKey } from "@/lib/metrics/dates";

export type RecalcTargetWorkout = {
  id: string;
  weekId: string;
  name: string;
  plannedDate: Date;
  dayOfWeek: number;
  durationMin: number;
  tss: number;
  status: string;
  weekLoadTarget: number;
  blocks: unknown;
};

export type RecalcSkipReason =
  | "outside_window"
  | "not_significant"
  | "pending_exists"
  | "no_future_workouts";

export type RecalcProposalDraft = {
  weekId: string;
  rationale: string;
  changes: RecalcChanges;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function parseBlocks(raw: unknown): WorkoutBlock[] {
  const parsed = workoutBlockSchema.array().safeParse(raw);
  return parsed.success ? parsed.data : [];
}

function scaleBlocks(blocks: WorkoutBlock[], factor: number): WorkoutBlock[] {
  return blocks.map((block) => ({
    ...block,
    durationMin: Math.max(
      MIN_BLOCK_DURATION_MIN,
      Math.round(block.durationMin * factor),
    ),
  }));
}

function loadPatch(
  workout: RecalcTargetWorkout,
  factor: number,
  nameTo?: string,
): RecalcWorkoutPatch {
  const blocks = parseBlocks(workout.blocks);
  const scaledBlocks = scaleBlocks(blocks, factor);
  const durationMin = scaledBlocks.reduce(
    (sum, block) => sum + block.durationMin,
    0,
  );
  const tss = round1(workout.tss * factor);
  const name = nameTo && nameTo !== workout.name ? nameTo : undefined;

  return {
    workoutId: workout.id,
    weekId: workout.weekId,
    name: name ? { from: workout.name, to: name } : undefined,
    durationMin:
      durationMin !== workout.durationMin
        ? { from: workout.durationMin, to: durationMin }
        : undefined,
    tss: tss !== workout.tss ? { from: workout.tss, to: tss } : undefined,
    blocks: scaledBlocks.length > 0 ? scaledBlocks : undefined,
  };
}

function recoveryName(name: string): string {
  if (name.startsWith("Recupero")) {
    return name;
  }
  return `Recupero · ${name}`;
}

function futurePlanned(
  source: RecalcTargetWorkout,
  workouts: RecalcTargetWorkout[],
): RecalcTargetWorkout[] {
  const after = source.plannedDate.getTime();
  return workouts
    .filter(
      (workout) =>
        workout.id !== source.id &&
        workout.status === WORKOUT_STATUS.planned &&
        workout.plannedDate.getTime() > after,
    )
    .sort((a, b) => a.plannedDate.getTime() - b.plannedDate.getTime());
}

function occupiedDateKeys(workouts: RecalcTargetWorkout[]): Set<string> {
  return new Set(workouts.map((workout) => utcDateKey(workout.plannedDate)));
}

function shiftRestDayPatch(
  next: RecalcTargetWorkout,
  occupied: Set<string>,
): RecalcWorkoutPatch {
  const fromKey = utcDateKey(next.plannedDate);
  const toKey = addUtcDays(fromKey, 1);
  if (occupied.has(toKey)) {
    return loadPatch(next, LOAD_SCALE.reduce_load);
  }
  return {
    workoutId: next.id,
    weekId: next.weekId,
    plannedDate: { from: fromKey, to: toKey },
    dayOfWeek: {
      from: next.dayOfWeek,
      to: (next.dayOfWeek + 1) % 7,
    },
  };
}

function weekPatches(workouts: RecalcWorkoutPatch[]): RecalcChanges["weeks"] {
  const byWeek = new Map<
    string,
    { from: number; delta: number; weekLoadTarget: number }
  >();

  for (const patch of workouts) {
    const tssDelta = patch.tss != null ? patch.tss.to - patch.tss.from : 0;
    const existing = byWeek.get(patch.weekId);
    if (existing) {
      existing.delta += tssDelta;
    } else {
      byWeek.set(patch.weekId, {
        from: 0,
        delta: tssDelta,
        weekLoadTarget: 0,
      });
    }
  }

  return [...byWeek.entries()].map(([weekId, row]) => ({
    weekId,
    weekLoadTarget: {
      from: row.from,
      to: round1(row.from + row.delta),
    },
  }));
}

function attachWeekLoads(
  patches: RecalcWorkoutPatch[],
  targets: RecalcTargetWorkout[],
): RecalcChanges["weeks"] {
  const loadByWeek = new Map<string, number>();
  for (const workout of targets) {
    if (!loadByWeek.has(workout.weekId)) {
      loadByWeek.set(workout.weekId, workout.weekLoadTarget);
    }
  }

  const weeks = weekPatches(patches);
  return weeks
    .map((week) => {
      const from = loadByWeek.get(week.weekId) ?? week.weekLoadTarget.from;
      const delta = week.weekLoadTarget.to - week.weekLoadTarget.from;
      return {
        weekId: week.weekId,
        weekLoadTarget: { from, to: round1(from + delta) },
      };
    })
    .filter((week) => week.weekLoadTarget.from !== week.weekLoadTarget.to);
}

export function resolveRecalcAction(
  analysis: FeedbackAnalysisOutput,
): RecalcAction {
  if (
    analysis.suggestedAction === RECALC_ACTION.reduceLoad ||
    analysis.suggestedAction === RECALC_ACTION.shiftRestDay ||
    analysis.suggestedAction === RECALC_ACTION.extendRecovery
  ) {
    return analysis.suggestedAction;
  }
  return RECALC_ACTION.reduceLoad;
}

export function isSignificantDeviation(
  analysis: FeedbackAnalysisOutput,
): boolean {
  return analysis.planDeviation === "significant";
}

export function buildRecalcChanges(
  action: RecalcAction,
  source: RecalcTargetWorkout,
  workouts: RecalcTargetWorkout[],
): RecalcChanges | null {
  const upcoming = futurePlanned(source, workouts);
  if (upcoming.length === 0) {
    return null;
  }

  let patches: RecalcWorkoutPatch[] = [];

  if (action === RECALC_ACTION.shiftRestDay) {
    const next = upcoming[0];
    if (!next) {
      return null;
    }
    patches = [shiftRestDayPatch(next, occupiedDateKeys(workouts))];
  } else if (action === RECALC_ACTION.extendRecovery) {
    patches = upcoming
      .slice(0, EXTEND_RECOVERY_MAX_WORKOUTS)
      .map((workout) =>
        loadPatch(
          workout,
          LOAD_SCALE.extend_recovery,
          recoveryName(workout.name),
        ),
      );
  } else {
    patches = upcoming
      .slice(0, REDUCE_LOAD_MAX_WORKOUTS)
      .map((workout) => loadPatch(workout, LOAD_SCALE.reduce_load));
  }

  const meaningful = patches.filter(
    (patch) =>
      patch.name != null ||
      patch.durationMin != null ||
      patch.tss != null ||
      patch.dayOfWeek != null ||
      patch.plannedDate != null,
  );
  if (meaningful.length === 0) {
    return null;
  }

  return {
    action,
    workouts: meaningful,
    weeks: attachWeekLoads(meaningful, workouts),
  };
}

export function rationaleFromAnalysis(
  analysis: FeedbackAnalysisOutput,
): string {
  return analysis.deviationSummary;
}
