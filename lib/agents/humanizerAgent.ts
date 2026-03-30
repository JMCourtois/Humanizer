import { runMiniMax } from "@/lib/minimax";
import { buildHumanizerPrompt } from "@/lib/prompts";
import {
  BriefOutput,
  MeaningGuardOutput,
  NaturalnessCriticOutput,
  RewriteOutput,
} from "@/lib/types";

export interface HumanizerAgentInput {
  originalText: string;
  brief: BriefOutput;
  passNumber: 1 | 2;
  previousRewrite?: RewriteOutput;
  guardFeedback?: MeaningGuardOutput;
  criticFeedback?: NaturalnessCriticOutput;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRewriteOutput(value: unknown): RewriteOutput {
  const input = (value ?? {}) as Partial<RewriteOutput>;
  const confidence =
    typeof input.confidence === "number" ? clamp(input.confidence, 0, 1) : 0.5;

  return {
    rewritten_text:
      typeof input.rewritten_text === "string" ? input.rewritten_text : "",
    major_changes: Array.isArray(input.major_changes)
      ? input.major_changes.map(String)
      : [],
    confidence,
  };
}

export async function runHumanizerAgent(
  input: HumanizerAgentInput,
): Promise<RewriteOutput> {
  return runMiniMax<RewriteOutput>({
    ...buildHumanizerPrompt(input),
    transform: normalizeRewriteOutput,
  });
}
