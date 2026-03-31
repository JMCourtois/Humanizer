"use client";

import { useEffect, useMemo, useState } from "react";

import { AgentCard } from "@/components/AgentCard";
import { AgentGraph } from "@/components/AgentGraph";
import { InputPanel } from "@/components/InputPanel";
import { JobOverview } from "@/components/JobOverview";
import { NowHappening } from "@/components/NowHappening";
import { ResultPanel } from "@/components/ResultPanel";
import { Timeline } from "@/components/Timeline";
import {
  JobState,
  createInitialAgentStatuses,
} from "@/lib/types";
import {
  deriveActivityFeed,
  deriveAgentCards,
  deriveFlowView,
  deriveJobOverview,
  deriveNowHappening,
} from "@/lib/view-models";

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
  const [clock, setClock] = useState(() => Date.now());

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

  useEffect(() => {
    if (!job || (job.status !== "queued" && job.status !== "running")) {
      return;
    }

    setClock(Date.now());

    const intervalId = window.setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [job?.id, job?.status]);

  const canRun =
    inputText.trim().length > 0 &&
    !isSubmitting &&
    (!job || (job.status !== "queued" && job.status !== "running"));

  const overview = useMemo(() => deriveJobOverview(job, clock), [job, clock]);
  const flow = useMemo(() => deriveFlowView(job, inputText), [job, inputText]);
  const nowHappening = useMemo(() => deriveNowHappening(job), [job]);
  const activityFeed = useMemo(() => deriveActivityFeed(job), [job]);
  const agentCards = useMemo(() => deriveAgentCards(job), [job]);

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
    <section className="lab-workbench">
      <section className="lab-panels-grid">
        {job ? (
          <div className="panel-slot panel-slot-compact">
            <JobOverview jobId={job.id} overview={overview} />
          </div>
        ) : null}

        <div className="panel-slot">
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
        </div>

        <div className="panel-slot">
          <section className="panel stack-panel">
            <div className="panel-header">
              <div>
                <h2>Activity Feed</h2>
                <p>Polling keeps the feed in sync so you can follow each handoff and decision.</p>
              </div>
            </div>

            <Timeline items={activityFeed} />
          </section>
        </div>

        <div className="panel-slot">
          <NowHappening view={nowHappening} />
        </div>

        <div className="panel-slot panel-slot-wide">
          <ResultPanel
            draftInputText={inputText}
            job={job}
          />
        </div>

        <div className="panel-slot">
          <section className="panel stack-panel">
            <div className="panel-header">
              <div>
                <h2>Agent Inspector</h2>
                <p>Summary-first cards surface each pass, while raw JSON stays available for debugging.</p>
              </div>
              <span className="technical-chip">
                {agentCards.length} card{agentCards.length === 1 ? "" : "s"}
              </span>
            </div>

            {agentCards.length === 0 ? (
              <div className="empty-state small-empty">
                Agent summaries will appear here as each pass finishes.
              </div>
            ) : (
              <div className="agent-card-list">
                {agentCards.map((card) => (
                  <AgentCard
                    key={card.key}
                    card={card}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="lab-flow-row">
        <AgentGraph flow={flow} />
      </section>
    </section>
  );
}
