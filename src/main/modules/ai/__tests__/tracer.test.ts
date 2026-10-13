/**
 * Level-2 tracer: one designated check that walks the full main path —
 * settings update → validation → store → selection resolution → registry →
 * provider HTTP call → normalized response — on the harness's fake server.
 */

import { afterAll, expect, test } from "bun:test";
import { buildHarness, startFakeProviderServer } from "./helpers";
import { getDefaultModelId } from "../model-catalog";

const server = startFakeProviderServer();
afterAll(() => server.stop());

test("tracer: a selected model drives a completion end to end", async () => {
  const { core } = await buildHarness(server);
  server.completionText = "TRACER-OK";

  const model = getDefaultModelId("openai");
  await core.updateSettings({ provider: "openai", apiKey: "sk-test", model });

  const run = await core.runCompletion({
    messages: [{ role: "user", content: "ping" }],
    maxTokens: 50
  });

  expect(run.providerId).toBe("openai");
  expect(run.model).toBe(model);
  expect(run.response.content).toBe("TRACER-OK");

  const completionCall = server.requests.find((r) => r.path === "/chat/completions");
  expect(completionCall?.body?.model).toBe(model);
});
