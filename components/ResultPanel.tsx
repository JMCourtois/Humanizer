import { JobState, latestRewrite } from "@/lib/types";

interface ResultPanelProps {
  draftInputText: string;
  job: JobState | null;
}

export function ResultPanel({ draftInputText, job }: ResultPanelProps) {
  const sourceText = job?.inputText ?? draftInputText;
  const latest = job ? latestRewrite(job.outputs) : undefined;
  const finalText = job?.outputs.final?.final_text ?? latest?.rewritten_text ?? "";
  const naturalnessScore =
    job?.outputs.final?.naturalness_score ??
    job?.outputs.criticPass2?.naturalness_score ??
    job?.outputs.criticPass1?.naturalness_score;
  const meaningVerdict =
    job?.outputs.final?.meaning_safe ?? job?.outputs.meaningGuardPass2?.approved ??
    job?.outputs.meaningGuardPass1?.approved;
  const whatChanged =
    job?.outputs.final?.what_changed ??
    latest?.major_changes ??
    [];
  const revisionLabel = job?.outputs.final
    ? job.outputs.final.revision_triggered
      ? "Triggered"
      : "Not needed"
    : job?.outputs.rewritePass2
      ? "Triggered"
      : job
        ? job.status === "completed" || job.status === "failed"
          ? "Not needed"
          : "Pending"
        : "Pending";

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Result</h2>
          <p>Original and final text stay side by side so the workflow remains inspectable.</p>
        </div>
        {job ? <span className="technical-chip">Job {job.id.slice(0, 8)}</span> : null}
      </div>

      {!job ? (
        <div className="empty-state">
          <h3>No job yet</h3>
          <p>
            Paste text into the center panel, start the pipeline, and this area
            will fill in with the evolving rewrite plus the final report.
          </p>
        </div>
      ) : (
        <>
          <div className="summary-grid">
            <div className="summary-card">
              <span className="summary-label">Job status</span>
              <strong>{job.status}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Naturalness</span>
              <strong>
                {typeof naturalnessScore === "number"
                  ? `${naturalnessScore}/10`
                  : "Pending"}
              </strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Meaning safety</span>
              <strong>
                {typeof meaningVerdict === "boolean"
                  ? meaningVerdict
                    ? "Approved"
                    : "Needs review"
                  : "Pending"}
              </strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Revision loop</span>
              <strong>{revisionLabel}</strong>
            </div>
          </div>

          {job.status === "failed" && job.error ? (
            <div className="error-banner">
              <strong>{job.error.step}</strong>: {job.error.message}
            </div>
          ) : null}

          <div className="text-compare-grid">
            <div className="text-block">
              <div className="text-block-header">Original</div>
              <p>{sourceText || "No source text yet."}</p>
            </div>

            <div className="text-block">
              <div className="text-block-header">
                {job.outputs.final ? "Final humanized text" : "Latest rewrite"}
              </div>
              <p>{finalText || "The humanized text will appear here as the job runs."}</p>
            </div>
          </div>

          <div className="report-card">
            <div className="subsection-header">
              <h3>What changed</h3>
              {job.outputs.final?.verdict ? (
                <span className="technical-chip">{job.outputs.final.verdict}</span>
              ) : null}
            </div>

            {whatChanged.length === 0 ? (
              <p className="muted-copy">
                Structured change notes will appear after the rewrite step completes.
              </p>
            ) : (
              <ul className="report-list">
                {whatChanged.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
