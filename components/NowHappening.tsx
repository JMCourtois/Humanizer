import { NowHappeningView } from "@/lib/view-models";

interface NowHappeningProps {
  view: NowHappeningView;
}

export function NowHappening({ view }: NowHappeningProps) {
  return (
    <section className={`panel live-panel tone-${view.statusTone}`}>
      <div className="panel-header">
        <div>
          <h2>Now Happening</h2>
          <p>Plain-language context about the active stage, its inputs, and the next handoff.</p>
        </div>
        <span className={`status-pill tone-${view.statusTone}`}>{view.statusTone}</span>
      </div>

      <div className="live-summary">
        <h3>{view.title}</h3>
        <p>{view.detail}</p>
      </div>

      <div className="live-grid">
        <div className="live-detail-card">
          <span className="live-detail-label">Input in play</span>
          <p>{view.inputLabel}</p>
        </div>
        <div className="live-detail-card">
          <span className="live-detail-label">Next expected step</span>
          <p>{view.nextStepLabel}</p>
        </div>
        <div className="live-detail-card live-detail-card-wide">
          <span className="live-detail-label">Latest checkpoint</span>
          <p>{view.latestCheckpointLabel}</p>
        </div>
      </div>
    </section>
  );
}
