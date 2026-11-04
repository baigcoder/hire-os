import { Link } from "react-router-dom";
import IndustrialPageLayout from "../layout/IndustrialPageLayout";

// Facts a journalist can use, each true of the product as it ships
const FACTS = [
  ["What it is", "Hiring software built around structured interviews: each skill is rated from 1 to 4 against what the candidate said, and the company's owner makes the final call."],
  ["Who it's for", "Companies hiring through a team of recruiters, and job seekers, who apply free."],
  ["Plans", "Basic at Rs 5,000, Professional at Rs 15,000 and Enterprise at Rs 40,000 a month."],
  ["Privacy", "Interviews are transcribed only with consent; audio is never stored, and transcripts are deleted after 90 days."],
];

/** Press: the facts, and how to reach us. */
const Press = () => (
  <IndustrialPageLayout title="Press" subtitle="Facts about HIRE.OS, and how to reach the team for a story.">
    <div className="app-grid">
      <section className="app-panel span-8" aria-labelledby="facts-h">
        <h2 className="app-h2" id="facts-h">
          Fact sheet
        </h2>
        <dl className="app-dl">
          {FACTS.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="app-panel span-4" aria-labelledby="ask-h">
        <h2 className="app-h2" id="ask-h" style={{ marginBottom: 8 }}>
          Press enquiries
        </h2>
        <p className="app-meta" style={{ margin: "0 0 16px" }}>
          Send us a message with Press as the topic and we&apos;ll reply by email.
        </p>
        <Link className="app-btn app-btn-primary" to="/contact?topic=Press">
          Contact us
        </Link>
      </section>
    </div>
  </IndustrialPageLayout>
);

export default Press;
