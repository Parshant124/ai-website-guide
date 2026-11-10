import { z } from "zod";
import { GuidanceError } from "./errors.js";

// ---------- Request: extension -> backend ----------

const ElementSchema = z.object({
  id: z.string().regex(/^el_\d+$/),
  kind: z.string().max(30),
  text: z.string().max(200),
  href: z.string().max(300).nullable(),
  inputType: z.string().max(30).nullable(),
  disabled: z.boolean(),
  sensitive: z.boolean(),
  inViewport: z.boolean(),
});

export const GuideRequestSchema = z.object({
  task: z.string().trim().min(3).max(300),
  page: z.object({
    scanId: z.number().int().positive(),
    url: z.string().max(500),
    title: z.string().max(200),
    headings: z
      .array(
        z.object({
          level: z.number().int().min(1).max(3),
          text: z.string().max(200),
        }),
      )
      .max(20),
    elements: z.array(ElementSchema).max(150),
    totalFound: z.number().int().nonnegative(),
    truncated: z.boolean(),
  }),
});

// ---------- What the AI must produce ----------
// Deliberately plain: OpenAI Structured Outputs supports only a subset of
// schema features, so strict checks happen in validateGuidance() below.

// ---------- What the AI must produce ----------
// targetElementId is "" when there is no target (plain strings are the safest
// type across model APIs). validateGuidance() converts "" to null.

export const AiGuidanceSchema = z.object({
  type: z.enum(["step", "clarify", "complete", "cannot_help"]),
  message: z.string(),
  targetElementId: z.string(),
  expectedOutcomeType: z.enum(["url_change", "content_change", "element_appears", "none"]),
  expectedOutcomeHint: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
});

// Checks the AI's answer against the page we actually sent, and converts it
// to the final shape returned to the extension.
export function validateGuidance(raw, page) {
  const bad = (msg) => new GuidanceError("INVALID_AI_RESPONSE", msg, 502);

  const message = raw.message.trim().slice(0, 400);
  if (!message) throw bad("The AI returned an empty message.");

  const targetId = raw.targetElementId.trim() || null;

  if (raw.type === "step") {
    if (!targetId) throw bad("A step must name a target element.");
    const target = page.elements.find((e) => e.id === targetId);
    if (!target) throw bad("The AI referenced an element that is not on the page.");
    if (target.disabled) throw bad("The AI targeted a disabled element.");
  } else if (targetId !== null) {
    throw bad(`A "${raw.type}" response must not have a target.`);
  }

  return {
    type: raw.type,
    message,
    targetElementId: targetId,
    expectedOutcome: {
      type: raw.expectedOutcomeType,
      hint: raw.expectedOutcomeHint.trim().slice(0, 200),
    },
    confidence: raw.confidence,
  };
}