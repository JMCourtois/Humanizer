"use client";

import { useEffect, useMemo, useState } from "react";

import { AgentCard } from "@/components/AgentCard";
import { AgentGraph } from "@/components/AgentGraph";
import { InputPanel } from "@/components/InputPanel";
import { ResultPanel } from "@/components/ResultPanel";
import { Timeline } from "@/components/Timeline";
import {
  JobState,
  OUTPUT_CARD_ORDER,
  createInitialAgentStatuses,
} from "@/lib/types";

const POLL_INTERVAL_MS = 900;

interface HumanizerLabProps {
  sampleText: string;
}

async function createJobRequest(inputText: string): Promise<{ jobId: string }> {
  const response = await fetch("/api/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputText }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Failed to create job.");
  }

  return payload as { jobId: string };
}

async function fetchJobState(jobId: string): Promise<JobState> {
  const response = await fetch(`/api/jobs/${jobId}`, {
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Failed to fetch job state.");
  }

  return payload as JobState;
}

function createPendingClientJob(id: string, inputText: string): JobState {
  return {
    id,
    inputText,
    status: "queued",
    currentStep: "Queued",
    startedAt: new Date().toISOString(),
    events: [
      {
        id: `client-${id}`,
        timestamp: new Date().toISOString(),
        type: "job",
        message: "Job submitted from the browser. Waiting for the first server update.",
      },
    ],
    outputs: {},
    agentStatuses: createInitialAgentStatuses(),
  };
}

export function HumanizerLab({ sampleText }: HumanizerLabProps) {
  const [inputText, setInputText] = useState("");
  const [job, setJob] = useState<JobState | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId || !job || (job.status !== "queued" && job.status !== "running")) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchJobState(jobId)
        .then((nextJob) => {
          setJob(nextJob);
          setErrorMessage(null);
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : "Polling failed.";
          setErrorMessage(message);
        });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [jobId, job?.status]);

  const canRun =
    inputText.trim().length > 0 &&
    !isSubmitting &&
    (!job || (job.status !== "queued" && job.status !== "running"));

  const revisionTriggered = Boolean(
    job?.outputs.rewritePass2 ||
      job?.outputs.meaningGuardPass2 ||
      job?.outputs.criticPass2 ||
      job?.outputs.final?.revision_triggered,
  );

  const outputCards = useMemo(() => {
    if (!job) {
      return [];
    }

    return OUTPUT_CARD_ORDER.filter(({ key }) => job.outputs[key]);
  }, [job]);

  async function handleRun() {
    const trimmed = inputText.trim();

    if (!trimmed) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { jobId: nextJobId } = await createJobRequest(trimmed);
      setJobId(nextJobId);
      setJob(createPendingClientJob(nextJobId, trimmed));

      const serverJob = await fetchJobState(nextJobId);
      setJob(serverJob);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start the pipeline.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="lab-grid">
      <aside className="column">
        <AgentGraph
          agentStatuses={job?.agentStatuses ?? createInitialAgentStatuses()}
          currentStep={job?.currentStep ?? "Idle"}
          revisionTriggered={revisionTriggered}
        />
      </aside>

      <section className="column center-column">
        <InputPanel
          inputText={inputText}
          sampleText={sampleText}
          canRun={canRun}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onInputChange={setInputText}
          onLoadSample={() => setInputText(sampleText)}
          onRun={handleRun}
        />

        <ResultPanel
          draftInputText={inputText}
          job={job}
        />
      </section>

      <aside className="column">
        <section className="panel stack-panel">
          <div className="panel-header">
            <div>
              <h2>Event Timeline</h2>
              <p>Polling keeps this panel in sync as each server-side step finishes.</p>
            </div>
          </div>

          <Timeline events={job?.events ?? []} />

          <div className="panel-subsection">
            <div className="subsection-header">
              <h3>Structured Outputs</h3>
              <span className="technical-chip">
                {outputCards.length} card{outputCards.length === 1 ? "" : "s"}
              </span>
            </div>

            {outputCards.length === 0 ? (
              <div className="empty-state small-empty">
                Agent outputs will appear here as each step completes.
              </div>
            ) : (
              <div className="agent-card-list">
                {outputCards.map((card, index) => (
                  <AgentCard
                    key={card.key}
                    title={card.label}
                    output={job?.outputs[card.key]}
                    defaultOpen={index === outputCards.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </aside>
    </section>
  );
}
