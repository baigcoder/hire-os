import { Link } from "react-router-dom";
import IndustrialPageLayout from "../layout/IndustrialPageLayout";

// Each row is a real answer or a link to the screen that does the thing.
const PAGES = {
  help: {
    title: "Help",
    subtitle: "Answers to the common questions, and how to reach us for the rest.",
    rows: [
      ["How do I join as a recruiter?", "Your company's owner invites you by email. Recruiters can't sign up on their own.", "/company/pricing", "See plans"],
      ["How do I start hiring?", "Choose a plan, create your company, then invite your recruiters.", "/company/pricing", "Choose a plan"],
      ["How do I apply for a job?", "Create a free account, then apply from any job's page.", "/jobs", "Browse jobs"],
      ["Where can I see my applications?", "Applications lists each one with its stage and any interview.", "/applied-jobs", "Applications"],
      ["I forgot my password.", "Choose Forgot password on the sign-in page and we'll email you a link that works for an hour.", "/forgot-password", "Reset password"],
      ["Something else?", "Write to us and we'll reply by email.", "/contact?topic=Support", "Contact us"],
    ],
  },
  resume: {
    title: "Resume analysis",
    subtitle: "Upload your resume and get feedback on how it reads to a recruiter.",
    rows: [["Check your resume", "Free with a job seeker account for the first 30 days.", "/student/career", "Open career tools"]],
  },
  salary: {
    title: "Salaries",
    subtitle: "Every job on HIRE.OS shows its pay, so you can compare before you apply.",
    rows: [
      ["Compare jobs", "Sort and filter open jobs; pay is shown on each.", "/jobs", "Browse jobs"],
      ["Your market", "Salary insights for your skills are in the career tools.", "/student/career", "Open career tools"],
    ],
  },
  tips: {
    title: "Interview practice",
    subtitle: "Practise with a mock interview and see how you'd be scored.",
    rows: [["Mock interview", "Answer real questions and get a scorecard tied to what you said.", "/student/career?tab=practice", "Start practising"]],
  },
};

/** Help and the job-seeker resource pages: answers and real links, no dead cards. */
const ResourcePage = ({ type }) => {
  const page = PAGES[type] || PAGES.help;
  return (
    <IndustrialPageLayout title={page.title} subtitle={page.subtitle}>
      <section className="app-panel" style={{ maxWidth: 860 }} aria-label={page.title}>
        <ul className="app-list">
          {page.rows.map(([q, a, to, label]) => (
            <li key={q} className="app-row">
              <span className="app-row-main">
                <span className="app-row-title" style={{ display: "block" }}>
                  {q}
                </span>
                <span className="app-row-sub">{a}</span>
              </span>
              <Link className="app-btn app-btn-sm" to={to}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </IndustrialPageLayout>
  );
};

export default ResourcePage;
