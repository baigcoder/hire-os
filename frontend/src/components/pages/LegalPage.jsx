import { Link } from "react-router-dom";
import IndustrialPageLayout from "../layout/IndustrialPageLayout";

// Each statement describes how the product works today; change it when the code changes.
const PAGES = {
  privacy: {
    title: "Privacy",
    subtitle: "What HIRE.OS keeps about you, why, and for how long.",
    sections: [
      ["What we collect", "What you give us: your name, email, phone, profile, resume and applications. For companies, the company details and the people invited to it."],
      ["Interviews", "Interviews are transcribed only with the candidate's consent. Audio is never stored. Transcripts, and the integrity checks made during an interview, are deleted after 90 days."],
      ["AI processing", "Resume analysis, interview reports and matching send the relevant text to the AI providers we use (such as Groq and Google Gemini) to produce the result. We don't sell your data or use it for advertising."],
      ["Who sees what", "Your applications are seen by the company you applied to: its recruiters and its owner. Other companies don't see them."],
      ["Your choices", "You can edit your profile and resume at any time. To get a copy of your data or have your account deleted, write to us and we'll handle it by email."],
    ],
  },
  terms: {
    title: "Terms",
    subtitle: "The rules for using HIRE.OS.",
    sections: [
      ["Your account", "Keep your sign-in details to yourself. Recruiters get access only through their company's owner, and lose it when the owner removes them or the subscription ends."],
      ["What you post", "Jobs, profiles and messages must be accurate and lawful. We may remove content or close accounts that mislead candidates or companies."],
      ["Decisions", "The AI drafts transcripts, reports and match scores. Hiring decisions are made by people at the company, who are responsible for them."],
      ["Plans", "Companies pay for a plan monthly or yearly. Job seekers never pay to apply."],
      ["The service", "We work to keep HIRE.OS available and correct, but it is provided as is, and features may change."],
    ],
  },
  cookies: {
    title: "Cookies",
    subtitle: "HIRE.OS uses cookies only to keep you signed in.",
    sections: [
      ["Sign-in cookies", "Two cookies that the page's scripts can't read: a 15-minute access cookie, and a 7-day refresh cookie sent only when your session is renewed. Signing out removes both."],
      ["What we don't use", "No advertising or cross-site tracking cookies."],
    ],
  },
};

/** Privacy, terms and cookies: short, plain, and true of the product as it ships. */
const LegalPage = ({ type }) => {
  const page = PAGES[type] || PAGES.privacy;
  return (
    <IndustrialPageLayout title={page.title} subtitle={page.subtitle}>
      <section className="app-panel" style={{ maxWidth: 860 }} aria-label={page.title}>
        <dl className="app-dl">
          {page.sections.map(([k, v]) => (
            <div key={k}>
              <dt style={{ color: "var(--text)", fontWeight: 500 }}>{k}</dt>
              <dd className="app-meta" style={{ fontSize: 15 }}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
        <p className="app-meta" style={{ margin: "16px 0 0" }}>
          Questions? <Link to="/contact?topic=General">Write to us</Link>.
        </p>
      </section>
    </IndustrialPageLayout>
  );
};

export default LegalPage;
