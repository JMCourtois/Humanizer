import {
  AGENT_DESCRIPTIONS,
  AGENT_LABELS,
  AgentName,
  AgentStatus,
} from "@/lib/types";

interface AgentGraphProps {
  agentStatuses: Record<AgentName, AgentStatus>;
  currentStep: string;
  revisionTriggered: boolean;
}

export function AgentGraph({
  agentStatuses,
  currentStep,
  revisionTriggered,
}: AgentGraphProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Agent Graph</h2>
          <p>Each node is a prompt role. The orchestrator handles sequencing and handoffs.</p>
        </div>
      </div>

      <div className="graph-stage">
        <div className="connector vertical connector-brief" />
        <div className="connector diagonal connector-left" />
        <div className="connector diagonal connector-right" />
        <div className={`feedback-rail ${revisionTriggered ? "active" : ""}`} />

        <div className={`agent-node node-brief status-${agentStatuses.brief.status}`}>
          <div className="node-header">
            <span>{AGENT_LABELS.brief}</span>
            <span className="status-chip">{agentStatuses.brief.status}</span>
          </div>
          <p>{AGENT_DESCRIPTIONS.brief}</p>
        </div>

        <div
          className={`agent-node node-humanizer status-${agentStatuses.humanizer.status}`}
        >
          <div className="node-header">
            <span>{AGENT_LABELS.humanizer}</span>
            <span className="status-chip">{agentStatuses.humanizer.status}</span>
          </div>
          <p>{AGENT_DESCRIPTIONS.humanizer}</p>
        </div>

        <div
          className={`agent-node node-guard status-${agentStatuses.meaningGuard.status}`}
        >
          <div className="node-header">
            <span>{AGENT_LABELS.meaningGuard}</span>
            <span className="status-chip">{agentStatuses.meaningGuard.status}</span>
          </div>
          <p>{AGENT_DESCRIPTIONS.meaningGuard}</p>
        </div>

        <div
          className={`agent-node node-critic status-${agentStatuses.naturalnessCritic.status}`}
        >
          <div className="node-header">
            <span>{AGENT_LABELS.naturalnessCritic}</span>
            <span className="status-chip">
              {agentStatuses.naturalnessCritic.status}
            </span>
          </div>
          <p>{AGENT_DESCRIPTIONS.naturalnessCritic}</p>
        </div>
      </div>

      <div className="relationship-list">
        <div className="relationship-item">
          Brief Agent{" -> "}Humanizer Agent
        </div>
        <div className="relationship-item">
          Humanizer Agent{" -> "}Meaning Guard Agent
        </div>
        <div className="relationship-item">
          Humanizer Agent{" -> "}Naturalness Critic Agent
        </div>
        <div className={`relationship-item ${revisionTriggered ? "active" : ""}`}>
          Guard/Critic feedback{" -> "}Humanizer Agent
        </div>
      </div>

      <div className="current-step">
        <span className="technical-chip">Current step</span>
        <strong>{currentStep}</strong>
      </div>
    </section>
  );
}
