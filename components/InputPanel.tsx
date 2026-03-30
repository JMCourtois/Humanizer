interface InputPanelProps {
  inputText: string;
  sampleText: string;
  canRun: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onInputChange: (value: string) => void;
  onLoadSample: () => void;
  onRun: () => void;
}

export function InputPanel({
  inputText,
  sampleText,
  canRun,
  isSubmitting,
  errorMessage,
  onInputChange,
  onLoadSample,
  onRun,
}: InputPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Input</h2>
          <p>Paste AI-written text or load the sample to watch the pipeline work.</p>
        </div>
        <span className="technical-chip">Server-side MiniMax</span>
      </div>

      <label className="input-label" htmlFor="humanizer-input">
        Source text
      </label>
      <textarea
        id="humanizer-input"
        className="text-area"
        value={inputText}
        onChange={(event) => onInputChange(event.target.value)}
        placeholder={sampleText}
      />

      <div className="action-row">
        <button className="secondary-button" type="button" onClick={onLoadSample}>
          Load sample text
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={onRun}
          disabled={!canRun}
        >
          {isSubmitting ? "Starting..." : "Run Humanizer Pipeline"}
        </button>
      </div>

      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      <p className="panel-note">
        The browser only talks to Next.js route handlers. The MiniMax key stays on
        the server and never reaches client-side code.
      </p>
    </section>
  );
}
