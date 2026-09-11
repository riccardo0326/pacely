import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  programFindFirst: vi.fn(),
  programFindMany: vi.fn(),
  programDelete: vi.fn(),
  reportFindFirst: vi.fn(),
  reportFindMany: vi.fn(),
  notificationFindMany: vi.fn(),
  proposalFindFirst: vi.fn(),
  workoutFindFirst: vi.fn(),
  activityFindFirst: vi.fn(),
  activityFindMany: vi.fn(),
  activityCount: vi.fn(),
  profileFindUnique: vi.fn(),
  profileCreate: vi.fn(),
  profileUpsert: vi.fn(),
  gearFindMany: vi.fn(),
  gearFindFirst: vi.fn(),
  gearCreate: vi.fn(),
  gearUpdate: vi.fn(),
  gearUpdateMany: vi.fn(),
  gearDelete: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: (...args: unknown[]) => mocks.requireUser(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    program: {
      findFirst: mocks.programFindFirst,
      findMany: mocks.programFindMany,
      delete: mocks.programDelete,
    },
    performanceReport: {
      findFirst: mocks.reportFindFirst,
      findMany: mocks.reportFindMany,
    },
    notification: { findMany: mocks.notificationFindMany, count: vi.fn() },
    recalcProposal: { findFirst: mocks.proposalFindFirst },
    workout: { findFirst: mocks.workoutFindFirst, findMany: vi.fn() },
    activity: {
      findFirst: mocks.activityFindFirst,
      findMany: mocks.activityFindMany,
      count: mocks.activityCount,
    },
    userProfile: {
      findUnique: mocks.profileFindUnique,
      create: mocks.profileCreate,
      upsert: mocks.profileUpsert,
    },
    gear: {
      findMany: mocks.gearFindMany,
      findFirst: mocks.gearFindFirst,
      create: mocks.gearCreate,
      update: mocks.gearUpdate,
      updateMany: mocks.gearUpdateMany,
      delete: mocks.gearDelete,
    },
    $transaction: mocks.transaction,
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

import {
  deleteProgram,
  getProgram,
  listPrograms,
} from "@/server/actions/programs";
import {
  getPerformanceReport,
  listPerformanceReports,
} from "@/server/actions/reports";
import { listNotifications } from "@/server/actions/notifications";
import { getPendingRecalcProposalForProgram } from "@/server/actions/feedback";
import { linkWorkoutActivity, skipWorkout } from "@/server/actions/calendar";
import { listActivities } from "@/server/actions/activities";
import { deleteGear, getProfile } from "@/server/actions/profile";
import { requestWeekAdapt } from "@/server/actions/adapt-week";

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

  it("links a Strava activity to a workout without requiring the same calendar day", async () => {
    mocks.workoutFindFirst.mockResolvedValue({
      id: "w-wed",
      activityId: null,
      week: { programId: "p1" },
    });
    mocks.activityFindFirst.mockResolvedValue({ id: "a-mon" });
    mocks.transaction.mockImplementation(
      async (fn: (tx: unknown) => unknown) => {
        await fn({
          workout: { updateMany: vi.fn(), update: vi.fn() },
        });
      },
    );
    const formData = new FormData();
    formData.set("workoutId", "w-wed");
    formData.set("activityId", "a-mon");
    const result = await linkWorkoutActivity(formData);
    expect(result).toEqual({ ok: true });
    expect(mocks.activityFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "a-mon", userId: "user-a" },
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

  it("loads a week adapt only for the session user's program", async () => {
    mocks.programFindFirst.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("programId", "program-of-user-b");
    formData.set("weekId", "week-of-user-b");
    formData.set("situationText", "Malato, non posso fare qualità domani.");
    const result = await requestWeekAdapt(formData);
    expect(result).toEqual({
      ok: false,
      error: "Programma o settimana non trovati",
    });
    expect(mocks.programFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "program-of-user-b", userId: "user-a" },
      }),
    );
  });

  it("refuses to delete another user's program", async () => {
    mocks.programFindFirst.mockResolvedValue(null);
    const result = await deleteProgram("program-of-user-b");
    expect(result).toEqual({ ok: false, error: "Programma non trovato" });
    expect(mocks.programFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "program-of-user-b", userId: "user-a" },
      }),
    );
    expect(mocks.programDelete).not.toHaveBeenCalled();
  });

  it("loads profile and gear only for the session user", async () => {
    mocks.profileFindUnique.mockResolvedValue({
      weightKg: 70,
      heightCm: 178,
      birthDate: null,
      weightSource: null,
      lastStravaSyncedAt: null,
    });
    mocks.gearFindMany.mockResolvedValue([]);
    await getProfile();
    expect(mocks.profileFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-a" },
      }),
    );
    expect(mocks.gearFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-a" },
      }),
    );
  });

  it("lists only the session user's activities", async () => {
    mocks.activityCount.mockResolvedValue(0);
    mocks.activityFindMany.mockResolvedValue([]);
    await listActivities("run", "1");
    expect(mocks.activityCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-a", sport: "run" },
      }),
    );
    expect(mocks.activityFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-a", sport: "run" },
      }),
    );
  });

  it("refuses to delete another user's gear", async () => {
    mocks.gearFindFirst.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("gearId", "gear-of-user-b");
    const result = await deleteGear(formData);
    expect(result).toEqual({
      ok: false,
      error: "Attrezzatura non trovata",
    });
    expect(mocks.gearFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "gear-of-user-b", userId: "user-a" },
      }),
    );
    expect(mocks.gearDelete).not.toHaveBeenCalled();
  });
});
