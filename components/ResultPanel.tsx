import { JobState } from "@/lib/types";
import { getLatestRewrite } from "@/lib/view-models";

interface ResultPanelProps {
  draftInputText: string;
  job: JobState | null;
}

export function ResultPanel({ draftInputText, job }: ResultPanelProps) {
  const sourceText = job?.inputText ?? draftInputText;
  const latest = getLatestRewrite(job);
  const latestGuard =
    job?.outputs.meaningGuardPass2 ?? job?.outputs.meaningGuardPass1;
  const latestCritic = job?.outputs.criticPass2 ?? job?.outputs.criticPass1;
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
  const resultHeading = job?.outputs.final
    ? "Final humanized text"
    : latest
      ? "Current best rewrite"
      : "Latest rewrite";
  const resultIntro = job?.outputs.final
    ? "The final rewrite and report are locked in below."
    : latest
      ? "This is the best available rewrite so far. It may still change if the revision loop completes."
      : "The humanized text will appear here as the pipeline reaches the rewrite stage.";
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

          <div className="checkpoint-grid">
            <div className="checkpoint-card">
              <span className="checkpoint-label">Rewrite checkpoint</span>
              <strong>
                {latest ? `Confidence ${latest.confidence.toFixed(2)}` : "Pending"}
              </strong>
              <p>
                {latest?.major_changes[0] ??
                  "The first rewrite checkpoint appears as soon as Humanizer finishes a pass."}
              </p>
            </div>
            <div className="checkpoint-card">
              <span className="checkpoint-label">Meaning checkpoint</span>
              <strong>
                {latestGuard
                  ? latestGuard.approved
                    ? "Approved"
                    : "Needs care"
                  : "Pending"}
              </strong>
              <p>
                {latestGuard
                  ? `${latestGuard.drift_risk} drift risk with ${latestGuard.issues.length} flagged issue${
                      latestGuard.issues.length === 1 ? "" : "s"
                    }.`
                  : "Meaning Guard will compare the source and rewrite after a humanizer pass completes."}
              </p>
            </div>
            <div className="checkpoint-card">
              <span className="checkpoint-label">Naturalness checkpoint</span>
              <strong>
                {latestCritic
                  ? `${latestCritic.naturalness_score}/10`
                  : "Pending"}
              </strong>
              <p>
                {latestCritic
                  ? latestCritic.remaining_ai_markers[0] ??
                    `${latestCritic.recommended_tweaks.length} tweak note${
                      latestCritic.recommended_tweaks.length === 1 ? "" : "s"
                    } captured.`
                  : "Naturalness Critic will score the rewrite after the meaning review begins."}
              </p>
            </div>
          </div>

          <div className="text-compare-grid">
            <div className="text-block">
              <div className="text-block-header">Original</div>
              <p>{sourceText || "No source text yet."}</p>
            </div>

            <div className="text-block">
              <div className="text-block-header">{resultHeading}</div>
              <p>{finalText || resultIntro}</p>
            </div>
          </div>

          <p className="compare-status">{resultIntro}</p>

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
