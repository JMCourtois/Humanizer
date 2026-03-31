import { AgentCardView } from "@/lib/view-models";

interface AgentCardProps {
  card: AgentCardView;
}

export function AgentCard({ card }: AgentCardProps) {
  return (
    <article className="agent-summary-card">
      <div className="agent-summary-header">
        <div>
          <h3>{card.title}</h3>
          <p>{card.summary}</p>
        </div>
        {card.badge ? <span className="technical-chip">{card.badge}</span> : null}
      </div>

      {card.excerpt ? <div className="card-excerpt">{card.excerpt}</div> : null}

      {card.metrics.length > 0 ? (
        <div className="card-metrics">
          {card.metrics.map((metric) => (
            <span className="metric-pill" key={metric}>
              {metric}
            </span>
          ))}
        </div>
      ) : null}

      {card.bullets.length > 0 ? (
        <ul className="card-bullets">
          {card.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}

      <details className="raw-json">
        <summary>
          <span>Raw JSON</span>
          <span className="technical-chip">Debug</span>
        </summary>
        <div className="raw-json-scroll">
          <pre>{JSON.stringify(card.rawOutput, null, 2)}</pre>
        </div>
      </details>
    </article>
  );
}
