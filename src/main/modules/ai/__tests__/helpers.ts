/**
 * Test harness for the model-selection core.
 *
 * Real pieces under test: SelectionCore, ProviderRegistry, the real provider
 * classes, and a real file-backed settings store. Only the provider HTTP
 * boundary is faked (a local server) — no request ever leaves the harness.
 */

import { mkdtempSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ProviderRegistry } from "../provider-registry";
import { SelectionCore, KVStore } from "../selection-core";

/** Real file-backed KV store with the same contract as SettingsDataStore. */
export class FileStore implements KVStore {
  constructor(private filePath: string) {}

  private async read(): Promise<Record<string, unknown>> {
    try {
      return JSON.parse(await fs.readFile(this.filePath, "utf8"));
    } catch {
      return {};
    }
  }

  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const data = await this.read();
    return (data[key] as T) ?? defaultValue;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const data = await this.read();
    data[key] = value;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }
}

export function tempStorePath(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "oasis-ai-test-"));
  return path.join(dir, "settings.json");
}

export interface RecordedRequest {
  method: string;
  path: string;
  body?: Record<string, unknown>;
}

export interface FakeProviderServer {
  url: string;
  requests: RecordedRequest[];
  /** HTTP status for GET /models (both providers). Default 200. */
  modelsStatus: number;
  /** Text the fake completion returns. */
  completionText: string;
  stop(): void;
  reset(): void;
}

/**
 * One local server standing in for both provider APIs:
 *   GET  /models            → model list (or `modelsStatus` error)
 *   POST /chat/completions  → OpenAI-shaped completion
 *   POST /messages          → Anthropic-shaped completion
 */
export function startFakeProviderServer(): FakeProviderServer {
  const state: FakeProviderServer = {
    url: "",
    requests: [],
    modelsStatus: 200,
    completionText: "STAND-IN",
    stop: () => server.stop(true),
    reset: () => {
      state.requests = [];
      state.modelsStatus = 200;
      state.completionText = "STAND-IN";
    }
  };

  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      const { pathname } = new URL(req.url);
      const record: RecordedRequest = { method: req.method, path: pathname };
      if (req.method === "POST") {
        record.body = (await req.json()) as Record<string, unknown>;
      }
      state.requests.push(record);

      if (pathname === "/models" && req.method === "GET") {
        if (state.modelsStatus !== 200) {
          return Response.json({ error: { message: "invalid api key" } }, { status: state.modelsStatus });
        }
        return Response.json({ object: "list", data: [] });
      }

      if (pathname === "/chat/completions" && req.method === "POST") {
        return Response.json({
          id: "cmpl-fake",
          model: record.body?.model,
          choices: [{ message: { content: state.completionText }, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        });
      }

      if (pathname === "/messages" && req.method === "POST") {
        return Response.json({
          id: "msg-fake",
          model: record.body?.model,
          content: [{ type: "text", text: state.completionText }],
          stop_reason: "end_turn",
          usage: { input_tokens: 10, output_tokens: 5 }
        });
      }

      return new Response("not found", { status: 404 });
    }
  });

  state.url = `http://127.0.0.1:${server.port}`;
  return state;
}

export interface Harness {
  core: SelectionCore;
  registry: ProviderRegistry;
  store: FileStore;
  storePath: string;
}

/** Build a core over a real registry + file store, pointed at the fake server. */
export async function buildHarness(server: FakeProviderServer, storePath?: string): Promise<Harness> {
  const resolvedPath = storePath ?? tempStorePath();
  const store = new FileStore(resolvedPath);
  const registry = new ProviderRegistry({ baseUrls: { openai: server.url, anthropic: server.url } });
  await registry.initializeDefaults();
  const core = new SelectionCore({ store, registry });
  return { core, registry, store, storePath: resolvedPath };
}
