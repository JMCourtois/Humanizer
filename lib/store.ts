import {
  AGENT_ORDER,
  AgentName,
  AgentRunStatus,
  JobEvent,
  JobOutputs,
  JobState,
  createInitialAgentStatuses,
} from "@/lib/types";

const globalForHumanizer = globalThis as typeof globalThis & {
  humanizerJobs?: Map<string, JobState>;
};

const jobs = globalForHumanizer.humanizerJobs ?? new Map<string, JobState>();

if (!globalForHumanizer.humanizerJobs) {
  globalForHumanizer.humanizerJobs = jobs;
}

function nowIso() {
  return new Date().toISOString();
}

export function createJob(inputText: string): JobState {
  const id = crypto.randomUUID();
  const job: JobState = {
    id,
    inputText,
    status: "queued",
    currentStep: "Queued",
    startedAt: nowIso(),
    events: [],
    outputs: {},
    agentStatuses: createInitialAgentStatuses(),
  };

  jobs.set(id, job);
  addEvent(id, {
    type: "job",
    message: "Job created and waiting for the orchestrator to start.",
  });

  return getJobSnapshot(id)!;
}

export function getJob(jobId: string): JobState | undefined {
  return jobs.get(jobId);
}

export function getJobSnapshot(jobId: string): JobState | undefined {
  const job = jobs.get(jobId);
  return job ? structuredClone(job) : undefined;
}

export function updateJob(
  jobId: string,
  updater: (job: JobState) => void,
): JobState {
  const job = jobs.get(jobId);

  if (!job) {
    throw new Error(`Unknown job "${jobId}".`);
  }

  updater(job);
  jobs.set(jobId, job);

  return job;
}

export function addEvent(
  jobId: string,
  event: Omit<JobEvent, "id" | "timestamp">,
): void {
  updateJob(jobId, (job) => {
    job.events.push({
      id: crypto.randomUUID(),
      timestamp: nowIso(),
      ...event,
    });
  });
}

export function setJobStatus(
  jobId: string,
  status: JobState["status"],
  currentStep: string,
): void {
  updateJob(jobId, (job) => {
    job.status = status;
    job.currentStep = currentStep;

    if (status === "completed" || status === "failed") {
      job.finishedAt = nowIso();
    }
  });
}

export function setCurrentStep(jobId: string, currentStep: string): void {
  updateJob(jobId, (job) => {
    job.currentStep = currentStep;
  });
}

export function setAgentStatus(
  jobId: string,
  agentName: AgentName,
  status: AgentRunStatus,
): void {
  updateJob(jobId, (job) => {
    const agent = job.agentStatuses[agentName];
    const timestamp = nowIso();

    agent.status = status;

    if (status === "running") {
      agent.startedAt = timestamp;
      agent.finishedAt = undefined;
    }

    if (status === "done" || status === "blocked") {
      agent.finishedAt = timestamp;
    }
  });
}

export function blockIdleAgents(jobId: string): void {
  updateJob(jobId, (job) => {
    for (const agentName of AGENT_ORDER) {
      const agent = job.agentStatuses[agentName];

      if (agent.status === "idle") {
        agent.status = "blocked";
        agent.finishedAt = nowIso();
      }
    }
  });
}

export function saveAgentOutput<K extends keyof JobOutputs>(
  jobId: string,
  key: K,
  value: NonNullable<JobOutputs[K]>,
): void {
  updateJob(jobId, (job) => {
    job.outputs[key] = value;
  });
}

export function setJobError(jobId: string, step: string, message: string): void {
  updateJob(jobId, (job) => {
    job.error = { step, message };
  });
}
