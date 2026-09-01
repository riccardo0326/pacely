import { afterEach, describe, expect, it, vi } from "vitest";
import { DEEPSEEK_CHAT_URL, OPENAI_CHAT_URL } from "@/lib/llm/constants";
import { LLMConfigError } from "@/lib/llm/errors";
import {
  createDeepSeekProvider,
  createOpenAIProvider,
  getLLMProvider,
  parseJsonContent,
  resolveLLMProviderName,
} from "@/lib/llm";
import type { ChatClient, LLMUsageLog, TokenUsage } from "@/lib/llm/types";
import {
  chatApiBody,
  jsonResponse,
  programInput,
  validFeedback,
  validPerformance,
  validProgram,
} from "./llm-fixtures";

const originalProvider = process.env.LLM_PROVIDER;

afterEach(() => {
  process.env.LLM_PROVIDER = originalProvider;
  vi.restoreAllMocks();
});

function usageMock(): TokenUsage {
  return { promptTokens: 80, completionTokens: 40, totalTokens: 120 };
}

function mockCompleteJson(impl?: ChatClient["completeJson"]) {
  return impl
    ? vi.fn<ChatClient["completeJson"]>(impl)
    : vi.fn<ChatClient["completeJson"]>();
}

function mockLogUsage() {
  return vi.fn<(entry: LLMUsageLog) => Promise<void>>(async () => {});
}

function mockFetch(impl?: typeof fetch) {
  return impl ? vi.fn<typeof fetch>(impl) : vi.fn<typeof fetch>();
}

describe("resolveLLMProviderName", () => {
  it("defaults to deepseek and accepts an override", () => {
    delete process.env.LLM_PROVIDER;
    expect(resolveLLMProviderName()).toBe("deepseek");
    expect(resolveLLMProviderName("openai")).toBe("openai");
    process.env.LLM_PROVIDER = "openai";
    expect(resolveLLMProviderName()).toBe("openai");
  });

  it("rejects an unknown provider name", () => {
    expect(() => resolveLLMProviderName("anthropic")).toThrow(LLMConfigError);
  });
});

describe("parseJsonContent", () => {
  it("parses raw JSON and fenced markdown", () => {
    expect(parseJsonContent('{"ok":true}')).toEqual({ ok: true });
    expect(parseJsonContent('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });
});

describe("LLMProvider validation and fallback", () => {
  it("returns validated output without retry when JSON matches the schema", async () => {
    const completeJson = mockCompleteJson(async () => ({
      content: JSON.stringify(validProgram),
      model: "deepseek-chat",
      usage: usageMock(),
    }));
    const logUsage = mockLogUsage();
    const provider = createDeepSeekProvider({ completeJson, logUsage });

    const result = await provider.generateProgram(programInput);

    expect(result.source).toBe("llm");
    expect(result.usedFallback).toBe(false);
    expect(result.data.name).toBe("Base aerobica");
    expect(result.data.weeks).toHaveLength(4);
    expect(result.data.weeks[0]?.workouts).toHaveLength(3);
    expect(completeJson).toHaveBeenCalledOnce();
    expect(logUsage).toHaveBeenCalledOnce();
    const log = logUsage.mock.calls[0]?.[0];
    expect(log).toMatchObject({
      userId: "user-1",
      interactionType: "generate_program",
      provider: "deepseek",
      success: true,
      usedFallback: false,
      promptTokens: 80,
      completionTokens: 40,
      totalTokens: 120,
    });
    expect(log?.estimatedCostUsd).toBeGreaterThan(0);
  });

  it("retries once when the first payload is not valid JSON, then succeeds", async () => {
    const completeJson = mockCompleteJson()
      .mockResolvedValueOnce({
        content: "not json",
        model: "deepseek-chat",
        usage: usageMock(),
      })
      .mockResolvedValueOnce({
        content: JSON.stringify(validProgram),
        model: "deepseek-chat",
        usage: usageMock(),
      });
    const logUsage = mockLogUsage();
    const provider = createDeepSeekProvider({ completeJson, logUsage });

    const result = await provider.generateProgram(programInput);

    expect(result.source).toBe("llm");
    expect(completeJson).toHaveBeenCalledTimes(2);
    expect(completeJson.mock.calls[1]?.[0].user).toContain(
      "Tentativo precedente non valido",
    );
    expect(logUsage.mock.calls[0]?.[0]).toMatchObject({
      usedFallback: false,
      promptTokens: 160,
      totalTokens: 240,
    });
  });

  it("falls back after two payloads that fail Zod validation", async () => {
    const completeJson = mockCompleteJson(async () => ({
      content: JSON.stringify({ name: "manca tutto" }),
      model: "deepseek-chat",
      usage: usageMock(),
    }));
    const logUsage = mockLogUsage();
    const provider = createDeepSeekProvider({ completeJson, logUsage });

    const result = await provider.generateProgram(programInput);

    expect(completeJson).toHaveBeenCalledTimes(2);
    expect(result.source).toBe("fallback");
    expect(result.usedFallback).toBe(true);
    expect(result.data.weeks).toHaveLength(4);
    expect(result.data.summary).toContain("Bozza di programma");
    expect(logUsage.mock.calls[0]?.[0]).toMatchObject({
      success: true,
      usedFallback: true,
      userId: "user-1",
      error: "Output LLM non conforme allo schema",
    });
  });

  it("accepts JSON wrapped in a markdown fence", async () => {
    const completeJson = mockCompleteJson(async () => ({
      content: `\`\`\`json\n${JSON.stringify(validFeedback)}\n\`\`\``,
      model: "deepseek-chat",
      usage: usageMock(),
    }));
    const provider = createDeepSeekProvider({
      completeJson,
      logUsage: async () => {},
    });

    const result = await provider.analyzeFeedback({
      userId: "user-1",
      freeText: "Poco sonno, fatica alta",
    });

    expect(result.source).toBe("llm");
    expect(result.data.perceivedExertion).toBe(7);
    expect(result.data.externalFactors).toEqual(["sleep"]);
  });

  it("does not invent RPE when feedback analysis falls back", async () => {
    const completeJson = mockCompleteJson(async () => ({
      content: "???",
      model: "gpt-4o-mini",
      usage: usageMock(),
    }));
    const provider = createOpenAIProvider({
      completeJson,
      logUsage: async () => {},
    });

    const result = await provider.analyzeFeedback({
      userId: "user-1",
      freeText: "Allenamento durissimo dopo una notte insonne",
    });

    expect(result.provider).toBe("openai");
    expect(result.source).toBe("fallback");
    expect(result.data.perceivedExertion).toBeNull();
    expect(result.data.suggestedAction).toBe("none");
    expect(result.data.planDeviation).toBe("none");
  });

  it("falls back for performance reports when the provider errors", async () => {
    const completeJson = mockCompleteJson(async () => {
      throw new Error("provider down");
    });
    const provider = createDeepSeekProvider({
      completeJson,
      logUsage: async () => {},
    });

    const result = await provider.analyzePerformance({
      userId: "user-1",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-28",
      metricTrends: { ctlChange: 4, ftpChange: 8 },
      feedbackSummaries: ["Sonno scarso"],
    });

    expect(result.source).toBe("fallback");
    expect(result.data.strengths.some((item) => item.includes("CTL"))).toBe(
      true,
    );
    expect(completeJson).toHaveBeenCalledOnce();
  });

  it("returns LLM performance output when valid", async () => {
    const completeJson = mockCompleteJson(async () => ({
      content: JSON.stringify(validPerformance),
      model: "deepseek-chat",
      usage: usageMock(),
    }));
    const provider = createDeepSeekProvider({
      completeJson,
      logUsage: async () => {},
    });

    const result = await provider.analyzePerformance({
      userId: "user-1",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-28",
      metricTrends: {},
      feedbackSummaries: [],
    });

    expect(result.source).toBe("llm");
    expect(result.data.summary).toBe("Periodo solido");
  });

  it("throws on invalid input instead of inventing a program", async () => {
    const completeJson = mockCompleteJson();
    const provider = createDeepSeekProvider({
      completeJson,
      logUsage: async () => {},
    });

    await expect(
      provider.generateProgram({
        ...programInput,
        sports: [],
      }),
    ).rejects.toThrow();
    expect(completeJson).not.toHaveBeenCalled();
  });
});

describe("provider HTTP client", () => {
  it("posts to DeepSeek by default and OpenAI when overridden", async () => {
    const fetchImpl = mockFetch(async (url) => {
      const model = String(url).includes("openai")
        ? "gpt-4o-mini"
        : "deepseek-chat";
      return jsonResponse(chatApiBody(JSON.stringify(validProgram), model));
    });
    const sleep = vi.fn(async () => {});
    const logUsage = mockLogUsage();

    process.env.LLM_PROVIDER = "deepseek";
    const deepseek = getLLMProvider({ fetch: fetchImpl, sleep, logUsage });
    await deepseek.generateProgram(programInput);

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(DEEPSEEK_CHAT_URL);
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer test-deepseek-key",
    });

    const openai = getLLMProvider({
      provider: "openai",
      fetch: fetchImpl,
      sleep,
      logUsage,
    });
    await openai.generateProgram(programInput);

    expect(fetchImpl.mock.calls[1]?.[0]).toBe(OPENAI_CHAT_URL);
    expect(fetchImpl.mock.calls[1]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer test-openai-key",
    });
  });

  it("retries HTTP 5xx then returns a valid program", async () => {
    const fetchImpl = mockFetch()
      .mockResolvedValueOnce(new Response("nope", { status: 503 }))
      .mockResolvedValueOnce(
        jsonResponse(chatApiBody(JSON.stringify(validProgram))),
      );
    const sleep = vi.fn(async () => {});
    const provider = createDeepSeekProvider({
      fetch: fetchImpl,
      sleep,
      logUsage: async () => {},
    });

    const result = await provider.generateProgram(programInput);

    expect(result.source).toBe("llm");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
  });

  it("falls back when HTTP errors persist", async () => {
    const fetchImpl = mockFetch(
      async () => new Response("nope", { status: 500 }),
    );
    const sleep = vi.fn(async () => {});
    const logUsage = mockLogUsage();
    const provider = createOpenAIProvider({
      fetch: fetchImpl,
      sleep,
      logUsage,
    });

    const result = await provider.generateProgram(programInput);

    expect(result.source).toBe("fallback");
    expect(fetchImpl.mock.calls.length).toBeGreaterThan(1);
    expect(logUsage.mock.calls[0]?.[0]).toMatchObject({
      provider: "openai",
      usedFallback: true,
    });
  });
});
