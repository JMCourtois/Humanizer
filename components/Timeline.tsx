import { ActivityFeedItem } from "@/lib/view-models";

interface TimelineProps {
  items: ActivityFeedItem[];
}

export function Timeline({ items }: TimelineProps) {
  if (items.length === 0) {
    return (
      <div className="empty-state small-empty">
        Run the pipeline to populate the activity feed.
      </div>
    );
  }

  return (
    <ol className="activity-feed">
      {items.map((item) => (
        <li
          className={`activity-item type-${item.type} ${
            item.isLatest ? "is-latest" : ""
          }`}
          key={item.id}
        >
          <div className="activity-item-header">
            <div>
              <div className="activity-title-row">
                <span className={`event-type type-${item.type}`}>{item.type}</span>
                <strong>{item.title}</strong>
              </div>
              <p className="activity-detail">{item.detail}</p>
            </div>
            <span className="activity-time">{item.timestampLabel}</span>
          </div>

          {item.badges.length > 0 ? (
            <div className="activity-badges">
              {item.badges.map((badge) => (
                <span className="feed-badge" key={`${item.id}-${badge}`}>
                  {badge}
                </span>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
