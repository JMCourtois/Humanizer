import { runMiniMax } from "@/lib/minimax";
import { buildNaturalnessCriticPrompt } from "@/lib/prompts";
import { NaturalnessCriticOutput } from "@/lib/types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeNaturalnessOutput(value: unknown): NaturalnessCriticOutput {
  const input = (value ?? {}) as Partial<NaturalnessCriticOutput>;
  const score =
    typeof input.naturalness_score === "number"
      ? clamp(Math.round(input.naturalness_score), 1, 10)
      : 5;

  return {
    naturalness_score: score,
    strengths: Array.isArray(input.strengths) ? input.strengths.map(String) : [],
    remaining_ai_markers: Array.isArray(input.remaining_ai_markers)
      ? input.remaining_ai_markers.map(String)
      : [],
    recommended_tweaks: Array.isArray(input.recommended_tweaks)
      ? input.recommended_tweaks.map(String)
      : [],
  };
}

export async function runNaturalnessCriticAgent(
  originalText: string,
  rewrittenText: string,
): Promise<NaturalnessCriticOutput> {
  return runMiniMax<NaturalnessCriticOutput>({
    ...buildNaturalnessCriticPrompt(originalText, rewrittenText),
    transform: normalizeNaturalnessOutput,
  });
}
