import { runBriefAgent } from "@/lib/agents/briefAgent";
import { runHumanizerAgent } from "@/lib/agents/humanizerAgent";
import { runMeaningGuardAgent } from "@/lib/agents/meaningGuardAgent";
import { runNaturalnessCriticAgent } from "@/lib/agents/naturalnessCriticAgent";
import {
  addEvent,
  blockIdleAgents,
  getJob,
  saveAgentOutput,
  setAgentStatus,
  setCurrentStep,
  setJobError,
  setJobStatus,
} from "@/lib/store";
import {
  AgentName,
  FinalOutput,
  MeaningGuardOutput,
  NaturalnessCriticOutput,
  RewriteOutput,
} from "@/lib/types";

function buildVerdict(
  meaningSafe: boolean,
  naturalnessScore: number,
  revisionTriggered: boolean,
): string {
  if (meaningSafe && naturalnessScore >= 8) {
    return revisionTriggered
      ? "Approved after one revision loop."
      : "Approved on the first pass.";
  }

  if (meaningSafe) {
    return "Meaning is preserved, but the result still shows a few AI markers.";
  }

  return "Readable output, but meaning drift still needs manual review.";
}

function buildWhatChanged(input: {
  rewrite: RewriteOutput;
}): string[] {
  const combined = input.rewrite.major_changes
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(combined)).slice(0, 5);
}

function buildFinalOutput(input: {
  rewrite: RewriteOutput;
  guard: MeaningGuardOutput;
  critic: NaturalnessCriticOutput;
  passesUsed: 1 | 2;
  revisionTriggered: boolean;
}): FinalOutput {
  return {
    final_text: input.rewrite.rewritten_text,
    passes_used: input.passesUsed,
    revision_triggered: input.revisionTriggered,
    meaning_safe: input.guard.approved,
    drift_risk: input.guard.drift_risk,
    naturalness_score: input.critic.naturalness_score,
    what_changed: buildWhatChanged({
      rewrite: input.rewrite,
    }),
    verdict: buildVerdict(
      input.guard.approved,
      input.critic.naturalness_score,
      input.revisionTriggered,
    ),
  };
}

function getInputText(jobId: string): string {
  const job = getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} does not exist.`);
  }

  return job.inputText;
}

export async function runHumanizerPipeline(jobId: string): Promise<void> {
  let activeStep = "Starting pipeline";
  let activeAgent: AgentName | null = null;

  try {
    const inputText = getInputText(jobId);

    setJobStatus(jobId, "running", "Starting pipeline");
    addEvent(jobId, {
      type: "job",
      message: "Orchestrator started the MiniMax-powered pipeline.",
    });

    activeStep = "Brief Agent";
    activeAgent = "brief";
    setCurrentStep(jobId, activeStep);
    setAgentStatus(jobId, "brief", "running");
    addEvent(jobId, {
      type: "agent",
      agent: "brief",
      message: "Brief Agent is analyzing robotic patterns and defining rewrite rules.",
    });
    const brief = await runBriefAgent(inputText);
    saveAgentOutput(jobId, "brief", brief);
    setAgentStatus(jobId, "brief", "done");
    activeAgent = null;
    addEvent(jobId, {
      type: "agent",
      agent: "brief",
      message: `Brief Agent finished with ${brief.robotic_patterns.length} robotic pattern notes.`,
    });

    activeStep = "Humanizer Agent Pass 1";
    activeAgent = "humanizer";
    setCurrentStep(jobId, activeStep);
    setAgentStatus(jobId, "humanizer", "running");
    addEvent(jobId, {
      type: "agent",
      agent: "humanizer",
      message: "Humanizer Agent is producing the first rewrite pass.",
    });
    const rewritePass1 = await runHumanizerAgent({
      originalText: inputText,
      brief,
      passNumber: 1,
    });
    saveAgentOutput(jobId, "rewritePass1", rewritePass1);
    setAgentStatus(jobId, "humanizer", "done");
    activeAgent = null;
    addEvent(jobId, {
      type: "agent",
      agent: "humanizer",
      message: `Humanizer Agent completed pass 1 with confidence ${rewritePass1.confidence.toFixed(
        2,
      )}.`,
    });

    activeStep = "Meaning Guard Pass 1";
    activeAgent = "meaningGuard";
    setCurrentStep(jobId, activeStep);
    setAgentStatus(jobId, "meaningGuard", "running");
    addEvent(jobId, {
      type: "agent",
      agent: "meaningGuard",
      message: "Meaning Guard Agent is checking semantic drift on pass 1.",
    });
    const meaningGuardPass1 = await runMeaningGuardAgent(
      inputText,
      rewritePass1.rewritten_text,
    );
    saveAgentOutput(jobId, "meaningGuardPass1", meaningGuardPass1);
    setAgentStatus(jobId, "meaningGuard", "done");
    activeAgent = null;
    addEvent(jobId, {
      type: "agent",
      agent: "meaningGuard",
      message: `Meaning Guard pass 1 returned ${
        meaningGuardPass1.approved ? "approved" : "needs revision"
      } with ${meaningGuardPass1.drift_risk} drift risk.`,
    });

    activeStep = "Naturalness Critic Pass 1";
    activeAgent = "naturalnessCritic";
    setCurrentStep(jobId, activeStep);
    setAgentStatus(jobId, "naturalnessCritic", "running");
    addEvent(jobId, {
      type: "agent",
      agent: "naturalnessCritic",
      message: "Naturalness Critic is scoring the first rewrite.",
    });
    const criticPass1 = await runNaturalnessCriticAgent(
      inputText,
      rewritePass1.rewritten_text,
    );
    saveAgentOutput(jobId, "criticPass1", criticPass1);
    setAgentStatus(jobId, "naturalnessCritic", "done");
    activeAgent = null;
    addEvent(jobId, {
      type: "agent",
      agent: "naturalnessCritic",
      message: `Naturalness Critic scored pass 1 at ${criticPass1.naturalness_score}/10.`,
    });

    const shouldRevise =
      !meaningGuardPass1.approved || criticPass1.naturalness_score < 8;

    addEvent(jobId, {
      type: "decision",
      message: shouldRevise
        ? "Pass 1 did not meet the approval threshold, so the orchestrator triggered one revision loop."
        : "Pass 1 cleared both the meaning and naturalness checks.",
    });

    let finalRewrite = rewritePass1;
    let finalGuard = meaningGuardPass1;
    let finalCritic = criticPass1;
    let passesUsed: 1 | 2 = 1;

    if (shouldRevise) {
      passesUsed = 2;

      activeStep = "Humanizer Agent Pass 2";
      activeAgent = "humanizer";
      setCurrentStep(jobId, activeStep);
      setAgentStatus(jobId, "humanizer", "running");
      addEvent(jobId, {
        type: "agent",
        agent: "humanizer",
        message:
          "Humanizer Agent is revising the text using Guard and Critic feedback.",
      });
      const rewritePass2 = await runHumanizerAgent({
        originalText: inputText,
        brief,
        passNumber: 2,
        previousRewrite: rewritePass1,
        guardFeedback: meaningGuardPass1,
        criticFeedback: criticPass1,
      });
      saveAgentOutput(jobId, "rewritePass2", rewritePass2);
      setAgentStatus(jobId, "humanizer", "done");
      activeAgent = null;
      addEvent(jobId, {
        type: "agent",
        agent: "humanizer",
        message: `Humanizer Agent completed pass 2 with confidence ${rewritePass2.confidence.toFixed(
          2,
        )}.`,
      });

      activeStep = "Meaning Guard Pass 2";
      activeAgent = "meaningGuard";
      setCurrentStep(jobId, activeStep);
      setAgentStatus(jobId, "meaningGuard", "running");
      addEvent(jobId, {
        type: "agent",
        agent: "meaningGuard",
        message: "Meaning Guard Agent is re-checking the revised rewrite.",
      });
      const meaningGuardPass2 = await runMeaningGuardAgent(
        inputText,
        rewritePass2.rewritten_text,
      );
      saveAgentOutput(jobId, "meaningGuardPass2", meaningGuardPass2);
      setAgentStatus(jobId, "meaningGuard", "done");
      activeAgent = null;
      addEvent(jobId, {
        type: "agent",
        agent: "meaningGuard",
        message: `Meaning Guard pass 2 returned ${
          meaningGuardPass2.approved ? "approved" : "still needs care"
        } with ${meaningGuardPass2.drift_risk} drift risk.`,
      });

      activeStep = "Naturalness Critic Pass 2";
      activeAgent = "naturalnessCritic";
      setCurrentStep(jobId, activeStep);
      setAgentStatus(jobId, "naturalnessCritic", "running");
      addEvent(jobId, {
        type: "agent",
        agent: "naturalnessCritic",
        message: "Naturalness Critic is scoring the revised rewrite.",
      });
      const criticPass2 = await runNaturalnessCriticAgent(
        inputText,
        rewritePass2.rewritten_text,
      );
      saveAgentOutput(jobId, "criticPass2", criticPass2);
      setAgentStatus(jobId, "naturalnessCritic", "done");
      activeAgent = null;
      addEvent(jobId, {
        type: "agent",
        agent: "naturalnessCritic",
        message: `Naturalness Critic scored pass 2 at ${criticPass2.naturalness_score}/10.`,
      });

      finalRewrite = rewritePass2;
      finalGuard = meaningGuardPass2;
      finalCritic = criticPass2;
    }

    const final = buildFinalOutput({
      rewrite: finalRewrite,
      guard: finalGuard,
      critic: finalCritic,
      passesUsed,
      revisionTriggered: shouldRevise,
    });

    saveAgentOutput(jobId, "final", final);
    setJobStatus(jobId, "completed", "Completed");
    addEvent(jobId, {
      type: "job",
      message: `Pipeline finished after ${passesUsed} pass${
        passesUsed === 1 ? "" : "es"
      }. Final score: ${final.naturalness_score}/10.`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown pipeline error";

    if (activeAgent) {
      setAgentStatus(jobId, activeAgent, "blocked");
    }

    setJobError(jobId, activeStep, message);
    setJobStatus(jobId, "failed", activeStep);
    blockIdleAgents(jobId);
    addEvent(jobId, {
      type: "error",
      message: `${activeStep} failed: ${message}`,
    });
  }
}
