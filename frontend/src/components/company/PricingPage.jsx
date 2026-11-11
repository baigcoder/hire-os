import { Link } from "react-router-dom";
import IndustrialPageLayout from "../layout/IndustrialPageLayout";

const FOR_COMPANIES = [
  "Unlimited job posts and recruiters",
  "Structured interviews with live transcription and a scorecard per skill",
  "Blind resume screening, grounded in what the resume says",
  "MCQ tests, assessments and interview integrity checks",
  "Decision queue for the company's owner",
];

const FOR_CANDIDATES = [
  "Apply to any job",
  "Resume analysis and a career coach",
  "Interview practice with AI feedback",
  "Messaging and calls with the companies you interview with",
];

/** Pricing: there isn't any. HIRE.OS is free for companies and candidates. */
const PricingPage = () => (
  <IndustrialPageLayout
    title="Free for everyone"
    subtitle="HIRE.OS costs nothing to use. No plans, no trial that ends, no card. Companies and candidates get the whole product."
  >
    <div className="app-grid">
      <section className="app-panel span-6" aria-labelledby="co-h">
        <h2 className="app-h2" id="co-h" style={{ marginBottom: 4 }}>
          Companies
        </h2>
        <p className="num" style={{ margin: "0 0 12px", fontSize: 28 }}>
          Free
        </p>
        <ul className="app-list">
          {FOR_COMPANIES.map((item) => (
            <li className="app-row" key={item}>
              <span className="app-row-main">
                <span className="app-row-title">{item}</span>
              </span>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 16 }}>
          <Link className="app-btn app-btn-primary" to="/company/signup">
            Create your company
          </Link>
        </div>
      </section>

      <section className="app-panel span-6" aria-labelledby="cand-h">
        <h2 className="app-h2" id="cand-h" style={{ marginBottom: 4 }}>
          Job seekers
        </h2>
        <p className="num" style={{ margin: "0 0 12px", fontSize: 28 }}>
          Free
        </p>
        <ul className="app-list">
          {FOR_CANDIDATES.map((item) => (
            <li className="app-row" key={item}>
              <span className="app-row-main">
                <span className="app-row-title">{item}</span>
              </span>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 16 }}>
          <Link className="app-btn app-btn-primary" to="/signup">
            Create your account
          </Link>
        </div>
      </section>
    </div>
  </IndustrialPageLayout>
);

export default PricingPage;
