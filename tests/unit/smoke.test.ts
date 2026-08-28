import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REQUIRED_ENV_KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "AUTH_SECRET",
  "STRAVA_CLIENT_ID",
  "STRAVA_CLIENT_SECRET",
  "STRAVA_WEBHOOK_VERIFY_TOKEN",
  "ENCRYPTION_KEY",
  "LLM_PROVIDER",
  "DEEPSEEK_API_KEY",
  "OPENAI_API_KEY",
  "WEB_PUSH_PUBLIC_KEY",
  "WEB_PUSH_PRIVATE_KEY",
  "SENTRY_DSN",
] as const;

describe("project smoke", () => {
  it("documents every required environment variable in .env.example", () => {
    const contents = readFileSync(
      resolve(process.cwd(), ".env.example"),
      "utf8",
    );

    for (const key of REQUIRED_ENV_KEYS) {
      expect(contents, `missing ${key} in .env.example`).toContain(`${key}=`);
    }
  });

  it("targets PostgreSQL in the Prisma schema", () => {
    const schema = readFileSync(
      resolve(process.cwd(), "prisma/schema.prisma"),
      "utf8",
    );

    expect(schema).toMatch(/provider\s+=\s+"postgresql"/);
    expect(schema).toContain('env("DATABASE_URL")');
    expect(schema).toContain('env("DIRECT_URL")');
    expect(schema).toContain("model User");
    expect(schema).toContain("model StravaConnection");
    expect(schema).toContain("stravaAthleteId");
    expect(schema).toContain("accessTokenEncrypted");
  });
});
