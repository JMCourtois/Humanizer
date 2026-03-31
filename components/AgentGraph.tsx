import { FlowNodeView, FlowView } from "@/lib/view-models";

interface AgentGraphProps {
  flow: FlowView;
}

function FlowNodeCard({ node }: { node: FlowNodeView }) {
  return (
    <article
      className={`flow-node status-${node.status} ${node.isActive ? "is-active" : ""} ${
        node.isRecent ? "is-recent" : ""
      }`}
    >
      <div className="flow-node-header">
        <div>
          <div className="flow-node-title">{node.label}</div>
          <p className="flow-node-summary">{node.summary}</p>
        </div>
        {node.badge ? <span className="status-chip">{node.badge}</span> : null}
      </div>
      <p className="flow-node-detail">{node.detail}</p>
    </article>
  );
}

export function AgentGraph({ flow }: AgentGraphProps) {
  return (
    <section className="panel flow-panel">
      <div className="panel-header">
        <div>
          <h2>Pipeline Flow</h2>
          <p>The swimlane shows sequence, evaluation split, and the single revision return path.</p>
        </div>
      </div>

      <div className="flow-header-row">
        <div className="handoff-card">
          <span className="overview-label">Current handoff</span>
          <strong>{flow.activeHandoffLabel}</strong>
        </div>
        <div className={`revision-pill state-${flow.revisionState}`}>
          <span className="overview-label">Revision loop</span>
          <strong>{flow.revisionLabel}</strong>
        </div>
      </div>

      <div className="flow-scroll">
        <div className="flow-canvas">
          <div className="swimlane">
            <FlowNodeCard node={flow.nodes.input} />
            <div className="flow-arrow">handoff</div>
            <FlowNodeCard node={flow.nodes.brief} />
            <div className="flow-arrow">brief</div>
            <FlowNodeCard node={flow.nodes.humanizer} />
            <div className="flow-arrow">review</div>

            <div className="evaluation-column">
              <div className="evaluation-header">
                <span className="overview-label">Evaluation split</span>
                <span className="technical-chip">Guard + Critic</span>
              </div>
              <FlowNodeCard node={flow.nodes.meaningGuard} />
              <FlowNodeCard node={flow.nodes.naturalnessCritic} />
            </div>

            <div className="flow-arrow">decide</div>
            <FlowNodeCard node={flow.nodes.decision} />
            <div className="flow-arrow">finalize</div>
            <FlowNodeCard node={flow.nodes.final} />
          </div>

          <div className={`revision-loop state-${flow.revisionState}`}>
            <span className="revision-loop-label">Single retry path</span>
            <div className="revision-loop-track">
              <span>Decision Gate</span>
              <span className="revision-loop-dash" />
              <span>Humanizer Agent</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
