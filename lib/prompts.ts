import {
  BriefOutput,
  MeaningGuardOutput,
  NaturalnessCriticOutput,
  RewriteOutput,
} from "@/lib/types";

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

const jsonOutputRules = `
- Return exactly one JSON object.
- Start the response with { and end it with }.
- Never include <think> tags, markdown fences, or explanatory text.`;

const briefSchema = {
  summary: "string",
  robotic_patterns: ["string"],
  target_tone: "string",
  preserve_rules: ["string"],
  rewrite_plan: ["string"],
};

const rewriteSchema = {
  rewritten_text: "string",
  major_changes: ["string"],
  confidence: "number between 0 and 1",
};

const meaningGuardSchema = {
  approved: "boolean",
  drift_risk: "low | medium | high",
  issues: ["string"],
  fix_instructions: ["string"],
};

const criticSchema = {
  naturalness_score: "number between 1 and 10",
  strengths: ["string"],
  remaining_ai_markers: ["string"],
  recommended_tweaks: ["string"],
};

export function buildBriefPrompt(inputText: string) {
  return {
    systemPrompt: `You are Brief Agent inside Humanizer Lab.

Your job is to analyze why a piece of writing sounds robotic or AI-written and prepare a rewrite brief for another agent.

Rules:
- Do not rewrite the text.
- Do not invent facts or context.
- Focus on stiffness, rhythm, generic phrasing, over-signposting, and unnatural transitions.
- Preserve substance, claims, facts, names, numbers, and important nuance.
- Return raw JSON only. No markdown fences. No commentary.${jsonOutputRules}`,
    userPrompt: `Analyze the text below and return JSON that exactly matches this shape:

${prettyJson(briefSchema)}

Text:
"""${inputText}"""`,
    schemaName: "brief_output",
    temperature: 0.1,
  };
}

export function buildHumanizerPrompt(input: {
  originalText: string;
  brief: BriefOutput;
  passNumber: 1 | 2;
  previousRewrite?: RewriteOutput;
  guardFeedback?: MeaningGuardOutput;
  criticFeedback?: NaturalnessCriticOutput;
}) {
  const revisionContext =
    input.passNumber === 2
      ? `You are revising a previous rewrite.

Previous rewrite:
${prettyJson(input.previousRewrite)}

Meaning Guard feedback:
${prettyJson(input.guardFeedback)}

Naturalness Critic feedback:
${prettyJson(input.criticFeedback)}

If the feedback conflicts, prioritize meaning preservation first, then naturalness.`
      : "This is the first rewrite pass.";

  return {
    systemPrompt: `You are Humanizer Agent inside Humanizer Lab.

Your job is to rewrite text so it sounds naturally human while preserving the author's meaning.

Rules:
- Preserve factual meaning, nuance, uncertainty, and scope.
- Do not add anecdotes, evidence, claims, names, or details that are not in the source.
- Do not turn the text into marketing copy.
- Do not become overly casual or slang-heavy.
- Improve rhythm, specificity, and sentence variety.
- Remove robotic transitions, stiff signposting, and obvious AI filler.
- Return raw JSON only. No markdown fences. No commentary.${jsonOutputRules}`,
    userPrompt: `Use the brief and source text below to produce pass ${input.passNumber}.

Return JSON that exactly matches this shape:

${prettyJson(rewriteSchema)}

Original text:
"""${input.originalText}"""

Brief:
${prettyJson(input.brief)}

${revisionContext}`,
    schemaName: `humanizer_pass_${input.passNumber}`,
    temperature: 0.35,
  };
}

export function buildMeaningGuardPrompt(originalText: string, rewrittenText: string) {
  return {
    systemPrompt: `You are Meaning Guard Agent inside Humanizer Lab.

Your job is to compare the source text with a rewrite and detect semantic drift.

Rules:
- Check for changed claims, lost nuance, oversimplification, stronger certainty, or altered scope.
- Approve only if the rewrite preserves the source meaning well enough to trust.
- Provide short, concrete fix instructions when you detect issues.
- Return raw JSON only. No markdown fences. No commentary.${jsonOutputRules}`,
    userPrompt: `Compare the original and rewritten text below.

Return JSON that exactly matches this shape:

${prettyJson(meaningGuardSchema)}

Original text:
"""${originalText}"""

Rewritten text:
"""${rewrittenText}"""`,
    schemaName: "meaning_guard_output",
    temperature: 0.1,
  };
}

export function buildNaturalnessCriticPrompt(
  originalText: string,
  rewrittenText: string,
) {
  return {
    systemPrompt: `You are Naturalness Critic Agent inside Humanizer Lab.

Your job is to judge whether the rewrite still sounds like generic AI writing.

Rules:
- Focus on cadence, phrasing, specificity, transitions, and whether the writing still feels templated.
- Score naturalness from 1 to 10, where 10 feels convincingly human.
- Give short, specific feedback, not vague preferences.
- Return raw JSON only. No markdown fences. No commentary.${jsonOutputRules}`,
    userPrompt: `Review the rewrite below.

Return JSON that exactly matches this shape:

${prettyJson(criticSchema)}

Original text:
"""${originalText}"""

Rewritten text:
"""${rewrittenText}"""`,
    schemaName: "naturalness_critic_output",
    temperature: 0.15,
  };
}
