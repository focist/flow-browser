/**
 * Red spec — model catalog (FR5, NFR2; AC3, AC4).
 *
 * The expected IDs and prices are a verified fixture:
 *  - Anthropic: claude-api skill catalog (cached 2026-10-06)
 *  - OpenAI: developers.openai.com models/pricing/deprecations (accessed 2026-10-09)
 */

import { describe, expect, test } from "bun:test";
import {
  getCatalogModels,
  getDefaultModelId,
  isCatalogModel,
  normalizeProviderId,
  resolveSelection
} from "../model-catalog";

/**
 * Verified models and their published pricing — the cheapest model in each
 * size/tier class (curation rule, 2026-10-10). Anthropic classes: Haiku /
 * Sonnet / Opus. OpenAI classes: Luna / Sol / Terra / Astra / Pro / base /
 * mini / nano. Ties go to the newest release.
 */
const VERIFIED = {
  anthropic: [
    { id: "claude-haiku-5-5", input: 0.1, output: 0.5 },
    { id: "claude-sonnet-5-5", input: 2, output: 10 },
    { id: "claude-opus-5-5", input: 4, output: 20 }
  ],
  openai: [
    { id: "gpt-6-luna", input: 0.1, output: 0.5 },
    { id: "gpt-6.1-sol", input: 2, output: 10 },
    { id: "gpt-5.6-terra", input: 2, output: 12 },
    { id: "gpt-6-astra", input: 10, output: 50 },
    { id: "gpt-5.5-pro", input: 30, output: 180 },
    { id: "gpt-5", input: 1.25, output: 10 },
    { id: "gpt-4o-mini", input: 0.15, output: 0.6 },
    { id: "gpt-5-nano", input: 0.05, output: 0.4 }
  ]
} as const;

/** Retired, renamed, invented, or curated-out IDs that must not be offered. */
const DENYLIST = [
  // Anthropic: invented date suffixes from the old table, plus retired models
  "claude-sonnet-4-5-20250514",
  "claude-opus-4-1-20250514",
  "claude-opus-4-1",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "claude-3-haiku-20240307",
  // Anthropic: still served, but not the cheapest in their class
  "claude-sonnet-5",
  "claude-opus-5",
  "claude-opus-4-8",
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
  // OpenAI: retired or shutting down 2026-10-23
  "gpt-4-turbo",
  "gpt-4.1",
  "gpt-4.1-nano",
  "o1",
  "o3-mini",
  "gpt-3.5-turbo",
  "gpt-4.5-preview",
  // OpenAI: still served, but not the cheapest in their class
  "gpt-6-sol",
  "gpt-5.6-sol",
  "gpt-5.6-luna",
  "gpt-5.5",
  "gpt-5-mini",
  "gpt-4o"
];

describe("catalog metadata (AC3: complete and matching published values)", () => {
  for (const provider of ["anthropic", "openai"] as const) {
    test(`${provider}: every model carries complete, verified metadata`, () => {
      const models = getCatalogModels(provider);
      expect(models.length).toBeGreaterThanOrEqual(2);

      for (const m of models) {
        expect(m.id).not.toContain("STAND-IN");
        expect(m.name.length).toBeGreaterThan(0);
        expect(m.name).not.toBe(m.id); // display name, not a raw id
        expect(m.provider).toBe(provider);
        expect(m.contextWindow).toBeGreaterThanOrEqual(100_000);
        expect(m.pricing.inputCostPerMillion).toBeGreaterThan(0);
        expect(m.pricing.outputCostPerMillion).toBeGreaterThan(0);
        expect(m.limits.maxTokensPerRequest).toBeGreaterThan(0);

        // Each offered model's id and pricing must match the verified fixture.
        const verified = VERIFIED[provider].find((v) => v.id === m.id);
        expect(verified, `unverified model offered: ${m.id}`).toBeDefined();
        expect(m.pricing.inputCostPerMillion).toBe(verified!.input);
        expect(m.pricing.outputCostPerMillion).toBe(verified!.output);
      }
    });

    test(`${provider}: current-generation models are present (AC4)`, () => {
      const ids = getCatalogModels(provider).map((m) => m.id);
      for (const v of VERIFIED[provider]) {
        expect(ids).toContain(v.id);
      }
    });
  }

  test("no retired or shutdown-scheduled id is offered (AC4/NFR2)", () => {
    const offered = [...getCatalogModels("anthropic"), ...getCatalogModels("openai")].map((m) => m.id);
    for (const denied of DENYLIST) {
      expect(offered).not.toContain(denied);
    }
  });
});

describe("defaults and selection resolution", () => {
  test("each provider has a catalog default", () => {
    for (const provider of ["anthropic", "openai"] as const) {
      const def = getDefaultModelId(provider);
      expect(isCatalogModel(provider, def)).toBe(true);
    }
  });

  test("local has no model", () => {
    expect(getDefaultModelId("local")).toBe("");
    expect(resolveSelection("local", "anything")).toEqual({ provider: "local" });
  });

  test("legacy 'claude' provider value resolves to anthropic", () => {
    expect(normalizeProviderId("claude")).toBe("anthropic");
    const resolved = resolveSelection("claude", undefined);
    expect(resolved.provider).toBe("anthropic");
    expect(isCatalogModel("anthropic", resolved.model!)).toBe(true);
  });

  test("a cross-provider model resolves to the provider default (AC5 logic)", () => {
    const openaiModel = getDefaultModelId("openai");
    const resolved = resolveSelection("anthropic", openaiModel);
    expect(resolved.model).not.toBe(openaiModel);
    expect(isCatalogModel("anthropic", resolved.model!)).toBe(true);
  });

  test("an unknown/retired persisted model resolves to the provider default", () => {
    const resolved = resolveSelection("claude", "claude-3-5-sonnet-20241022");
    expect(resolved.provider).toBe("anthropic");
    expect(isCatalogModel("anthropic", resolved.model!)).toBe(true);
  });
});
