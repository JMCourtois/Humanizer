import { JobOverviewView } from "@/lib/view-models";

interface JobOverviewProps {
  jobId: string;
  overview: JobOverviewView;
}

export function JobOverview({ jobId, overview }: JobOverviewProps) {
  return (
    <section className="panel overview-panel">
      <div className="panel-header">
        <div>
          <h2>Job Overview</h2>
          <p>A compact readout of the current run state and the most recent checkpoint.</p>
        </div>
        <span className="technical-chip">Job {jobId.slice(0, 8)}</span>
      </div>

      <div className="overview-grid">
        <div className="overview-card">
          <span className="overview-label">Status</span>
          <strong className="overview-value">{overview.statusLabel}</strong>
        </div>
        <div className="overview-card">
          <span className="overview-label">Active agent</span>
          <strong className="overview-value">{overview.activeAgentLabel}</strong>
        </div>
        <div className="overview-card">
          <span className="overview-label">Current pass</span>
          <strong className="overview-value">{overview.currentPassLabel}</strong>
        </div>
        <div className="overview-card">
          <span className="overview-label">Elapsed</span>
          <strong className="overview-value">{overview.elapsedLabel}</strong>
        </div>
        <div className="overview-card">
          <span className="overview-label">Revision state</span>
          <strong className="overview-value">{overview.revisionLabel}</strong>
        </div>
        <div className="overview-card">
          <span className="overview-label">Current step</span>
          <strong className="overview-value">{overview.currentStepLabel}</strong>
        </div>
        <div className="overview-card overview-card-wide">
          <span className="overview-label">Latest checkpoint</span>
          <strong className="overview-value">{overview.latestCheckpointLabel}</strong>
        </div>
      </div>
    </section>
  );
}
