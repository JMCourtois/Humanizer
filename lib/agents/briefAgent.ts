import { runMiniMax } from "@/lib/minimax";
import { buildBriefPrompt } from "@/lib/prompts";
import { BriefOutput } from "@/lib/types";

function normalizeBriefOutput(value: unknown): BriefOutput {
  const input = (value ?? {}) as Partial<BriefOutput>;

  return {
    summary: typeof input.summary === "string" ? input.summary : "",
    robotic_patterns: Array.isArray(input.robotic_patterns)
      ? input.robotic_patterns.map(String)
      : [],
    target_tone: typeof input.target_tone === "string" ? input.target_tone : "",
    preserve_rules: Array.isArray(input.preserve_rules)
      ? input.preserve_rules.map(String)
      : [],
    rewrite_plan: Array.isArray(input.rewrite_plan)
      ? input.rewrite_plan.map(String)
      : [],
  };
}

export async function runBriefAgent(inputText: string): Promise<BriefOutput> {
  return runMiniMax<BriefOutput>({
    ...buildBriefPrompt(inputText),
    transform: normalizeBriefOutput,
  });
}
