import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Pacely uses Lakebase Postgres (Prisma). Auth is Auth.js + Strava, not Neon Auth.
  auth: false,
  branch: (branch) => {
    if (branch.isDefault) {
      return {};
    }
    if (!branch.exists) {
      return { ttl: "7d" };
    }
    return {};
  },
});
