interface AgentCardProps {
  title: string;
  output: unknown;
  defaultOpen?: boolean;
}

export function AgentCard({
  title,
  output,
  defaultOpen = false,
}: AgentCardProps) {
  return (
    <details className="agent-card" open={defaultOpen}>
      <summary>
        <span>{title}</span>
        <span className="technical-chip">JSON</span>
      </summary>
      <pre>{JSON.stringify(output, null, 2)}</pre>
    </details>
  );
}
