"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { evaluateRecalcFromFeedback } from "@/lib/feedback/evaluate";
import { RECALC_STATUS } from "@/lib/feedback/constants";
import { summarizeRecalcChanges } from "@/lib/feedback/labels";
import type { RecalcTargetWorkout } from "@/lib/feedback/proposal";
import { recalcChangesSchema, type RecalcChanges } from "@/lib/feedback/schema";
import type { FeedbackSummary } from "@/lib/feedback/summary";
import { getLLMProvider } from "@/lib/llm";
import { sportSchema } from "@/lib/llm/schemas";
import {
  assertAnalyzeFeedbackQuota,
  LlmQuotaExceededError,
} from "@/lib/llm/quota";
import { WORKOUT_STATUS } from "@/lib/matching/constants";
import { notifyRecalcProposal } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { routes } from "@/lib/routes";
import {
  proposalIdFormSchema,
  submitFeedbackFormSchema,
} from "@/lib/validation/feedback";

export type FeedbackActionResult =
  | {
      ok: true;
      proposalCreated: boolean;
      usedFallback: boolean;
    }
  | { ok: false; error: string };

export type { FeedbackSummary };

export type RecalcProposalView = {
  id: string;
  programId: string;
  programName: string;
  rationale: string;
  action: RecalcChanges["action"];
  summary: string;
  createdAt: string;
  workouts: Array<{
    workoutId: string;
    nameFrom: string;
    nameTo: string;
    plannedDateFrom: string | null;
    plannedDateTo: string | null;
    durationMinFrom: number | null;
    durationMinTo: number | null;
    tssFrom: number | null;
    tssTo: number | null;
  }>;
};

function revalidateFeedbackPaths(programId: string) {
  revalidatePath(routes.calendar);
  revalidatePath(routes.program(programId));
  revalidatePath(routes.programs);
  revalidatePath(routes.dashboard);
}

function toProposalView(
  row: {
    id: string;
    programId: string;
    rationale: string;
    changes: unknown;
    createdAt: Date;
    program: { name: string };
  },
  nameByWorkoutId: Map<string, string>,
): RecalcProposalView | null {
  const changes = recalcChangesSchema.safeParse(row.changes);
  if (!changes.success) {
    return null;
  }
  return {
    id: row.id,
    programId: row.programId,
    programName: row.program.name,
    rationale: row.rationale,
    action: changes.data.action,
    summary: summarizeRecalcChanges(changes.data),
    createdAt: row.createdAt.toISOString(),
    workouts: changes.data.workouts.map((patch) => {
      const currentName = nameByWorkoutId.get(patch.workoutId);
      const nameFrom = patch.name?.from ?? currentName ?? "Allenamento";
      return {
        workoutId: patch.workoutId,
        nameFrom,
        nameTo: patch.name?.to ?? nameFrom,
        plannedDateFrom: patch.plannedDate?.from ?? null,
        plannedDateTo: patch.plannedDate?.to ?? null,
        durationMinFrom: patch.durationMin?.from ?? null,
        durationMinTo: patch.durationMin?.to ?? null,
        tssFrom: patch.tss?.from ?? null,
        tssTo: patch.tss?.to ?? null,
      };
    }),
  };
}

function toTargetWorkout(workout: {
  id: string;
  weekId: string;
  name: string;
  plannedDate: Date;
  dayOfWeek: number;
  durationMin: number;
  tss: number;
  status: string;
  blocks: unknown;
  week: { weekLoadTarget: number };
}): RecalcTargetWorkout {
  return {
    id: workout.id,
    weekId: workout.weekId,
    name: workout.name,
    plannedDate: workout.plannedDate,
    dayOfWeek: workout.dayOfWeek,
    durationMin: workout.durationMin,
    tss: workout.tss,
    status: workout.status,
    weekLoadTarget: workout.week.weekLoadTarget,
    blocks: workout.blocks,
  };
}

export async function listPendingRecalcProposals(): Promise<
  RecalcProposalView[]
> {
  const user = await requireUser();
  const rows = await prisma.recalcProposal.findMany({
    where: {
      status: RECALC_STATUS.pending,
      program: { userId: user.id },
    },
    include: { program: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const workoutIds = rows.flatMap((row) => {
    const changes = recalcChangesSchema.safeParse(row.changes);
    return changes.success
      ? changes.data.workouts.map((patch) => patch.workoutId)
      : [];
  });
  const workouts =
    workoutIds.length === 0
      ? []
      : await prisma.workout.findMany({
          where: {
            id: { in: workoutIds },
            week: { program: { userId: user.id } },
          },
          select: { id: true, name: true },
        });
  const nameByWorkoutId = new Map(
    workouts.map((workout) => [workout.id, workout.name]),
  );

  return rows
    .map((row) => toProposalView(row, nameByWorkoutId))
    .filter((view): view is RecalcProposalView => view !== null);
}

export async function getPendingRecalcProposalForProgram(
  programId: string,
): Promise<RecalcProposalView | null> {
  const user = await requireUser();
  const row = await prisma.recalcProposal.findFirst({
    where: {
      programId,
      status: RECALC_STATUS.pending,
      program: { userId: user.id },
    },
    include: { program: { select: { name: true } } },
  });
  if (!row) {
    return null;
  }
  const changes = recalcChangesSchema.safeParse(row.changes);
  const ids = changes.success
    ? changes.data.workouts.map((patch) => patch.workoutId)
    : [];
  const workouts =
    ids.length === 0
      ? []
      : await prisma.workout.findMany({
          where: {
            id: { in: ids },
            week: { program: { userId: user.id } },
          },
          select: { id: true, name: true },
        });
  return toProposalView(
    row,
    new Map(workouts.map((workout) => [workout.id, workout.name])),
  );
}

export async function submitWorkoutFeedback(
  formData: FormData,
): Promise<FeedbackActionResult> {
  const user = await requireUser();
  const parsed = submitFeedbackFormSchema.safeParse({
    workoutId: formData.get("workoutId"),
    freeText: formData.get("freeText"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Scrivi almeno 10 caratteri di feedback",
    };
  }

  const workout = await prisma.workout.findFirst({
    where: {
      id: parsed.data.workoutId,
      week: { program: { userId: user.id } },
    },
    include: {
      activity: {
        select: { durationSec: true },
      },
      feedback: { select: { id: true } },
      week: {
        include: {
          program: {
            select: {
              id: true,
              name: true,
              startDate: true,
              durationWeeks: true,
            },
          },
        },
      },
    },
  });

  if (!workout) {
    return { ok: false, error: "Allenamento non trovato" };
  }
  if (workout.status !== WORKOUT_STATUS.completed) {
    return {
      ok: false,
      error: "Puoi lasciare un feedback solo dopo un allenamento completato",
    };
  }
  if (workout.feedback) {
    return {
      ok: false,
      error: "Hai già lasciato un feedback su questo allenamento",
    };
  }

  try {
    await assertAnalyzeFeedbackQuota(user.id);
  } catch (error) {
    if (error instanceof LlmQuotaExceededError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const sport = sportSchema.safeParse(workout.sport);
  const provider = getLLMProvider();
  const result = await provider.analyzeFeedback({
    userId: user.id,
    freeText: parsed.data.freeText,
    sport: sport.success ? sport.data : undefined,
    plannedTss: workout.tss,
    plannedDurationMin: workout.durationMin,
    actualDurationMin: workout.activity
      ? Math.round(workout.activity.durationSec / 60)
      : undefined,
  });

  const programWorkouts = await prisma.workout.findMany({
    where: { week: { programId: workout.week.program.id } },
    include: { week: { select: { weekLoadTarget: true } } },
    orderBy: { plannedDate: "asc" },
  });

  const pendingCount = await prisma.recalcProposal.count({
    where: {
      programId: workout.week.program.id,
      status: RECALC_STATUS.pending,
    },
  });

  const source = toTargetWorkout({
    ...workout,
    week: { weekLoadTarget: workout.week.weekLoadTarget },
  });
  const evaluation = evaluateRecalcFromFeedback({
    analysis: result.data,
    programStartDate: workout.week.program.startDate,
    durationWeeks: workout.week.program.durationWeeks,
    sourceWorkout: source,
    programWorkouts: programWorkouts.map(toTargetWorkout),
    hasPendingProposal: pendingCount > 0,
  });

  const createdProposal = await prisma.$transaction(async (tx) => {
    const feedback = await tx.workoutFeedback.create({
      data: {
        workoutId: workout.id,
        freeText: parsed.data.freeText,
        analysis: result.data as Prisma.InputJsonValue,
      },
    });

    if (!evaluation.proposal) {
      return null;
    }

    return tx.recalcProposal.create({
      data: {
        programId: workout.week.program.id,
        weekId: evaluation.proposal.weekId,
        feedbackId: feedback.id,
        rationale: evaluation.proposal.rationale,
        changes: evaluation.proposal.changes as Prisma.InputJsonValue,
        status: RECALC_STATUS.pending,
      },
      select: { id: true },
    });
  });

  if (createdProposal) {
    try {
      await notifyRecalcProposal({
        userId: user.id,
        programId: workout.week.program.id,
        proposalId: createdProposal.id,
        programName: workout.week.program.name,
      });
    } catch (error) {
      console.error("recalc proposal notification failed", error);
    }
  }

  revalidateFeedbackPaths(workout.week.program.id);
  revalidatePath(routes.notifications, "layout");
  revalidatePath("/", "layout");
  return {
    ok: true,
    proposalCreated: evaluation.proposal !== null,
    usedFallback: result.usedFallback,
  };
}

async function loadOwnedPendingProposal(userId: string, proposalId: string) {
  return prisma.recalcProposal.findFirst({
    where: {
      id: proposalId,
      status: RECALC_STATUS.pending,
      program: { userId },
    },
    select: {
      id: true,
      programId: true,
      changes: true,
    },
  });
}

export async function rejectRecalcProposal(
  formData: FormData,
): Promise<FeedbackActionResult> {
  const user = await requireUser();
  const parsed = proposalIdFormSchema.safeParse({
    proposalId: formData.get("proposalId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Proposta non valida" };
  }

  const proposal = await loadOwnedPendingProposal(
    user.id,
    parsed.data.proposalId,
  );
  if (!proposal) {
    return { ok: false, error: "Proposta non trovata o già risolta" };
  }

  await prisma.recalcProposal.update({
    where: { id: proposal.id },
    data: {
      status: RECALC_STATUS.rejected,
      resolvedAt: new Date(),
    },
  });

  revalidateFeedbackPaths(proposal.programId);
  return { ok: true, proposalCreated: false, usedFallback: false };
}

export async function approveRecalcProposal(
  formData: FormData,
): Promise<FeedbackActionResult> {
  const user = await requireUser();
  const parsed = proposalIdFormSchema.safeParse({
    proposalId: formData.get("proposalId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Proposta non valida" };
  }

  const proposal = await loadOwnedPendingProposal(
    user.id,
    parsed.data.proposalId,
  );
  if (!proposal) {
    return { ok: false, error: "Proposta non trovata o già risolta" };
  }

  const changes = recalcChangesSchema.safeParse(proposal.changes);
  if (!changes.success) {
    return { ok: false, error: "Diff della proposta non valido" };
  }

  await prisma.$transaction(async (tx) => {
    for (const patch of changes.data.workouts) {
      const workout = await tx.workout.findFirst({
        where: {
          id: patch.workoutId,
          status: WORKOUT_STATUS.planned,
          week: { program: { userId: user.id, id: proposal.programId } },
        },
        select: { id: true },
      });
      if (!workout) {
        continue;
      }

      const data: Prisma.WorkoutUpdateInput = {};
      if (patch.name) {
        data.name = patch.name.to;
      }
      if (patch.durationMin) {
        data.durationMin = patch.durationMin.to;
      }
      if (patch.tss) {
        data.tss = patch.tss.to;
      }
      if (patch.dayOfWeek) {
        data.dayOfWeek = patch.dayOfWeek.to;
      }
      if (patch.plannedDate) {
        data.plannedDate = new Date(`${patch.plannedDate.to}T00:00:00.000Z`);
      }
      if (patch.blocks) {
        data.blocks = patch.blocks as Prisma.InputJsonValue;
      }
      await tx.workout.update({ where: { id: workout.id }, data });
    }

    for (const week of changes.data.weeks) {
      await tx.week.updateMany({
        where: {
          id: week.weekId,
          program: { userId: user.id, id: proposal.programId },
        },
        data: { weekLoadTarget: week.weekLoadTarget.to },
      });
    }

    await tx.recalcProposal.update({
      where: { id: proposal.id },
      data: {
        status: RECALC_STATUS.approved,
        resolvedAt: new Date(),
      },
    });
  });

  revalidateFeedbackPaths(proposal.programId);
  return { ok: true, proposalCreated: false, usedFallback: false };
}
