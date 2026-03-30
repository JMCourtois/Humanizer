import { runMiniMax } from "@/lib/minimax";
import { buildMeaningGuardPrompt } from "@/lib/prompts";
import { MeaningGuardOutput } from "@/lib/types";

function normalizeDriftRisk(
  value: unknown,
): MeaningGuardOutput["drift_risk"] {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return "medium";
}

function normalizeMeaningGuardOutput(value: unknown): MeaningGuardOutput {
  const input = (value ?? {}) as Partial<MeaningGuardOutput>;

  return {
    approved: Boolean(input.approved),
    drift_risk: normalizeDriftRisk(input.drift_risk),
    issues: Array.isArray(input.issues) ? input.issues.map(String) : [],
    fix_instructions: Array.isArray(input.fix_instructions)
      ? input.fix_instructions.map(String)
      : [],
  };
}

export async function runMeaningGuardAgent(
  originalText: string,
  rewrittenText: string,
): Promise<MeaningGuardOutput> {
  return runMiniMax<MeaningGuardOutput>({
    ...buildMeaningGuardPrompt(originalText, rewrittenText),
    transform: normalizeMeaningGuardOutput,
  });
}
