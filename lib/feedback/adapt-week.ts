import {
  ADAPT_TSS_BAND,
  EXTRA_LOAD_DURATION_MIN,
  EXTRA_LOAD_TSS,
  KEY_SESSION_SKIP_TAGS,
  LOAD_SCALE,
  MIN_BLOCK_DURATION_MIN,
  RECALC_ACTION,
  RECALC_OP,
  type RecalcOp,
  type SituationTag,
} from "@/lib/feedback/constants";
import type { RecalcChanges, RecalcWorkoutPatch } from "@/lib/feedback/schema";
import type {
  AdaptWeekInput,
  AdaptWeekLlmPatch,
  AdaptWeekOutput,
  WorkoutBlock,
} from "@/lib/llm/schemas";
import { workoutBlockSchema } from "@/lib/llm/schemas";
import { addUtcDays, parseUtcDateKey, utcToday } from "@/lib/metrics/dates";
import { WORKOUT_STATUS } from "@/lib/matching/constants";

const QUALITY_NAME =
  /tempo|soglia|vo2|ripetut|interval|threshold|race|gara|qualit|ftp|css/i;

export function allowsKeySessionSkip(tags: readonly string[]): boolean {
  return tags.some((tag) => KEY_SESSION_SKIP_TAGS.has(tag as SituationTag));
}

export function pickKeyWorkoutId(
  workouts: Array<{
    id: string;
    name: string;
    tss: number;
    blocks: unknown;
  }>,
): string | undefined {
  if (workouts.length === 0) {
    return undefined;
  }
  const quality = workouts.filter((workout) => {
    if (QUALITY_NAME.test(workout.name)) {
      return true;
    }
    const blocks = parseBlocks(workout.blocks);
    return blocks.some((block) => (block.target?.zone ?? 0) >= 4);
  });
  const pool = quality.length > 0 ? quality : workouts;
  return [...pool].sort((a, b) => b.tss - a.tss)[0]?.id;
}

export function isNotableExtraLoad(activity: {
  sport: string;
  durationMin: number;
  tssEstimate: number;
}): boolean {
  return (
    activity.sport === "other" ||
    activity.durationMin >= EXTRA_LOAD_DURATION_MIN ||
    activity.tssEstimate >= EXTRA_LOAD_TSS
  );
}

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

function durationFromBlocks(blocks: WorkoutBlock[]): number {
  return blocks.reduce((sum, block) => sum + block.durationMin, 0);
}

function softenBlocks(blocks: WorkoutBlock[]): WorkoutBlock[] {
  return blocks.map((block) => {
    const zone = block.target?.zone;
    const nextZone =
      zone != null ? Math.min(zone, 2) : block.type === "main-set" ? 2 : 1;
    return {
      ...block,
      description:
        block.type === "main-set"
          ? "Lavoro facile di recupero"
          : block.description,
      target: {
        ...block.target,
        zone: nextZone,
        description: "Recupero zona 1-2",
      },
    };
  });
}

function recoveryName(name: string): string {
  if (name.startsWith("Recupero")) {
    return name;
  }
  return `Recupero · ${name}`;
}

function weekDatesFromInput(input: AdaptWeekInput): string[] {
  const keys = new Set<string>();
  for (const workout of [
    ...input.remainingWorkouts,
    ...input.completedThisWeek,
  ]) {
    keys.add(workout.plannedDate);
  }
  return [...keys].sort();
}

export function dateForWeekdayInWeek(
  weekDates: string[],
  dayOfWeek: number,
): string | null {
  for (const key of weekDates) {
    if (parseUtcDateKey(key).getUTCDay() === dayOfWeek) {
      return key;
    }
  }
  const first = weekDates[0];
  if (!first) {
    return null;
  }
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = addUtcDays(first, offset);
    if (parseUtcDateKey(candidate).getUTCDay() === dayOfWeek) {
      return candidate;
    }
  }
  return addUtcDays(
    first,
    (dayOfWeek - parseUtcDateKey(first).getUTCDay() + 7) % 7,
  );
}

function laterFreeSlot(
  input: AdaptWeekInput,
  afterDate: string,
  occupied: Set<string>,
): { weekday: number; date: string } | null {
  const weekDates = weekDatesFromInput(input);
  const options = input.availableRemainingSlots
    .map((slot) => {
      const date = dateForWeekdayInWeek(weekDates, slot.weekday);
      return date ? { weekday: slot.weekday, date } : null;
    })
    .filter((row): row is { weekday: number; date: string } => row !== null)
    .filter((row) => row.date > afterDate && !occupied.has(row.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  return options[0] ?? null;
}

function patchIsMeaningful(patch: RecalcWorkoutPatch): boolean {
  return (
    patch.name != null ||
    patch.durationMin != null ||
    patch.tss != null ||
    patch.dayOfWeek != null ||
    patch.plannedDate != null ||
    patch.status != null ||
    patch.blocks != null
  );
}

function attachWeekLoads(
  patches: RecalcWorkoutPatch[],
  weekId: string,
  weekLoadTarget: number,
): RecalcChanges["weeks"] {
  const tssDelta = patches.reduce((sum, patch) => {
    if (patch.tss == null) {
      return sum;
    }
    return sum + (patch.tss.to - patch.tss.from);
  }, 0);
  if (tssDelta === 0) {
    return [];
  }
  return [
    {
      weekId,
      weekLoadTarget: {
        from: weekLoadTarget,
        to: round1(Math.max(0, weekLoadTarget + tssDelta)),
      },
    },
  ];
}

type Remaining = AdaptWeekInput["remainingWorkouts"][number];

function applyTimeCap(
  input: AdaptWeekInput,
  remaining: Remaining,
  durationMin: number,
  plannedDate: string,
): number {
  if (
    input.timeCapMin &&
    (!input.timeCapDate || input.timeCapDate === plannedDate)
  ) {
    return Math.min(durationMin, input.timeCapMin);
  }
  if (input.timeCapMin && remaining.plannedDate === input.timeCapDate) {
    return Math.min(durationMin, input.timeCapMin);
  }
  return durationMin;
}

function toRecalcPatch(
  current: Remaining,
  op: RecalcOp,
  next: {
    name?: string;
    durationMin?: number;
    tss?: number;
    dayOfWeek?: number;
    plannedDate?: string;
    blocks?: WorkoutBlock[];
    skip?: boolean;
  },
): RecalcWorkoutPatch {
  const patch: RecalcWorkoutPatch = {
    workoutId: current.id,
    weekId: current.weekId,
    op,
  };
  if (next.skip) {
    patch.status = { from: current.status, to: "skipped" };
    patch.tss = { from: current.tss, to: 0 };
    return patch;
  }
  if (next.name && next.name !== current.name) {
    patch.name = { from: current.name, to: next.name };
  }
  if (next.durationMin != null && next.durationMin !== current.durationMin) {
    patch.durationMin = { from: current.durationMin, to: next.durationMin };
  }
  if (next.tss != null && next.tss !== current.tss) {
    patch.tss = { from: current.tss, to: round1(next.tss) };
  }
  if (next.dayOfWeek != null && next.dayOfWeek !== current.dayOfWeek) {
    patch.dayOfWeek = { from: current.dayOfWeek, to: next.dayOfWeek };
  }
  if (next.plannedDate && next.plannedDate !== current.plannedDate) {
    patch.plannedDate = { from: current.plannedDate, to: next.plannedDate };
  }
  if (next.blocks && next.blocks.length > 0) {
    patch.blocks = next.blocks;
  }
  return patch;
}

function scaleOrRetypePatch(
  current: Remaining,
  raw: AdaptWeekLlmPatch,
  op: RecalcOp,
  plannedDate: string,
  input: AdaptWeekInput,
): RecalcWorkoutPatch {
  const blocks = parseBlocks(current.blocks);
  let factor = LOAD_SCALE.adapt_recover;
  if (raw.durationMin != null && current.durationMin > 0) {
    factor = raw.durationMin / current.durationMin;
  } else if (raw.tss != null && current.tss > 0) {
    factor = raw.tss / current.tss;
  } else if (op === "scale" && raw.durationMin == null && raw.tss == null) {
    factor = LOAD_SCALE.adapt_recover;
  }

  let nextBlocks =
    raw.blocks && raw.blocks.length > 0
      ? raw.blocks
      : scaleBlocks(blocks, factor);
  if (op === RECALC_OP.retype) {
    nextBlocks = softenBlocks(nextBlocks);
  }

  let durationMin =
    raw.durationMin ??
    (nextBlocks.length > 0
      ? durationFromBlocks(nextBlocks)
      : Math.max(
          MIN_BLOCK_DURATION_MIN,
          Math.round(current.durationMin * factor),
        ));
  durationMin = applyTimeCap(input, current, durationMin, plannedDate);

  if (nextBlocks.length > 0 && durationFromBlocks(nextBlocks) !== durationMin) {
    const blockFactor =
      durationFromBlocks(nextBlocks) > 0
        ? durationMin / durationFromBlocks(nextBlocks)
        : 1;
    nextBlocks = scaleBlocks(nextBlocks, blockFactor);
    durationMin = durationFromBlocks(nextBlocks);
  }

  const tss =
    raw.tss ??
    round1(current.tss * (durationMin / Math.max(current.durationMin, 1)));

  return toRecalcPatch(current, op, {
    name:
      raw.name ??
      (op === RECALC_OP.retype ? recoveryName(current.name) : undefined),
    durationMin,
    tss,
    blocks: nextBlocks.length > 0 ? nextBlocks : undefined,
  });
}

/**
 * Deterministic guardrail: drop illegal days, freeze completed, protect the
 * key session unless illness/injury, keep remaining TSS in band.
 */
export function repairAdaptWeek(
  input: AdaptWeekInput,
  output: AdaptWeekOutput,
): RecalcChanges | null {
  const remaining = new Map(
    input.remainingWorkouts.map((workout) => [workout.id, workout]),
  );
  const allowedDays = new Set(
    input.availableRemainingSlots.map((slot) => slot.weekday),
  );
  const weekDates = weekDatesFromInput(input);
  const today = utcToday();
  const canSkipKey = allowsKeySessionSkip(input.situationTags);
  const keyId = input.keyWorkoutId;
  const occupied = new Set(
    input.remainingWorkouts.map((workout) => workout.plannedDate),
  );
  const patched = new Set<string>();
  const patches: RecalcWorkoutPatch[] = [];

  function takeDate(from: string, to: string) {
    occupied.delete(from);
    occupied.add(to);
  }

  for (const raw of output.workouts) {
    const current = remaining.get(raw.workoutId);
    if (!current || current.status !== WORKOUT_STATUS.planned) {
      continue;
    }
    if (patched.has(current.id)) {
      continue;
    }

    let op: RecalcOp = raw.op;
    if (op === RECALC_OP.skip && current.id === keyId && !canSkipKey) {
      op = RECALC_OP.retype;
    }

    if (op === RECALC_OP.skip) {
      patches.push(toRecalcPatch(current, op, { skip: true }));
      occupied.delete(current.plannedDate);
      patched.add(current.id);
      continue;
    }

    if (op === RECALC_OP.swap && raw.swapWithWorkoutId) {
      const other = remaining.get(raw.swapWithWorkoutId);
      if (
        !other ||
        other.id === current.id ||
        patched.has(other.id) ||
        other.status !== WORKOUT_STATUS.planned
      ) {
        continue;
      }
      patches.push(
        toRecalcPatch(current, op, {
          dayOfWeek: other.dayOfWeek,
          plannedDate: other.plannedDate,
        }),
      );
      patches.push(
        toRecalcPatch(other, op, {
          dayOfWeek: current.dayOfWeek,
          plannedDate: current.plannedDate,
        }),
      );
      takeDate(current.plannedDate, other.plannedDate);
      takeDate(other.plannedDate, current.plannedDate);
      patched.add(current.id);
      patched.add(other.id);
      continue;
    }

    if (op === RECALC_OP.move) {
      let toDate = raw.plannedDate;
      let toDow = raw.dayOfWeek;
      if (toDow == null && toDate) {
        toDow = parseUtcDateKey(toDate).getUTCDay();
      }
      if (toDate == null && toDow != null) {
        toDate = dateForWeekdayInWeek(weekDates, toDow) ?? undefined;
      }
      if (
        toDate == null ||
        toDow == null ||
        !allowedDays.has(toDow) ||
        toDate < today ||
        (occupied.has(toDate) && toDate !== current.plannedDate)
      ) {
        op = RECALC_OP.retype;
      } else {
        takeDate(current.plannedDate, toDate);
        const moved = toRecalcPatch(current, RECALC_OP.move, {
          dayOfWeek: toDow,
          plannedDate: toDate,
        });
        const load = scaleOrRetypePatch(
          current,
          { ...raw, op: RECALC_OP.scale },
          RECALC_OP.scale,
          toDate,
          input,
        );
        patches.push({
          ...moved,
          name: load.name,
          durationMin: load.durationMin,
          tss: load.tss,
          blocks: load.blocks,
        });
        patched.add(current.id);
        continue;
      }
    }

    const plannedDate = current.plannedDate;
    const loadOp = op === RECALC_OP.retype ? RECALC_OP.retype : RECALC_OP.scale;
    patches.push(scaleOrRetypePatch(current, raw, loadOp, plannedDate, input));
    patched.add(current.id);
  }

  const meaningful = patches.filter(patchIsMeaningful);
  if (meaningful.length === 0) {
    return null;
  }

  const skippedIds = new Set(
    meaningful
      .filter((patch) => patch.status?.to === WORKOUT_STATUS.skipped)
      .map((patch) => patch.workoutId),
  );
  const originalRemaining = input.remainingTss;
  let nextRemaining = 0;
  for (const workout of input.remainingWorkouts) {
    if (skippedIds.has(workout.id)) {
      continue;
    }
    const patch = meaningful.find((row) => row.workoutId === workout.id);
    nextRemaining += patch?.tss?.to ?? workout.tss;
  }

  const minFactor = canSkipKey
    ? ADAPT_TSS_BAND.illnessMinFactor
    : ADAPT_TSS_BAND.minFactor;
  const minTss = originalRemaining * minFactor;
  const maxTss = originalRemaining * ADAPT_TSS_BAND.maxFactor;

  if (nextRemaining > maxTss && originalRemaining > 0) {
    const factor = maxTss / nextRemaining;
    for (const patch of meaningful) {
      if (patch.status?.to === WORKOUT_STATUS.skipped || patch.tss == null) {
        continue;
      }
      patch.tss = { from: patch.tss.from, to: round1(patch.tss.to * factor) };
    }
  } else if (
    nextRemaining < minTss &&
    nextRemaining > 0 &&
    originalRemaining > 0
  ) {
    const factor = minTss / nextRemaining;
    for (const patch of meaningful) {
      if (patch.status?.to === WORKOUT_STATUS.skipped || patch.tss == null) {
        continue;
      }
      patch.tss = { from: patch.tss.from, to: round1(patch.tss.to * factor) };
    }
  }

  const weekId = input.remainingWorkouts[0]?.weekId;
  if (!weekId) {
    return null;
  }

  return {
    action: RECALC_ACTION.adaptWeek,
    strategy: output.strategy,
    workouts: meaningful,
    weeks: attachWeekLoads(meaningful, weekId, input.weekLoadTarget),
  };
}

export function fallbackAdaptWeek(input: AdaptWeekInput): AdaptWeekOutput {
  const remaining = input.remainingWorkouts;
  const tags = new Set(input.situationTags);
  const illness = allowsKeySessionSkip(input.situationTags);
  const keyId = input.keyWorkoutId;
  const occupied = new Set(remaining.map((workout) => workout.plannedDate));
  const workouts: AdaptWeekLlmPatch[] = [];

  if (illness) {
    for (const workout of remaining) {
      if (workout.id === keyId && remaining.length > 1) {
        workouts.push({ workoutId: workout.id, op: "skip" });
      } else {
        workouts.push({
          workoutId: workout.id,
          op: "retype",
          name: recoveryName(workout.name),
          durationMin: Math.max(20, Math.round(workout.durationMin * 0.6)),
          tss: round1(workout.tss * 0.5),
        });
      }
    }
    return {
      rationale:
        "Situazione di salute: alleggeriamo il resto della settimana e proteggiamo il recupero. Puoi approvare o rifiutare.",
      strategy: "recover",
      workouts,
    };
  }

  const wantsRecover =
    tags.has("tired") ||
    tags.has("extra_load") ||
    tags.has("no_quality") ||
    tags.has("travel") ||
    tags.has("personal") ||
    tags.has("little_time");

  const key = remaining.find((workout) => workout.id === keyId);
  if (
    key &&
    (tags.has("extra_load") || tags.has("tired") || tags.has("no_quality"))
  ) {
    const later = laterFreeSlot(input, key.plannedDate, occupied);
    if (later) {
      workouts.push({
        workoutId: key.id,
        op: "move",
        dayOfWeek: later.weekday,
        plannedDate: later.date,
      });
    } else {
      workouts.push({
        workoutId: key.id,
        op: "retype",
        name: recoveryName(key.name),
        durationMin: Math.max(20, Math.round(key.durationMin * 0.7)),
        tss: round1(key.tss * 0.7),
      });
    }
  }

  const scaleFactor = input.timeCapMin ? 0.75 : wantsRecover ? 0.85 : 0.7;
  for (const workout of remaining) {
    if (workouts.some((patch) => patch.workoutId === workout.id)) {
      continue;
    }
    let durationMin = Math.max(
      20,
      Math.round(workout.durationMin * scaleFactor),
    );
    if (
      input.timeCapMin &&
      (!input.timeCapDate || workout.plannedDate === input.timeCapDate)
    ) {
      durationMin = Math.min(durationMin, input.timeCapMin);
    }
    workouts.push({
      workoutId: workout.id,
      op: tags.has("little_time") || input.timeCapMin ? "scale" : "retype",
      name:
        tags.has("little_time") || input.timeCapMin
          ? undefined
          : recoveryName(workout.name),
      durationMin,
      tss: round1(
        workout.tss * (durationMin / Math.max(workout.durationMin, 1)),
      ),
    });
  }

  if (workouts.length === 0) {
    const first = remaining[0];
    workouts.push({
      workoutId: first.id,
      op: "scale",
      durationMin: Math.max(20, Math.round(first.durationMin * 0.7)),
      tss: round1(first.tss * 0.7),
    });
  }

  const strategy = input.timeCapMin
    ? "timebox"
    : workouts.some((patch) => patch.op === "move")
      ? "postpone_quality"
      : "recover";

  return {
    rationale: `Adattamento conservativo alla situazione: "${input.situationText.slice(0, 160)}". Le sedute rimanenti vengono alleggerite o spostate; nulla viene applicato senza la tua approvazione.`,
    strategy,
    workouts,
  };
}
