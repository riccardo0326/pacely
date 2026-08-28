import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  decrypt,
  encrypt,
  parseEncryptionKey,
} from "@/lib/security/encryption";

const originalKey = process.env.ENCRYPTION_KEY;

afterEach(() => {
  process.env.ENCRYPTION_KEY = originalKey;
});

describe("token encryption", () => {
  it("round-trips a Strava token", () => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");
    const token = "strava-access-token-value";
    expect(decrypt(encrypt(token))).toBe(token);
  });

  it("produces a different ciphertext each time", () => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");
    const token = "same-token";
    expect(encrypt(token)).not.toBe(encrypt(token));
  });

  it("rejects a payload encrypted with another key", () => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");
    const payload = encrypt("secret");
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");
    expect(() => decrypt(payload)).toThrow();
  });

  it("accepts 32-byte hex and base64 keys", () => {
    const bytes = randomBytes(32);
    expect(parseEncryptionKey(bytes.toString("hex"))).toEqual(bytes);
    expect(parseEncryptionKey(bytes.toString("base64"))).toEqual(bytes);
  });
});
