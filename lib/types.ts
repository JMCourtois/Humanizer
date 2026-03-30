export type JobStatus = "queued" | "running" | "completed" | "failed";

export type AgentName =
  | "brief"
  | "humanizer"
  | "meaningGuard"
  | "naturalnessCritic";

export type AgentRunStatus = "idle" | "running" | "done" | "blocked";

export interface BriefOutput {
  summary: string;
  robotic_patterns: string[];
  target_tone: string;
  preserve_rules: string[];
  rewrite_plan: string[];
}

export interface RewriteOutput {
  rewritten_text: string;
  major_changes: string[];
  confidence: number;
}

export interface MeaningGuardOutput {
  approved: boolean;
  drift_risk: "low" | "medium" | "high";
  issues: string[];
  fix_instructions: string[];
}

export interface NaturalnessCriticOutput {
  naturalness_score: number;
  strengths: string[];
  remaining_ai_markers: string[];
  recommended_tweaks: string[];
}

export interface FinalOutput {
  final_text: string;
  passes_used: 1 | 2;
  revision_triggered: boolean;
  meaning_safe: boolean;
  drift_risk: "low" | "medium" | "high";
  naturalness_score: number;
  what_changed: string[];
  verdict: string;
}

export interface JobOutputs {
  brief?: BriefOutput;
  rewritePass1?: RewriteOutput;
  meaningGuardPass1?: MeaningGuardOutput;
  criticPass1?: NaturalnessCriticOutput;
  rewritePass2?: RewriteOutput;
  meaningGuardPass2?: MeaningGuardOutput;
  criticPass2?: NaturalnessCriticOutput;
  final?: FinalOutput;
}

export interface JobEvent {
  id: string;
  timestamp: string;
  type: "job" | "agent" | "decision" | "error";
  agent?: AgentName;
  message: string;
}

export interface AgentStatus {
  name: AgentName;
  label: string;
  status: AgentRunStatus;
  startedAt?: string;
  finishedAt?: string;
}

export interface JobState {
  id: string;
  inputText: string;
  status: JobStatus;
  currentStep: string;
  startedAt: string;
  finishedAt?: string;
  events: JobEvent[];
  outputs: JobOutputs;
  agentStatuses: Record<AgentName, AgentStatus>;
  error?: {
    step: string;
    message: string;
  };
}

export const AGENT_ORDER: AgentName[] = [
  "brief",
  "humanizer",
  "meaningGuard",
  "naturalnessCritic",
];

export const AGENT_LABELS: Record<AgentName, string> = {
  brief: "Brief Agent",
  humanizer: "Humanizer Agent",
  meaningGuard: "Meaning Guard Agent",
  naturalnessCritic: "Naturalness Critic Agent",
};

export const AGENT_DESCRIPTIONS: Record<AgentName, string> = {
  brief: "Analyzes stiffness, defines tone, and sets preservation rules.",
  humanizer: "Rewrites the text so it feels natural while following the brief.",
  meaningGuard:
    "Checks the rewrite against the source to catch semantic drift or lost nuance.",
  naturalnessCritic:
    "Scores naturalness and points out remaining generic AI markers.",
};

export const OUTPUT_CARD_ORDER: Array<{
  key: keyof JobOutputs;
  label: string;
}> = [
  { key: "brief", label: "Brief Output" },
  { key: "rewritePass1", label: "Humanizer Pass 1" },
  { key: "meaningGuardPass1", label: "Meaning Guard Pass 1" },
  { key: "criticPass1", label: "Naturalness Critic Pass 1" },
  { key: "rewritePass2", label: "Humanizer Pass 2" },
  { key: "meaningGuardPass2", label: "Meaning Guard Pass 2" },
  { key: "criticPass2", label: "Naturalness Critic Pass 2" },
  { key: "final", label: "Final Report" },
];

export function createInitialAgentStatuses(): Record<AgentName, AgentStatus> {
  return {
    brief: {
      name: "brief",
      label: AGENT_LABELS.brief,
      status: "idle",
    },
    humanizer: {
      name: "humanizer",
      label: AGENT_LABELS.humanizer,
      status: "idle",
    },
    meaningGuard: {
      name: "meaningGuard",
      label: AGENT_LABELS.meaningGuard,
      status: "idle",
    },
    naturalnessCritic: {
      name: "naturalnessCritic",
      label: AGENT_LABELS.naturalnessCritic,
      status: "idle",
    },
  };
}

export function latestRewrite(outputs: JobOutputs): RewriteOutput | undefined {
  return outputs.rewritePass2 ?? outputs.rewritePass1;
}
