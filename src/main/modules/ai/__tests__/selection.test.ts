/**
 * Red spec — selection behavior (FR1–FR4, FR6–FR8, NFR1; AC1, AC2, AC5–AC8)
 * plus boundary validation (level 4).
 *
 * Runs against the real SelectionCore + ProviderRegistry + provider classes
 * + a real file-backed store; only the provider HTTP boundary is a local
 * fake server. No request leaves the harness.
 */

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { buildHarness, startFakeProviderServer, FileStore } from "./helpers";
import { getDefaultModelId, isCatalogModel } from "../model-catalog";
import { AI_SETTINGS_KEY, SelectionCore } from "../selection-core";
import { ProviderRegistry } from "../provider-registry";
import type { AISettings } from "~/flow/interfaces/ai";

const server = startFakeProviderServer();
afterAll(() => server.stop());
beforeEach(() => server.reset());

describe("persistence (FR3, AC1)", () => {
  test("a selected model survives a restart (fresh core over the same store)", async () => {
    const first = await buildHarness(server);
    const model = getDefaultModelId("anthropic");
    await first.core.updateSettings({ provider: "claude", apiKey: "sk-ant-test", model });

    // "Restart": new core + new registry over the same store file.
    const second = await buildHarness(server, first.storePath);
    const settings = await second.core.getSettings();
    expect(settings.model).toBe(model);
    expect(settings.provider).toBe("claude");
  });
});

describe("selection drives analysis (FR4, AC2)", () => {
  test("a completion after selecting model X runs on model X — not a default", async () => {
    const { core } = await buildHarness(server);

    // Pick a non-default model so a default-fallback bug cannot pass.
    const models = ["claude-opus-5-5", "claude-sonnet-5-5"];
    const nonDefault = models.find((m) => m !== getDefaultModelId("anthropic"))!;
    expect(isCatalogModel("anthropic", nonDefault)).toBe(true);

    await core.updateSettings({ provider: "claude", apiKey: "sk-ant-test", model: nonDefault });
    const run = await core.runCompletion({ messages: [{ role: "user", content: "hi" }], maxTokens: 10 });

    expect(run.model).toBe(nonDefault);
    const call = server.requests.find((r) => r.path === "/messages");
    expect(call?.body?.model).toBe(nonDefault);
  });

  test("current reasoning models receive no sampling params", async () => {
    const { core } = await buildHarness(server);
    await core.updateSettings({ provider: "openai", apiKey: "sk-test", model: getDefaultModelId("openai") });
    await core.runCompletion({ messages: [{ role: "user", content: "hi" }], temperature: 0.7, topP: 1, maxTokens: 10 });

    const call = server.requests.find((r) => r.path === "/chat/completions");
    expect(call?.body).toBeDefined();
    expect(call!.body!.temperature).toBeUndefined();
    expect(call!.body!.top_p).toBeUndefined();
  });
});

describe("provider switch (FR7, AC5)", () => {
  test("switching providers lands on a valid model for the new provider", async () => {
    const { core, store } = await buildHarness(server);
    await core.updateSettings({ provider: "openai", apiKey: "sk-test", model: getDefaultModelId("openai") });

    await core.updateSettings({ provider: "claude" });
    const settings = await core.getSettings();
    expect(isCatalogModel("anthropic", settings.model!)).toBe(true);

    // And the persisted state carries no cross-provider or unknown model.
    const persisted = await store.get<AISettings>(AI_SETTINGS_KEY);
    expect(isCatalogModel("anthropic", persisted!.model!)).toBe(true);
  });

  test("switching to local clears the model; switching back restores a valid one", async () => {
    const { core } = await buildHarness(server);
    await core.updateSettings({ provider: "openai", apiKey: "sk-test", model: getDefaultModelId("openai") });
    await core.updateSettings({ provider: "local" });
    expect((await core.getSettings()).model).toBe("");

    await core.updateSettings({ provider: "openai" });
    expect(isCatalogModel("openai", (await core.getSettings()).model!)).toBe(true);
  });
});

describe("no-API-key state (FR6, AC6)", () => {
  test("models are listable without a key (picker is never empty)", async () => {
    const { registry } = await buildHarness(server);
    expect((await registry.getProviderModels("openai")).length).toBeGreaterThan(0);
    expect((await registry.getProviderModels("anthropic")).length).toBeGreaterThan(0);
  });

  test("without a key the selection is still valid — no phantom model", async () => {
    const { core } = await buildHarness(server);
    const settings = await core.getSettings();
    expect(settings.apiKey).toBeUndefined();
    expect(isCatalogModel(settings.provider, settings.model!)).toBe(true);
  });

  test("the connection check reports the missing key clearly", async () => {
    const { core } = await buildHarness(server);
    const result = await core.testConnection("openai", "");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/api key/i);
  });
});

describe("saving is free (NFR1, AC7)", () => {
  test("updating settings issues zero provider requests", async () => {
    const { core } = await buildHarness(server);
    await core.updateSettings({
      provider: "claude",
      apiKey: "sk-ant-test",
      model: getDefaultModelId("anthropic"),
      enabled: true,
      confidenceThreshold: 0.8
    });
    await core.updateSettings({ provider: "openai" });
    await core.getSettings();

    expect(server.requests).toHaveLength(0);
  });
});

describe("explicit connection validation (FR8, AC8)", () => {
  test("a working key reports success with the provider models", async () => {
    const { core } = await buildHarness(server);
    const result = await core.testConnection("claude", "sk-ant-valid");
    expect(result.success).toBe(true);
    expect(result.models!.length).toBeGreaterThan(0);
    // The validation request is the non-billable models endpoint, not inference.
    expect(server.requests.map((r) => r.path)).toContain("/models");
    expect(server.requests.map((r) => r.path)).not.toContain("/messages");
  });

  test("a rejected key reports a clear failure", async () => {
    const { core } = await buildHarness(server);
    server.modelsStatus = 401;
    const result = await core.testConnection("openai", "sk-bad");
    expect(result.success).toBe(false);
    expect(typeof result.error).toBe("string");
    expect(result.error!.length).toBeGreaterThan(0);
  });
});

describe("boundary validation (level 4)", () => {
  test("rejects an unknown provider", async () => {
    const { core } = await buildHarness(server);
    await expect(core.updateSettings({ provider: "gemini" as never })).rejects.toThrow(/unknown provider/i);
  });

  test("rejects a model that is not in the selected provider's catalog", async () => {
    const { core } = await buildHarness(server);
    await expect(core.updateSettings({ provider: "claude", model: getDefaultModelId("openai") })).rejects.toThrow(
      /unknown model/i
    );
  });

  test("rejects a non-string model and an out-of-range threshold", async () => {
    const { core } = await buildHarness(server);
    await expect(core.updateSettings({ model: 42 as never })).rejects.toThrow(/model/i);
    await expect(core.updateSettings({ confidenceThreshold: 7 })).rejects.toThrow(/confidenceThreshold/i);
  });

  test("rejects a model on the local provider", async () => {
    const { core } = await buildHarness(server);
    await expect(core.updateSettings({ provider: "local", model: getDefaultModelId("openai") })).rejects.toThrow(
      /local provider/i
    );
  });

  test("a rejected patch changes nothing — in memory or on disk", async () => {
    const { core, store } = await buildHarness(server);
    const before = await core.getSettings();
    await core.updateSettings({ provider: "openai", model: getDefaultModelId("openai") });
    await expect(core.updateSettings({ provider: "gemini" as never })).rejects.toThrow();

    const after = await core.getSettings();
    expect(after.provider).toBe("openai");
    const persisted = await store.get<AISettings>(AI_SETTINGS_KEY);
    expect(persisted!.provider).toBe("openai");
    expect(before).toBeDefined();
  });
});

describe("edge spec (level 9)", () => {
  test("a retired persisted model recovers to a valid selection on load", async () => {
    const storePath = (await buildHarness(server)).storePath;
    const store = new FileStore(storePath);
    await store.set(AI_SETTINGS_KEY, {
      enabled: true,
      provider: "claude",
      model: "claude-3-5-sonnet-20241022", // retired — not in the catalog
      autoAnalyze: false,
      confidenceThreshold: 0.7,
      autoApply: { enabled: false, maxLabels: 1, notifications: true },
      categories: { topics: true, types: true, priority: false }
    } satisfies AISettings);

    const registry = new ProviderRegistry({ baseUrls: { openai: server.url, anthropic: server.url } });
    await registry.initializeDefaults();
    const core = new SelectionCore({ store, registry });

    const settings = await core.getSettings();
    expect(isCatalogModel("anthropic", settings.model!)).toBe(true);

    const target = await core.getRunTarget();
    expect(target.kind).toBe("api");
    if (target.kind === "api") {
      expect(target.providerId).toBe("anthropic");
      expect(isCatalogModel("anthropic", target.model)).toBe(true);
    }
  });

  test("a legacy 'claude' provider value runs on the anthropic provider", async () => {
    const { core } = await buildHarness(server);
    await core.updateSettings({ provider: "claude", apiKey: "sk-ant-test" });
    const target = await core.getRunTarget();
    expect(target.kind).toBe("api");
    if (target.kind === "api") expect(target.providerId).toBe("anthropic");
  });

  test("model listing still works when the provider endpoint is down (NFR3)", async () => {
    const downServer = startFakeProviderServer();
    downServer.stop();
    const { registry } = await buildHarness(downServer);
    // The catalog is served without a network round-trip, so a dead endpoint
    // cannot empty the picker.
    expect((await registry.getProviderModels("openai")).length).toBeGreaterThan(0);
    expect((await registry.getProviderModels("anthropic")).length).toBeGreaterThan(0);
  });

  test("a failed connection test leaves the stored selection intact", async () => {
    const { core } = await buildHarness(server);
    const model = getDefaultModelId("openai");
    await core.updateSettings({ provider: "openai", apiKey: "sk-test", model });

    server.modelsStatus = 401;
    const result = await core.testConnection("openai", "sk-other");
    expect(result.success).toBe(false);

    const settings = await core.getSettings();
    expect(settings.model).toBe(model);
    expect(settings.apiKey).toBe("sk-test");
  });
});

describe("happy path (level 8)", () => {
  test("configure → select → analyze → restart → still the same model", async () => {
    const first = await buildHarness(server);
    server.completionText = '{"labels":[],"language":"en"}';

    const model = "claude-sonnet-5-5";
    await first.core.updateSettings({ provider: "claude", apiKey: "sk-ant-test", enabled: true, model });

    const verify = await first.core.testConnection("claude", "sk-ant-test");
    expect(verify.success).toBe(true);

    const run = await first.core.runCompletion({ messages: [{ role: "user", content: "categorize" }], maxTokens: 100 });
    expect(run.model).toBe(model);
    expect(run.response.content).toContain("labels");

    const second = await buildHarness(server, first.storePath);
    const target = await second.core.getRunTarget();
    if (target.kind === "api") expect(target.model).toBe(model);
    expect(target.kind).toBe("api");
  });
});
