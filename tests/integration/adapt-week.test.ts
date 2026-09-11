import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AdaptWeekOutput } from "@/lib/llm/schemas";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  programFindFirst: vi.fn(),
  proposalCount: vi.fn(),
  proposalCreate: vi.fn(),
  snapshotFindFirst: vi.fn(),
  workoutFindMany: vi.fn(),
  activityFindMany: vi.fn(),
  adaptWeek: vi.fn(),
  notify: vi.fn(),
  quota: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: (...args: unknown[]) => mocks.requireUser(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    program: { findFirst: mocks.programFindFirst },
    recalcProposal: {
      count: mocks.proposalCount,
      create: mocks.proposalCreate,
    },
    performanceMetricSnapshot: { findFirst: mocks.snapshotFindFirst },
    workout: { findMany: mocks.workoutFindMany },
    activity: { findMany: mocks.activityFindMany },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/llm", () => ({
  getLLMProvider: () => ({ adaptWeek: mocks.adaptWeek }),
}));

vi.mock("@/lib/llm/quota", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/llm/quota")>("@/lib/llm/quota");
  return {
    ...actual,
    assertAdaptWeekQuota: (...args: unknown[]) => mocks.quota(...args),
  };
});

vi.mock("@/lib/notifications", () => ({
  notifyRecalcProposal: (...args: unknown[]) => mocks.notify(...args),
}));

vi.mock("@/lib/metrics/dates", async () => {
  const actual = await vi.importActual<typeof import("@/lib/metrics/dates")>(
    "@/lib/metrics/dates",
  );
  return { ...actual, utcToday: () => "2026-09-08" };
});

import { requestWeekAdapt } from "@/server/actions/adapt-week";

const llmOutput: AdaptWeekOutput = {
  rationale: "Lunedì recupero, il tempo va a sabato.",
  strategy: "postpone_quality",
  workouts: [
    {
      workoutId: "w-key",
      op: "move",
      dayOfWeek: 6,
      plannedDate: "2026-09-12",
    },
  ],
};

describe("requestWeekAdapt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-a", name: "A" });
    mocks.quota.mockResolvedValue(undefined);
    mocks.proposalCount.mockResolvedValue(0);
    mocks.snapshotFindFirst.mockResolvedValue(null);
    mocks.workoutFindMany.mockResolvedValue([]);
    mocks.activityFindMany.mockResolvedValue([]);
    mocks.proposalCreate.mockResolvedValue({ id: "prop-1" });
    mocks.adaptWeek.mockResolvedValue({
      data: llmOutput,
      source: "llm",
      provider: "deepseek",
      model: "deepseek-chat",
      usedFallback: false,
    });
    mocks.notify.mockResolvedValue(undefined);
    mocks.programFindFirst.mockResolvedValue({
      id: "prog-1",
      userId: "user-a",
      status: "active",
      name: "Base",
      sportsIncluded: ["run"],
      availableSlots: [{ weekday: 2 }, { weekday: 4 }, { weekday: 6 }],
      goal: { description: "10K" },
      weeks: [
        {
          id: "week-1",
          weekLoadTarget: 300,
          focus: "qualità",
          workouts: [
            {
              id: "w-key",
              weekId: "week-1",
              sport: "run",
              name: "Tempo",
              plannedDate: new Date("2026-09-08T00:00:00.000Z"),
              dayOfWeek: 2,
              durationMin: 50,
              tss: 100,
              timeOfDay: null,
              status: "planned",
              blocks: [
                { type: "warm-up", durationMin: 10, description: "Jog" },
                { type: "main-set", durationMin: 30, description: "Tempo" },
                { type: "cool-down", durationMin: 10, description: "Walk" },
              ],
            },
            {
              id: "w-easy",
              weekId: "week-1",
              sport: "run",
              name: "Fondo",
              plannedDate: new Date("2026-09-12T00:00:00.000Z"),
              dayOfWeek: 6,
              durationMin: 50,
              tss: 60,
              timeOfDay: null,
              status: "planned",
              blocks: [
                { type: "warm-up", durationMin: 10, description: "Jog" },
                { type: "main-set", durationMin: 30, description: "Z2" },
                { type: "cool-down", durationMin: 10, description: "Walk" },
              ],
            },
          ],
        },
      ],
    });
  });

  it("creates a pending week_adapt proposal from a life situation", async () => {
    const form = new FormData();
    form.set("programId", "prog-1");
    form.set("weekId", "week-1");
    form.set(
      "situationText",
      "Ieri trekking esaustivo, lunedì non posso fare il tempo.",
    );
    form.append("situationTags", "extra_load");

    const result = await requestWeekAdapt(form);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.proposalCreated).toBe(true);
    }
    expect(mocks.adaptWeek).toHaveBeenCalledOnce();
    expect(mocks.proposalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          programId: "prog-1",
          weekId: "week-1",
          source: "week_adapt",
          status: "pending",
        }),
      }),
    );
  });

  it("refuses another user's program", async () => {
    mocks.programFindFirst.mockResolvedValue(null);
    const form = new FormData();
    form.set("programId", "prog-b");
    form.set("weekId", "week-b");
    form.set("situationText", "Sto male da due giorni con la febbre.");
    const result = await requestWeekAdapt(form);
    expect(result).toEqual({
      ok: false,
      error: "Programma o settimana non trovati",
    });
    expect(mocks.programFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prog-b", userId: "user-a" },
      }),
    );
    expect(mocks.adaptWeek).not.toHaveBeenCalled();
  });

  it("blocks a second pending proposal", async () => {
    mocks.proposalCount.mockResolvedValue(1);
    const form = new FormData();
    form.set("programId", "prog-1");
    form.set("weekId", "week-1");
    form.set("situationText", "Malato, non posso correre.");
    const result = await requestWeekAdapt(form);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("proposta");
    }
    expect(mocks.adaptWeek).not.toHaveBeenCalled();
  });
});
