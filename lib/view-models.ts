import {
  AGENT_DESCRIPTIONS,
  AGENT_LABELS,
  AgentName,
  BriefOutput,
  JobEvent,
  JobOutputs,
  JobState,
  MeaningGuardOutput,
  NaturalnessCriticOutput,
  OUTPUT_CARD_ORDER,
  RewriteOutput,
  latestRewrite,
} from "@/lib/types";

export type FlowNodeId =
  | "input"
  | "brief"
  | "humanizer"
  | "meaningGuard"
  | "naturalnessCritic"
  | "decision"
  | "final";

export type FlowNodeStatus =
  | "idle"
  | "waiting"
  | "running"
  | "done"
  | "blocked";

export interface JobOverviewView {
  statusLabel: string;
  activeAgentLabel: string;
  currentPassLabel: string;
  elapsedLabel: string;
  revisionLabel: string;
  currentStepLabel: string;
  latestCheckpointLabel: string;
}

export interface NowHappeningView {
  statusTone: "idle" | "running" | "success" | "error";
  title: string;
  detail: string;
  inputLabel: string;
  nextStepLabel: string;
  latestCheckpointLabel: string;
}

export interface FlowNodeView {
  id: FlowNodeId;
  label: string;
  status: FlowNodeStatus;
  summary: string;
  detail: string;
  badge?: string;
  isActive: boolean;
  isRecent: boolean;
}

export interface FlowView {
  nodes: Record<FlowNodeId, FlowNodeView>;
  activeHandoffLabel: string;
  revisionState: "dormant" | "triggered" | "completed";
  revisionLabel: string;
}

export interface ActivityFeedItem {
  id: string;
  type: JobEvent["type"];
  title: string;
  detail: string;
  timestampLabel: string;
  badges: string[];
  isLatest: boolean;
}

export interface AgentCardView {
  key: keyof JobOutputs;
  title: string;
  badge?: string;
  summary: string;
  excerpt?: string;
  metrics: string[];
  bullets: string[];
  rawOutput: unknown;
}

function countWords(text: string) {
  const matches = text.trim().match(/\S+/g);
  return matches?.length ?? 0;
}

function truncate(text: string, maxLength = 180) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function formatDuration(startedAt: string, finishedAt?: string, now = Date.now()) {
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : now;
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  return `${seconds}s`;
}

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

export function getActiveAgent(job: JobState | null): AgentName | null {
  if (!job) {
    return null;
  }

  const activeAgent = Object.values(job.agentStatuses).find(
    (agent) => agent.status === "running",
  );

  return activeAgent?.name ?? null;
}

export function getCurrentPass(job: JobState | null): 1 | 2 {
  if (
    job?.currentStep.includes("Pass 2") ||
    job?.outputs.rewritePass2 ||
    job?.outputs.meaningGuardPass2 ||
    job?.outputs.criticPass2 ||
    job?.outputs.final?.passes_used === 2
  ) {
    return 2;
  }

  return 1;
}

function getLatestCheckpoint(job: JobState | null) {
  if (!job) {
    return "No job has started yet.";
  }

  if (job.outputs.final) {
    return job.outputs.final.verdict;
  }

  if (job.outputs.criticPass2) {
    return `Critic rescored the revision at ${job.outputs.criticPass2.naturalness_score}/10.`;
  }

  if (job.outputs.meaningGuardPass2) {
    return job.outputs.meaningGuardPass2.approved
      ? "Meaning Guard approved the revision."
      : "Meaning Guard still sees semantic drift in the revision.";
  }

  if (job.outputs.rewritePass2) {
    return `Pass 2 rewrite ready with confidence ${job.outputs.rewritePass2.confidence.toFixed(
      2,
    )}.`;
  }

  if (job.outputs.criticPass1) {
    return `Critic scored pass 1 at ${job.outputs.criticPass1.naturalness_score}/10.`;
  }

  if (job.outputs.meaningGuardPass1) {
    return job.outputs.meaningGuardPass1.approved
      ? "Meaning Guard approved pass 1."
      : "Meaning Guard flagged pass 1 for drift risk.";
  }

  if (job.outputs.rewritePass1) {
    return `First rewrite is ready with confidence ${job.outputs.rewritePass1.confidence.toFixed(
      2,
    )}.`;
  }

  if (job.outputs.brief) {
    return `Brief ready with ${job.outputs.brief.rewrite_plan.length} rewrite instructions.`;
  }

  return "Waiting for the first agent output.";
}

function getRevisionState(job: JobState | null): FlowView["revisionState"] {
  if (!job) {
    return "dormant";
  }

  const revisionTriggered = Boolean(
    job.outputs.rewritePass2 ||
      job.outputs.meaningGuardPass2 ||
      job.outputs.criticPass2 ||
      job.outputs.final?.revision_triggered,
  );

  if (!revisionTriggered) {
    return "dormant";
  }

  if (job.outputs.final?.revision_triggered && job.status === "completed") {
    return "completed";
  }

  return "triggered";
}

function getRevisionLabel(job: JobState | null) {
  const revisionState = getRevisionState(job);

  if (revisionState === "completed") {
    return "Revision loop completed";
  }

  if (revisionState === "triggered") {
    return "Revision loop active";
  }

  return "Revision loop not triggered";
}

function getFlowStatus(
  job: JobState | null,
  agentName?: AgentName,
): FlowNodeStatus {
  if (!job) {
    return "idle";
  }

  if (!agentName) {
    return job.status === "failed" ? "blocked" : "waiting";
  }

  const agentStatus = job.agentStatuses[agentName]?.status;

  if (agentStatus === "idle") {
    return job.status === "queued" || job.status === "running" ? "waiting" : "idle";
  }

  return agentStatus;
}

function getActiveHandoffLabel(job: JobState | null) {
  if (!job) {
    return "Source text -> Brief Agent";
  }

  if (job.currentStep === "Brief Agent" || job.status === "queued") {
    return "Source text -> Brief Agent";
  }

  if (job.currentStep === "Humanizer Agent Pass 1") {
    return "Brief Agent -> Humanizer Agent";
  }

  if (
    job.currentStep === "Meaning Guard Pass 1" ||
    job.currentStep === "Naturalness Critic Pass 1"
  ) {
    return "Humanizer Agent -> Evaluation split";
  }

  if (
    job.currentStep === "Meaning Guard Pass 2" ||
    job.currentStep === "Naturalness Critic Pass 2"
  ) {
    return "Humanizer Agent -> Evaluation split";
  }

  if (
    job.currentStep === "Humanizer Agent Pass 2"
  ) {
    return "Decision Gate -> Humanizer Agent";
  }

  if (job.outputs.final || job.status === "completed") {
    return "Decision Gate -> Final Output";
  }

  return "Pipeline is preparing the next handoff";
}

function getDecisionSummary(job: JobState | null) {
  if (!job) {
    return {
      status: "idle" as const,
      summary: "Decision gate waits for Guard and Critic.",
      detail: "It decides whether pass 1 is good enough or if one revision pass is needed.",
      badge: "Threshold >= 8",
      isActive: false,
      isRecent: false,
    };
  }

  const pass1Ready = Boolean(job.outputs.meaningGuardPass1 && job.outputs.criticPass1);

  if (!pass1Ready) {
    return {
      status: job.status === "failed" ? ("blocked" as const) : ("waiting" as const),
      summary: "Waiting for Guard and Critic feedback.",
      detail: "The decision gate activates after both evaluation agents finish pass 1.",
      badge: "Threshold >= 8",
      isActive: false,
      isRecent: false,
    };
  }

  const shouldRevise =
    !job.outputs.meaningGuardPass1?.approved ||
    (job.outputs.criticPass1?.naturalness_score ?? 0) < 8;
  const revisionState = getRevisionState(job);

  return {
    status:
      job.status === "failed"
        ? ("blocked" as const)
        : shouldRevise && revisionState !== "completed"
          ? ("running" as const)
          : ("done" as const),
    summary: shouldRevise
      ? "Pass 1 missed the threshold, so the revision loop was opened."
      : "Pass 1 cleared both evaluation checks.",
    detail: shouldRevise
      ? "The orchestrator routes feedback back into Humanizer for one more rewrite pass."
      : "The orchestrator can finalize the report without another rewrite.",
    badge: shouldRevise ? "Revision required" : "Approved",
    isActive: shouldRevise && revisionState === "triggered",
    isRecent: true,
  };
}

function getFinalSummary(job: JobState | null) {
  if (!job) {
    return {
      status: "idle" as const,
      summary: "Final output will appear after the pipeline completes.",
      detail: "This stage combines the best rewrite with the final report.",
      badge: "Pending",
      isActive: false,
      isRecent: false,
    };
  }

  if (job.status === "failed") {
    return {
      status: "blocked" as const,
      summary: "The run stopped before a final report could be prepared.",
      detail: job.error
        ? `${job.error.step} failed: ${job.error.message}`
        : "An unknown error prevented completion.",
      badge: "Failed",
      isActive: false,
      isRecent: true,
    };
  }

  if (job.outputs.final) {
    return {
      status: "done" as const,
      summary: job.outputs.final.verdict,
      detail: `Final score ${job.outputs.final.naturalness_score}/10 with ${
        job.outputs.final.meaning_safe ? "meaning preserved" : "meaning review needed"
      }.`,
      badge: `${job.outputs.final.passes_used} pass${
        job.outputs.final.passes_used === 1 ? "" : "es"
      }`,
      isActive: false,
      isRecent: true,
    };
  }

  return {
    status: job.status === "running" ? ("waiting" as const) : ("idle" as const),
    summary: "Waiting for a completed rewrite and final verdict.",
    detail: "The final stage activates after the decision gate finishes routing the run.",
    badge: "Pending",
    isActive: false,
    isRecent: false,
  };
}

export function deriveJobOverview(job: JobState | null, now = Date.now()): JobOverviewView {
  if (!job) {
    return {
      statusLabel: "Idle",
      activeAgentLabel: "No active job",
      currentPassLabel: "Pass 1",
      elapsedLabel: "0s",
      revisionLabel: "Not started",
      currentStepLabel: "Waiting for input",
      latestCheckpointLabel: "Paste text to create the first job.",
    };
  }

  const activeAgent = getActiveAgent(job);

  return {
    statusLabel: job.status,
    activeAgentLabel: activeAgent ? AGENT_LABELS[activeAgent] : "None",
    currentPassLabel: `Pass ${getCurrentPass(job)}`,
    elapsedLabel: formatDuration(job.startedAt, job.finishedAt, now),
    revisionLabel: getRevisionLabel(job),
    currentStepLabel: job.currentStep,
    latestCheckpointLabel: getLatestCheckpoint(job),
  };
}

export function deriveNowHappening(job: JobState | null): NowHappeningView {
  if (!job) {
    return {
      statusTone: "idle",
      title: "Ready for a new run",
      detail:
        "Paste source text and start the pipeline to watch the four agents coordinate their handoffs.",
      inputLabel: "Input source: none yet",
      nextStepLabel: "Next step: Brief Agent will analyze the text first.",
      latestCheckpointLabel: "No checkpoints yet.",
    };
  }

  if (job.status === "failed") {
    return {
      statusTone: "error",
      title: "Pipeline paused by an error",
      detail: job.error
        ? `${job.error.step} failed and the remaining stages were blocked.`
        : "The run failed before completion.",
      inputLabel: `Input source: ${countWords(job.inputText)} words of source text`,
      nextStepLabel: "Next step: fix the issue and run the pipeline again.",
      latestCheckpointLabel: getLatestCheckpoint(job),
    };
  }

  if (job.status === "completed") {
    return {
      statusTone: "success",
      title: "Pipeline completed",
      detail: job.outputs.final?.verdict ?? "The final report is ready to inspect.",
      inputLabel: `Input source: ${countWords(job.inputText)} words of original text`,
      nextStepLabel: "Next step: compare the final output, review the cards, or run another example.",
      latestCheckpointLabel: getLatestCheckpoint(job),
    };
  }

  switch (job.currentStep) {
    case "Brief Agent":
      return {
        statusTone: "running",
        title: "Brief Agent is defining the rewrite brief",
        detail:
          "It is identifying robotic patterns, target tone, and preservation rules before any rewrite happens.",
        inputLabel: "Input source: original text only",
        nextStepLabel: "Next step: Humanizer Agent pass 1",
        latestCheckpointLabel: getLatestCheckpoint(job),
      };
    case "Humanizer Agent Pass 1":
      return {
        statusTone: "running",
        title: "Humanizer Agent is drafting pass 1",
        detail:
          "It is using the original text plus the brief to produce the first natural-sounding rewrite.",
        inputLabel: "Input source: original text + brief instructions",
        nextStepLabel: "Next step: Meaning Guard and Naturalness Critic evaluate pass 1",
        latestCheckpointLabel: getLatestCheckpoint(job),
      };
    case "Meaning Guard Pass 1":
      return {
        statusTone: "running",
        title: "Meaning Guard is checking pass 1",
        detail:
          "It is comparing the original text against the first rewrite to catch drift, lost nuance, or changed claims.",
        inputLabel: "Input source: original text + rewrite pass 1",
        nextStepLabel: "Next step: Naturalness Critic and then the decision gate",
        latestCheckpointLabel: getLatestCheckpoint(job),
      };
    case "Naturalness Critic Pass 1":
      return {
        statusTone: "running",
        title: "Naturalness Critic is scoring pass 1",
        detail:
          "It is checking whether the first rewrite still sounds templated or obviously AI-written.",
        inputLabel: "Input source: original text + rewrite pass 1",
        nextStepLabel: "Next step: decision gate decides whether revision is needed",
        latestCheckpointLabel: getLatestCheckpoint(job),
      };
    case "Humanizer Agent Pass 2":
      return {
        statusTone: "running",
        title: "Humanizer Agent is revising with feedback",
        detail:
          "The second rewrite pass is using Guard and Critic feedback to preserve meaning and improve naturalness.",
        inputLabel: "Input source: original text + brief + evaluation feedback",
        nextStepLabel: "Next step: second evaluation round",
        latestCheckpointLabel: getLatestCheckpoint(job),
      };
    case "Meaning Guard Pass 2":
      return {
        statusTone: "running",
        title: "Meaning Guard is validating the revision",
        detail:
          "It is checking whether the revised rewrite fixed the drift issues without creating new ones.",
        inputLabel: "Input source: original text + rewrite pass 2",
        nextStepLabel: "Next step: Naturalness Critic scores the revision",
        latestCheckpointLabel: getLatestCheckpoint(job),
      };
    case "Naturalness Critic Pass 2":
      return {
        statusTone: "running",
        title: "Naturalness Critic is scoring the revision",
        detail:
          "This is the final naturalness check before the result panel is finalized.",
        inputLabel: "Input source: original text + rewrite pass 2",
        nextStepLabel: "Next step: final output and report",
        latestCheckpointLabel: getLatestCheckpoint(job),
      };
    default:
      return {
        statusTone: "running",
        title: "Pipeline is getting ready",
        detail: "The orchestrator has the job and is about to start the first agent.",
        inputLabel: `Input source: ${countWords(job.inputText)} words of original text`,
        nextStepLabel: "Next step: Brief Agent",
        latestCheckpointLabel: getLatestCheckpoint(job),
      };
  }
}

export function deriveFlowView(
  job: JobState | null,
  draftInputText: string,
): FlowView {
  const revisionState = getRevisionState(job);
  const activeAgent = getActiveAgent(job);
  const sourceText = job?.inputText ?? draftInputText;
  const sourceWordCount = countWords(sourceText);
  const decisionSummary = getDecisionSummary(job);
  const finalSummary = getFinalSummary(job);

  const nodeStatus = (agentName?: AgentName) => getFlowStatus(job, agentName);
  const recentAgent =
    activeAgent ??
    (job?.outputs.criticPass2
      ? "naturalnessCritic"
      : job?.outputs.meaningGuardPass2
        ? "meaningGuard"
        : job?.outputs.rewritePass2
          ? "humanizer"
          : job?.outputs.criticPass1
            ? "naturalnessCritic"
            : job?.outputs.meaningGuardPass1
              ? "meaningGuard"
              : job?.outputs.rewritePass1
                ? "humanizer"
                : job?.outputs.brief
                  ? "brief"
                  : null);

  const nodes: Record<FlowNodeId, FlowNodeView> = {
    input: {
      id: "input",
      label: "Source Text",
      status: sourceText.trim() ? "done" : "idle",
      summary: sourceText.trim()
        ? `${sourceWordCount} words loaded into the pipeline.`
        : "Paste text to seed the run.",
      detail: sourceText.trim()
        ? truncate(sourceText, 120)
        : "The input card becomes the first anchor in the swimlane once text is present.",
      badge: sourceText.trim() ? `${sourceWordCount} words` : "Waiting",
      isActive: Boolean(job?.status === "queued"),
      isRecent: false,
    },
    brief: {
      id: "brief",
      label: AGENT_LABELS.brief,
      status: nodeStatus("brief"),
      summary:
        job?.outputs.brief?.summary ??
        (job?.agentStatuses.brief.status === "running"
          ? "Analyzing robotic patterns and defining the rewrite brief."
          : "Will define tone, preserve rules, and rewrite guidance."),
      detail:
        job?.outputs.brief?.target_tone ??
        AGENT_DESCRIPTIONS.brief,
      badge: job?.outputs.brief
        ? `${job.outputs.brief.rewrite_plan.length} rewrite rules`
        : "Pass 1",
      isActive: activeAgent === "brief",
      isRecent: recentAgent === "brief",
    },
    humanizer: {
      id: "humanizer",
      label: AGENT_LABELS.humanizer,
      status: nodeStatus("humanizer"),
      summary: job?.outputs.rewritePass2
        ? "Revision rewrite is ready for the second evaluation pass."
        : job?.outputs.rewritePass1
          ? "First rewrite is ready for review."
          : job?.agentStatuses.humanizer.status === "running"
            ? "Generating a rewrite from the brief and source text."
            : "Will rewrite the source text once the brief is ready.",
      detail: job?.outputs.rewritePass2?.major_changes[0]
        ?? job?.outputs.rewritePass1?.major_changes[0]
        ?? AGENT_DESCRIPTIONS.humanizer,
      badge: job?.outputs.rewritePass2
        ? `Pass 2 • ${job.outputs.rewritePass2.confidence.toFixed(2)}`
        : job?.outputs.rewritePass1
          ? `Pass 1 • ${job.outputs.rewritePass1.confidence.toFixed(2)}`
          : `Pass ${getCurrentPass(job)}`,
      isActive: activeAgent === "humanizer",
      isRecent: recentAgent === "humanizer",
    },
    meaningGuard: {
      id: "meaningGuard",
      label: AGENT_LABELS.meaningGuard,
      status: nodeStatus("meaningGuard"),
      summary: job?.outputs.meaningGuardPass2
        ? job.outputs.meaningGuardPass2.approved
          ? "Revision meaning check passed."
          : "Revision still has drift concerns."
        : job?.outputs.meaningGuardPass1
          ? job.outputs.meaningGuardPass1.approved
            ? "Pass 1 meaning check passed."
            : "Pass 1 flagged semantic drift."
          : job?.agentStatuses.meaningGuard.status === "running"
            ? "Comparing original and rewrite for semantic drift."
            : "Will verify whether the rewrite still says the same thing.",
      detail:
        job?.outputs.meaningGuardPass2?.issues[0]
        ?? job?.outputs.meaningGuardPass1?.issues[0]
        ?? AGENT_DESCRIPTIONS.meaningGuard,
      badge: job?.outputs.meaningGuardPass2
        ? `Pass 2 • ${job.outputs.meaningGuardPass2.drift_risk} risk`
        : job?.outputs.meaningGuardPass1
          ? `Pass 1 • ${job.outputs.meaningGuardPass1.drift_risk} risk`
          : "Evaluation",
      isActive: activeAgent === "meaningGuard",
      isRecent: recentAgent === "meaningGuard",
    },
    naturalnessCritic: {
      id: "naturalnessCritic",
      label: AGENT_LABELS.naturalnessCritic,
      status: nodeStatus("naturalnessCritic"),
      summary: job?.outputs.criticPass2
        ? `Revision scored ${job.outputs.criticPass2.naturalness_score}/10.`
        : job?.outputs.criticPass1
          ? `Pass 1 scored ${job.outputs.criticPass1.naturalness_score}/10.`
          : job?.agentStatuses.naturalnessCritic.status === "running"
            ? "Scoring how natural the rewrite feels."
            : "Will rate the rewrite and call out remaining AI markers.",
      detail:
        job?.outputs.criticPass2?.remaining_ai_markers[0]
        ?? job?.outputs.criticPass1?.remaining_ai_markers[0]
        ?? AGENT_DESCRIPTIONS.naturalnessCritic,
      badge: job?.outputs.criticPass2
        ? `Pass 2 • ${job.outputs.criticPass2.naturalness_score}/10`
        : job?.outputs.criticPass1
          ? `Pass 1 • ${job.outputs.criticPass1.naturalness_score}/10`
          : "Evaluation",
      isActive: activeAgent === "naturalnessCritic",
      isRecent: recentAgent === "naturalnessCritic",
    },
    decision: {
      id: "decision",
      label: "Decision Gate",
      status: decisionSummary.status,
      summary: decisionSummary.summary,
      detail: decisionSummary.detail,
      badge: decisionSummary.badge,
      isActive: decisionSummary.isActive,
      isRecent: decisionSummary.isRecent,
    },
    final: {
      id: "final",
      label: "Final Output",
      status: finalSummary.status,
      summary: finalSummary.summary,
      detail: finalSummary.detail,
      badge: finalSummary.badge,
      isActive: finalSummary.isActive,
      isRecent: finalSummary.isRecent,
    },
  };

  return {
    nodes,
    activeHandoffLabel: getActiveHandoffLabel(job),
    revisionState,
    revisionLabel:
      revisionState === "completed"
        ? "Decision loop used and resolved"
        : revisionState === "triggered"
          ? "Decision loop is routing feedback back into Humanizer"
          : "Decision loop is dormant",
  };
}

function buildBadges(event: JobEvent) {
  const badges = new Set<string>();
  const message = event.message.toLowerCase();

  const passMatch = event.message.match(/pass\s([12])/i);
  const scoreMatch = event.message.match(/(\d+)\/10/);
  const confidenceMatch = event.message.match(/confidence\s([0-9.]+)/i);

  if (passMatch) {
    badges.add(`Pass ${passMatch[1]}`);
  }

  if (scoreMatch) {
    badges.add(`${scoreMatch[1]}/10`);
  }

  if (confidenceMatch) {
    badges.add(`Confidence ${confidenceMatch[1]}`);
  }

  if (message.includes("approved")) {
    badges.add("Approved");
  }

  if (message.includes("revision loop")) {
    badges.add("Revision loop");
  }

  if (message.includes("failed")) {
    badges.add("Failed");
  }

  if (message.includes("completed")) {
    badges.add("Completed");
  }

  if (message.includes("low drift")) {
    badges.add("Low drift");
  }

  if (message.includes("medium drift")) {
    badges.add("Medium drift");
  }

  if (message.includes("high drift")) {
    badges.add("High drift");
  }

  return Array.from(badges);
}

function getEventTitle(event: JobEvent) {
  if (event.type === "agent" && event.agent) {
    return `${AGENT_LABELS[event.agent]} update`;
  }

  if (event.type === "decision") {
    return "Orchestrator decision";
  }

  if (event.type === "error") {
    return "Pipeline error";
  }

  if (event.message.toLowerCase().includes("created")) {
    return "Job created";
  }

  if (event.message.toLowerCase().includes("started")) {
    return "Pipeline started";
  }

  if (event.message.toLowerCase().includes("finished")) {
    return "Pipeline finished";
  }

  return "Pipeline update";
}

export function deriveActivityFeed(job: JobState | null): ActivityFeedItem[] {
  if (!job) {
    return [];
  }

  return job.events.map((event, index) => ({
    id: event.id,
    type: event.type,
    title: getEventTitle(event),
    detail: event.message,
    timestampLabel: formatTime(event.timestamp),
    badges: buildBadges(event),
    isLatest: index === job.events.length - 1,
  }));
}

function buildBriefCard(key: keyof JobOutputs, output: BriefOutput): AgentCardView {
  return {
    key,
    title: "Brief Output",
    badge: output.target_tone || "Brief",
    summary: output.summary || "The rewrite brief is ready.",
    metrics: [
      `${output.robotic_patterns.length} robotic patterns`,
      `${output.preserve_rules.length} preserve rules`,
      `${output.rewrite_plan.length} rewrite steps`,
    ],
    bullets:
      output.rewrite_plan.slice(0, 3).length > 0
        ? output.rewrite_plan.slice(0, 3)
        : output.preserve_rules.slice(0, 3),
    rawOutput: output,
  };
}

function buildRewriteCard(
  key: keyof JobOutputs,
  title: string,
  output: RewriteOutput,
  passLabel: string,
): AgentCardView {
  return {
    key,
    title,
    badge: `${passLabel} • ${output.confidence.toFixed(2)}`,
    summary: `${passLabel} rewrite is available for inspection.`,
    excerpt: truncate(output.rewritten_text, 220),
    metrics: [
      `Confidence ${output.confidence.toFixed(2)}`,
      `${output.major_changes.length} major changes`,
    ],
    bullets: output.major_changes.slice(0, 4),
    rawOutput: output,
  };
}

function buildGuardCard(
  key: keyof JobOutputs,
  title: string,
  output: MeaningGuardOutput,
  passLabel: string,
): AgentCardView {
  return {
    key,
    title,
    badge: `${passLabel} • ${output.drift_risk} risk`,
    summary: output.approved
      ? `${passLabel} meaning check approved the rewrite.`
      : `${passLabel} meaning check found semantic drift risks.`,
    metrics: [
      output.approved ? "Approved" : "Needs revision",
      `${output.issues.length} issues`,
      `${output.fix_instructions.length} fixes suggested`,
    ],
    bullets:
      output.issues.slice(0, 3).length > 0
        ? output.issues.slice(0, 3)
        : output.fix_instructions.slice(0, 3),
    rawOutput: output,
  };
}

function buildCriticCard(
  key: keyof JobOutputs,
  title: string,
  output: NaturalnessCriticOutput,
  passLabel: string,
): AgentCardView {
  return {
    key,
    title,
    badge: `${passLabel} • ${output.naturalness_score}/10`,
    summary: `${passLabel} naturalness score: ${output.naturalness_score}/10.`,
    metrics: [
      `${output.strengths.length} strengths`,
      `${output.remaining_ai_markers.length} AI markers`,
      `${output.recommended_tweaks.length} tweaks`,
    ],
    bullets:
      output.recommended_tweaks.slice(0, 3).length > 0
        ? output.recommended_tweaks.slice(0, 3)
        : output.remaining_ai_markers.slice(0, 3),
    rawOutput: output,
  };
}

export function deriveAgentCards(job: JobState | null): AgentCardView[] {
  if (!job) {
    return [];
  }

  return OUTPUT_CARD_ORDER.flatMap(({ key, label }) => {
    const output = job.outputs[key];

    if (!output) {
      return [];
    }

    if (key === "brief") {
      return [buildBriefCard(key, output as BriefOutput)];
    }

    if (key === "rewritePass1") {
      return [buildRewriteCard(key, label, output as RewriteOutput, "Pass 1")];
    }

    if (key === "rewritePass2") {
      return [buildRewriteCard(key, label, output as RewriteOutput, "Pass 2")];
    }

    if (key === "meaningGuardPass1") {
      return [buildGuardCard(key, label, output as MeaningGuardOutput, "Pass 1")];
    }

    if (key === "meaningGuardPass2") {
      return [buildGuardCard(key, label, output as MeaningGuardOutput, "Pass 2")];
    }

    if (key === "criticPass1") {
      return [
        buildCriticCard(key, label, output as NaturalnessCriticOutput, "Pass 1"),
      ];
    }

    if (key === "criticPass2") {
      return [
        buildCriticCard(key, label, output as NaturalnessCriticOutput, "Pass 2"),
      ];
    }

    const finalOutput = output as JobOutputs["final"];

    return [
      {
        key,
        title: label,
        badge: `${finalOutput?.passes_used ?? 1} pass${
          finalOutput?.passes_used === 1 ? "" : "es"
        }`,
        summary: finalOutput?.verdict ?? "Final report is ready.",
        excerpt: finalOutput?.final_text
          ? truncate(finalOutput.final_text, 220)
          : undefined,
        metrics: [
          `Naturalness ${finalOutput?.naturalness_score ?? "?"}/10`,
          finalOutput?.meaning_safe ? "Meaning approved" : "Meaning review needed",
          finalOutput?.revision_triggered ? "Revision triggered" : "No revision loop",
        ],
        bullets: finalOutput?.what_changed.slice(0, 4) ?? [],
        rawOutput: finalOutput,
      },
    ];
  });
}

export function getLatestRewrite(job: JobState | null) {
  return job ? latestRewrite(job.outputs) : undefined;
}
