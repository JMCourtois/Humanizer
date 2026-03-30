import { JobEvent } from "@/lib/types";

interface TimelineProps {
  events: JobEvent[];
}

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

export function Timeline({ events }: TimelineProps) {
  if (events.length === 0) {
    return (
      <div className="empty-state small-empty">
        Run the pipeline to populate the timeline.
      </div>
    );
  }

  return (
    <ol className="timeline-list">
      {events.map((event) => (
        <li className="timeline-item" key={event.id}>
          <div className="timeline-meta">
            <span className={`event-type type-${event.type}`}>{event.type}</span>
            <span>{formatTime(event.timestamp)}</span>
          </div>
          <p>{event.message}</p>
        </li>
      ))}
    </ol>
  );
}
