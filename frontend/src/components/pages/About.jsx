import { Link } from "react-router-dom";
import IndustrialPageLayout from "../layout/IndustrialPageLayout";

// What the product promises, stated as it works today (see the FAQ on the landing page)
const PRINCIPLES = [
  ["People decide", "The AI transcribes the interview and drafts the report. The interviewer rates each skill, and the company's owner makes the decision."],
  ["Every score has a source", "Each rating on a scorecard points to what the candidate said, with the time it was said."],
  ["Candidates stay in control", "Interviews are transcribed only with the candidate's consent. Audio is never stored, and transcripts are deleted after 90 days."],
  ["Free to apply", "Job seekers never pay to apply. Resume analysis and interview practice are free for the first 30 days."],
];

/** About: what HIRE.OS is for and what it promises. No figures it can't back up. */
const About = () => (
  <IndustrialPageLayout
    title="About HIRE.OS"
    subtitle="Hiring software that keeps the evidence: structured interviews, scored with the candidate's own words, and a final call made by people."
  >
    <div className="app-grid">
      <section className="app-panel span-7" aria-labelledby="why-h">
        <h2 className="app-h2" id="why-h" style={{ marginBottom: 12 }}>
          Why we built it
        </h2>
        <p style={{ margin: 0, lineHeight: "26px", fontSize: 16 }}>
          Most hiring decisions rest on an impression formed in an hour: who seemed confident, who the interviewer liked. The reasons behind a yes or a
          no are rarely written down, so they can&apos;t be checked or compared. HIRE.OS keeps the conversation, ties every score to what was actually said,
          and puts the decision in front of the person accountable for it, with the evidence underneath.
        </p>
      </section>

      <section className="app-panel span-5" aria-labelledby="start-h">
        <h2 className="app-h2" id="start-h" style={{ marginBottom: 12 }}>
          Start here
        </h2>
        <ul className="app-list">
          <li className="app-row">
            <span className="app-row-main">
              <span className="app-row-title" style={{ display: "block" }}>
                Hiring for a company
              </span>
              <span className="app-row-sub">Choose a plan and invite your recruiters.</span>
            </span>
            <Link className="app-btn app-btn-sm app-btn-primary" to="/company/pricing">
              Start hiring
            </Link>
          </li>
          <li className="app-row">
            <span className="app-row-main">
              <span className="app-row-title" style={{ display: "block" }}>
                Looking for work
              </span>
              <span className="app-row-sub">Browse open jobs and apply free.</span>
            </span>
            <Link className="app-btn app-btn-sm" to="/jobs">
              Find a job
            </Link>
          </li>
        </ul>
      </section>

      <section className="app-panel span-12" aria-labelledby="promise-h">
        <h2 className="app-h2" id="promise-h">
          What we promise
        </h2>
        <dl className="app-dl">
          {PRINCIPLES.map(([title, text]) => (
            <div key={title}>
              <dt style={{ color: "var(--text)", fontWeight: 500 }}>{title}</dt>
              <dd className="app-meta" style={{ fontSize: 15 }}>
                {text}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  </IndustrialPageLayout>
);

export default About;
