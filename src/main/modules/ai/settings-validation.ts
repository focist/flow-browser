/**
 * AI Settings boundary validation
 *
 * Validates settings patches arriving over IPC before they touch the service
 * or the persisted store. Pure module: no electron imports.
 */

import type { AISettings } from "~/flow/interfaces/ai";
import { isCatalogModel, isKnownProvider, normalizeProviderId } from "./model-catalog";

export type ValidationResult = { ok: true; patch: Partial<AISettings> } | { ok: false; error: string };

/**
 * Validate a settings patch against the accepted shape and the model catalog.
 * `currentProvider` supplies provider context for a model-only patch.
 */
export function validateSettingsPatch(patch: unknown, currentProvider: AISettings["provider"]): ValidationResult {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
    return { ok: false, error: "Settings patch must be an object" };
  }

  const p = patch as Record<string, unknown>;

  if ("provider" in p && !isKnownProvider(p.provider)) {
    return { ok: false, error: `Unknown provider: ${String(p.provider)}` };
  }

  const effectiveProvider = ("provider" in p ? p.provider : currentProvider) as AISettings["provider"];

  if ("model" in p && p.model !== undefined) {
    if (typeof p.model !== "string") {
      return { ok: false, error: "Model must be a string" };
    }
    if (normalizeProviderId(effectiveProvider) === "local") {
      if (p.model !== "") {
        return { ok: false, error: "The local provider takes no model" };
      }
    } else if (p.model !== "" && !isCatalogModel(effectiveProvider, p.model)) {
      return { ok: false, error: `Unknown model for ${effectiveProvider}: ${p.model}` };
    }
  }

  if ("enabled" in p && typeof p.enabled !== "boolean") {
    return { ok: false, error: "enabled must be a boolean" };
  }

  if ("apiKey" in p && p.apiKey !== undefined && typeof p.apiKey !== "string") {
    return { ok: false, error: "apiKey must be a string" };
  }

  if ("confidenceThreshold" in p) {
    const v = p.confidenceThreshold;
    if (typeof v !== "number" || Number.isNaN(v) || v < 0 || v > 1) {
      return { ok: false, error: "confidenceThreshold must be a number between 0 and 1" };
    }
  }

  return { ok: true, patch: patch as Partial<AISettings> };
}
