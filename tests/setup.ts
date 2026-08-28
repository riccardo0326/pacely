import "@testing-library/jest-dom/vitest";

process.env.ENCRYPTION_KEY ??= "a".repeat(64);
process.env.STRAVA_CLIENT_ID ??= "test-client-id";
process.env.STRAVA_CLIENT_SECRET ??= "test-client-secret";
process.env.STRAVA_WEBHOOK_VERIFY_TOKEN ??= "test-webhook-token";
process.env.CRON_SECRET ??= "test-cron-secret";
process.env.NEXTAUTH_SECRET ??= "test-nextauth-secret";
process.env.DATABASE_URL ??= "postgresql://pacely:pacely@localhost:5432/pacely";
process.env.DATABASE_URL_UNPOOLED ??= process.env.DATABASE_URL;
process.env.LLM_PROVIDER ??= "deepseek";
process.env.DEEPSEEK_API_KEY ??= "test-deepseek-key";
process.env.OPENAI_API_KEY ??= "test-openai-key";
