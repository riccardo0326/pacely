import { describe, expect, it } from "vitest";
import {
  buildRecalcProposalContent,
  buildWorkoutTodayContent,
  recalcProposalDedupeKey,
  workoutTodayDedupeKey,
} from "@/lib/notifications/content";

describe("notification content", () => {
  it("builds a single-workout reminder with calendar link", () => {
    const content = buildWorkoutTodayContent([
      {
        name: "Fondo facile",
        sport: "run",
        durationMin: 45,
        timeOfDay: "07:30",
      },
    ]);

    expect(content.title).toBe("Allenamento di oggi");
    expect(content.body).toBe("Corsa · Fondo facile · 45 min · 07:30");
    expect(content.href).toBe("/calendar");
  });

  it("lists multiple workouts in the body", () => {
    const content = buildWorkoutTodayContent([
      { name: "Z2", sport: "ride", durationMin: 60 },
      { name: "Tecnica", sport: "swim", durationMin: 40 },
    ]);

    expect(content.title).toBe("2 allenamenti oggi");
    expect(content.body).toContain("Ciclismo · Z2 · 60 min");
    expect(content.body).toContain("Nuoto · Tecnica · 40 min");
  });

  it("points recalc proposals at the program page", () => {
    const content = buildRecalcProposalContent({
      programId: "prog-1",
      programName: "Tri 12 settimane",
    });

    expect(content.title).toBe("Proposta di ricalcolo");
    expect(content.body).toContain("Tri 12 settimane");
    expect(content.href).toBe("/programs/prog-1");
  });

  it("builds stable dedupe keys", () => {
    expect(workoutTodayDedupeKey("2026-08-31")).toBe(
      "workout_today:2026-08-31",
    );
    expect(recalcProposalDedupeKey("prop-9")).toBe("recalc_proposal:prop-9");
  });
});
