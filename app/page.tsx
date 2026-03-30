import { HumanizerLab } from "@/components/HumanizerLab";

const SAMPLE_TEXT = `Our organization is committed to delivering innovative solutions that empower teams to achieve higher levels of efficiency and collaboration. By leveraging a structured framework and best-in-class processes, we can ensure that stakeholders remain aligned throughout the implementation journey. In addition, this approach enables us to unlock meaningful value while maintaining a user-centric focus across all phases of execution.`;

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="eyebrow">Humanizer Lab</div>
        <h1>See a MiniMax multi-agent rewrite pipeline step through its work.</h1>
        <p className="hero-copy">
          This project is intentionally small and readable. The model acts in
          four visible roles, a plain TypeScript orchestrator manages handoffs,
          and the browser polls simple Next.js route handlers for updates.
        </p>
      </section>

      <HumanizerLab sampleText={SAMPLE_TEXT} />
    </main>
  );
}
