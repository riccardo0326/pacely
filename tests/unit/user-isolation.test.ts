import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  programFindFirst: vi.fn(),
  programFindMany: vi.fn(),
  reportFindFirst: vi.fn(),
  reportFindMany: vi.fn(),
  notificationFindMany: vi.fn(),
  proposalFindFirst: vi.fn(),
  workoutFindFirst: vi.fn(),
  activityFindFirst: vi.fn(),
  betaFeedbackCreate: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: (...args: unknown[]) => mocks.requireUser(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    program: {
      findFirst: mocks.programFindFirst,
      findMany: mocks.programFindMany,
    },
    performanceReport: {
      findFirst: mocks.reportFindFirst,
      findMany: mocks.reportFindMany,
    },
    notification: { findMany: mocks.notificationFindMany, count: vi.fn() },
    recalcProposal: { findFirst: mocks.proposalFindFirst },
    workout: { findFirst: mocks.workoutFindFirst, findMany: vi.fn() },
    activity: { findFirst: mocks.activityFindFirst },
    betaFeedback: { create: mocks.betaFeedbackCreate },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { getProgram, listPrograms } from "@/server/actions/programs";
import {
  getPerformanceReport,
  listPerformanceReports,
} from "@/server/actions/reports";
import { listNotifications } from "@/server/actions/notifications";
import { getPendingRecalcProposalForProgram } from "@/server/actions/feedback";
import { skipWorkout } from "@/server/actions/calendar";
import { submitBetaFeedback } from "@/server/actions/beta-feedback";

describe("per-user data isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-a", name: "Athlete A" });
  });

  it("loads a program only when it belongs to the session user", async () => {
    mocks.programFindFirst.mockResolvedValue(null);
    const result = await getProgram("program-of-user-b");
    expect(result).toBeNull();
    expect(mocks.programFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "program-of-user-b", userId: "user-a" },
      }),
    );
  });

  it("lists only the session user's programs", async () => {
    mocks.programFindMany.mockResolvedValue([]);
    await listPrograms();
    expect(mocks.programFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-a" },
      }),
    );
  });

  it("loads a performance report only for the session user", async () => {
    mocks.reportFindFirst.mockResolvedValue(null);
    const result = await getPerformanceReport("report-of-user-b");
    expect(result).toBeNull();
    expect(mocks.reportFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "report-of-user-b", userId: "user-a" },
      }),
    );
  });

  it("lists only the session user's reports and notifications", async () => {
    mocks.reportFindMany.mockResolvedValue([]);
    mocks.notificationFindMany.mockResolvedValue([]);
    await listPerformanceReports();
    await listNotifications();
    expect(mocks.reportFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-a" },
      }),
    );
    expect(mocks.notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-a" },
      }),
    );
  });

  it("scopes pending recalc proposals to the session user's program", async () => {
    mocks.proposalFindFirst.mockResolvedValue(null);
    await getPendingRecalcProposalForProgram("program-of-user-b");
    expect(mocks.proposalFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          programId: "program-of-user-b",
          program: { userId: "user-a" },
        }),
      }),
    );
  });

  it("refuses to skip another user's workout", async () => {
    mocks.workoutFindFirst.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("workoutId", "workout-of-user-b");
    const result = await skipWorkout(formData);
    expect(result).toEqual({
      ok: false,
      error: "Allenamento non trovato",
    });
    expect(mocks.workoutFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "workout-of-user-b",
          week: { program: { userId: "user-a" } },
        },
      }),
    );
  });

  it("stores beta feedback under the session userId", async () => {
    mocks.betaFeedbackCreate.mockResolvedValue({ id: "fb-1" });
    const formData = new FormData();
    formData.set("category", "bug");
    formData.set(
      "message",
      "Il match automatico ha collegato la corsa sbagliata.",
    );
    const result = await submitBetaFeedback(formData);
    expect(result).toEqual({ ok: true });
    expect(mocks.betaFeedbackCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-a",
        category: "bug",
        message: "Il match automatico ha collegato la corsa sbagliata.",
      },
    });
  });
});
