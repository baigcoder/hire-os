import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ROLES, PLANS, FAQ, draftScorecard } from "./data";
import "./landing.css";

/*
 * The dark room: one black field, and in it, lit things. The lit things are
 * the candidate's own words, the evidence each score rests on, and the
 * product pieces built around them. The one live thing is the scorecard
 * HIRE.OS drafts for whatever role the visitor types.
 */

const pkr = (n) => `Rs ${n.toLocaleString("en-PK")}`;

const dashboardPath = (user) =>
  !user ? null : user.role === "company_admin" ? "/company/admin/dashboard" : user.role === "recruiter" ? "/recruiter/dashboard" : "/student/dashboard";

/** Section parts rise in once as they enter; content stays visible without script. */
const useReveal = (root) => {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.classList.add("js");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    el.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [root]);
};

/** Cycles 0..n-1 every `ms`, paused for people who asked for less motion. */
const useCycle = (n, ms) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), ms);
    return () => clearInterval(t);
  }, [n, ms]);
  return i;
};

/* ── The product, built in HTML ── */

const AMINA = ROLES[0];
const TRANSCRIPT = [
  ["Riley", "What did you change in the order service?"],
  ["Amina", AMINA.competencies[0].quote, 0],
  ["Riley", "And the nightly billing job?"],
  ["Amina", AMINA.competencies[1].quote, 1],
  ["Riley", "What happens when the payment provider is slow?"],
  ["Amina", AMINA.competencies[2].quote, 2],
];

/** The hero's picture: an interview transcript where one answer at a time is lit as evidence. */
const Transcript = () => {
  const lit = useCycle(3, 4200);
  return (
    <div className="ui ui-transcript" data-ui aria-label="An interview transcript, with the answers that back each score">
      <div className="ui-row ui-head">
        <span className="ui-title">Amina Farooq · Backend engineer</span>
        <span className="ui-faint num">Interview, 31 min</span>
      </div>
      <ol className="ui-lines">
        {TRANSCRIPT.map(([who, text, comp], i) => {
          const on = comp === lit;
          const c = comp != null ? AMINA.competencies[comp] : null;
          return (
            <li key={i} className={on ? "is-lit" : ""}>
              <span className="ui-who">{who}</span>
              <span className="ui-said">{text}</span>
              {c && (
                <span className="ui-tag num" aria-hidden={!on}>
                  {c.name} · rated {c.rating} · {c.at}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

/** The live thing: a typed role becomes the scorecard HIRE.OS would draft for it. */
const EXAMPLES = ["Product designer", "Sales lead", "Data analyst"];
const RoleDraft = () => {
  const [role, setRole] = useState("Backend engineer");
  const draft = draftScorecard(role || "Any role");
  const rows = [...draft.must.map((r) => [...r, "Must-have"]), ...draft.nice.map((r) => [...r, "Nice to have"])];
  return (
    <div className="lp-typed">
      <label className="lp-typed-line" data-ui>
        <span className="sr-only">Job title</span>
        <input value={role} onChange={(e) => setRole(e.target.value)} spellCheck="false" autoComplete="off" maxLength={60} />
      </label>
      <div className="ui ui-draft" data-ui aria-live="polite">
        <div className="ui-row ui-head">
          <span className="ui-title">Scorecard · {role.trim() || "Any role"}</span>
          <span className="ui-faint">{draft.matched ? "Drafted from the title" : "A general draft"}</span>
        </div>
        <ul className="ui-draft-rows">
          {rows.map(([skill, ask, kind]) => (
            <li key={skill}>
              <div className="ui-row">
                <span className="ui-comp-name">{skill}</span>
                <span className={kind === "Must-have" ? "ui-must" : "ui-faint"}>{kind}</span>
              </div>
              <p className="ui-evidence">{ask}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="lp-typed-examples">
        {EXAMPLES.map((e) => (
          <button key={e} type="button" onClick={() => setRole(e)}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
};

const Coverage = () => (
  <div className="ui ui-copilot" data-ui aria-label="The interview copilot">
    <div className="ui-row ui-head">
      <span className="ui-title">Copilot</span>
      <span className="ui-live">
        <span className="ui-dot" aria-hidden="true" /> Listening
      </span>
    </div>
    <div className="ui-block">
      {[
        ["Node.js APIs", "Covered"],
        ["PostgreSQL tuning", "Covered"],
        ["System design", "Partly"],
        ["AWS", "Not yet"],
      ].map(([n, s]) => (
        <div className="ui-row ui-cov" key={n}>
          <span>{n}</span>
          <span className={s === "Covered" ? "ui-ok" : "ui-faint"}>{s}</span>
        </div>
      ))}
    </div>
    <div className="ui-block">
      <div className="ui-faint">Ask next</div>
      <p className="ui-next">How would you run this service on AWS?</p>
    </div>
  </div>
);

const DECISIONS = [
  ["Amina Farooq", "Backend engineer", "Strongly recommend", 80, AMINA.competencies[0].quote],
  ["Sara Iqbal", "Sales lead", "Recommend", 71],
  ["Bilal Khan", "Product designer", "Consider", 53],
];
const Decisions = () => (
  <div className="ui ui-queue" data-ui aria-label="The owner's decisions">
    <div className="ui-row ui-head">
      <span className="ui-title">Decisions</span>
      <span className="ui-faint">3 waiting on you</span>
    </div>
    {DECISIONS.map(([n, job, call, s, quote], i) => (
      <div className={`ui-qrow ${i === 0 ? "is-open" : ""}`} key={n}>
        <div>
          <div className="ui-name">{n}</div>
          <div className="ui-faint">{job}</div>
        </div>
        <div className="ui-right">
          {call} <span className="num ui-faint">{s}</span>
        </div>
        {quote && <p className="ui-quote-line">&ldquo;{quote}&rdquo;</p>}
        {i === 0 && (
          <div className="ui-actions">
            <span className="ui-btn ui-btn-ink">Approve</span>
            <span className="ui-btn">Hold</span>
            <span className="ui-btn">Reject</span>
          </div>
        )}
      </div>
    ))}
  </div>
);

const Today = () => (
  <div className="ui ui-queue" data-ui aria-label="A recruiter's Today list">
    <div className="ui-row ui-head">
      <span className="ui-title">Today</span>
      <span className="ui-faint">4 things</span>
    </div>
    {[
      ["Join Amina Farooq", "Backend engineer · starts in 5 min", "Join", true],
      ["Send Amina's report", "Scorecard complete", "Finish"],
      ["Review Bilal Khan", "Waiting 10 days", "Review"],
      ["Review Sara Iqbal", "Waiting 4 days", "Review"],
    ].map(([t, sub, action, primary]) => (
      <div className="ui-qrow" key={t}>
        <div>
          <div className="ui-name">{t}</div>
          <div className="ui-faint">{sub}</div>
        </div>
        <div className="ui-right">
          <span className={`ui-btn ${primary ? "ui-btn-ink" : ""}`}>{action}</span>
        </div>
      </div>
    ))}
  </div>
);

const Matches = () => (
  <div className="ui ui-queue" data-ui aria-label="Jobs matched to a candidate">
    <div className="ui-row ui-head">
      <span className="ui-title">Jobs for you</span>
      <span className="ui-faint">Ranked by fit</span>
    </div>
    {[
      ["Backend engineer", "Northwind Logistics · Lahore", 86],
      ["Platform engineer", "Indus Pay · Karachi", 74],
      ["API developer", "Kora Health · Remote", 69],
    ].map(([title, where, score], i) => (
      <div className={`ui-qrow ${i === 0 ? "is-open" : ""}`} key={title}>
        <div>
          <div className="ui-name">{title}</div>
          <div className="ui-faint">{where}</div>
        </div>
        <div className="ui-right num">{score}% fit</div>
        {i === 0 && (
          <div className="ui-actions">
            <span className="ui-btn">Node.js</span>
            <span className="ui-btn">PostgreSQL</span>
            <span className="ui-btn ui-btn-ink">Apply</span>
          </div>
        )}
      </div>
    ))}
  </div>
);

/* ── Content ── */

const STEPS = [
  {
    say: "First, post the job.",
    call: "Backend engineer. Must have Node.js and PostgreSQL; AWS is a plus.",
    response: (
      <div className="ui ui-mini" data-ui>
        <div className="ui-row ui-head">
          <span className="ui-title">Scorecard drafted</span>
          <span className="ui-faint">4 skills</span>
        </div>
        <div className="ui-chips">
          <span className="ui-btn ui-btn-ink">Node.js APIs</span>
          <span className="ui-btn ui-btn-ink">PostgreSQL tuning</span>
          <span className="ui-btn">System design</span>
          <span className="ui-btn">AWS</span>
        </div>
      </div>
    ),
  },
  {
    say: "Then, interview.",
    call: `“${AMINA.competencies[1].quote}”`,
    response: <Coverage />,
  },
  {
    say: "Finally, the owner decides.",
    call: "Amina Farooq, 80: strongly recommend. Three must-haves, each backed by her words.",
    response: <Decisions />,
    wide: true,
  },
];

const GROUPS = [
  {
    name: "For recruiters",
    preview: <Today />,
    items: [
      ["Today", "One list of what needs you, the most urgent first."],
      ["Interview copilot", "Tracks which must-haves were covered and suggests the next question."],
      ["Scorecards", "Rate each skill from 1 to 4 against what the candidate said."],
      ["Reports", "Drafted from the scorecard. You read it, edit it and send it."],
      ["Pipeline board", "Every applicant by stage."],
      ["Talent pool", "Keep strong candidates for the next opening."],
      ["Assessments", "Short tests before the interview."],
      ["Email templates", "Invitations and updates, written once."],
    ],
  },
  {
    name: "For owners",
    preview: <Decisions />,
    items: [
      ["Decisions", "Every recommendation waiting on you, with the evidence under it."],
      ["Team", "Invite recruiters and see their interviews, reports and hires."],
      ["Jobs", "Post, edit and close jobs."],
      ["Analytics", "Time to hire and where your applicants come from."],
      ["Billing", "Your plan, seats and invoices."],
    ],
  },
  {
    name: "For job seekers",
    preview: <Matches />,
    items: [
      ["Matched jobs", "Jobs ranked by how well your skills fit."],
      ["Applications", "Where each application stands."],
      ["Interview practice", "Answer out loud and get feedback on each answer."],
      ["Resume analysis", "What your resume shows, and what it leaves out."],
      ["Career coach", "Ask about your next step and get a plan."],
      ["Salary benchmark", "What the role pays in your city."],
    ],
  },
];

/* ── The page ── */

const Landing = () => {
  const { user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const root = useRef(null);
  useReveal(root);
  const dash = dashboardPath(user);
  const startHiring = user?.role === "company_admin" ? dash : "/company/pricing";

  const [feature, setFeature] = useState([0, 0]);
  const [plan, setPlan] = useState(1);
  const [jobTitle, setJobTitle] = useState("Backend engineer");
  const [where, setWhere] = useState("On-site");
  const group = GROUPS[feature[0]];

  return (
    <div className="lp" ref={root}>
      <a className="lp-skip" href="#main">
        Skip to content
      </a>

      <main id="main" className="lp-room">
        {/* Hero: the title from the top edge to the bottom edge, the evidence lit between */}
        <section className="lp-hero">
          <header className="lp-bar">
            <Link to="/" className="lp-wordmark" aria-label="HIRE.OS home">
              <span className="lp-mark" aria-hidden="true" />
              HIRE.OS
            </Link>
            <nav aria-label="Main">
              <Link to="/jobs">Jobs</Link>
              <a href="#pricing">Pricing</a>
              {dash ? <Link to={dash}>Dashboard</Link> : <Link to="/login">Sign in</Link>}
            </nav>
          </header>
          <h1 className="lp-h1">
            <span className="lp-h1-a">
              <span>Hire on</span>
            </span>
            <span className="lp-h1-b">
              <span>evidence.</span>
            </span>
          </h1>
          <div className="lp-hero-say">
            <p>Every score quotes the candidate&apos;s own words.</p>
            <Link to={startHiring} className="lp-btn">
              Start hiring
            </Link>
          </div>
          <div className="lp-hero-ui">
            <Transcript />
          </div>
        </section>

        {/* Hiring until now: the old room, two archival prints lit as exhibits */}
        <section className="lp-then" aria-labelledby="then-h">
          <figure className="lp-then-a" data-reveal>
            <img src="/landing/employment-office-1935.jpg" alt="Lithograph of three applicants waiting at an employment office counter under a single lamp" width="1100" height="1426" loading="lazy" />
            <figcaption>Employment Office, Jolan Gross Bettelheim, 1935–36</figcaption>
          </figure>
          <div className="lp-then-say">
            <h2 className="lp-h2" id="then-h" data-reveal>
              Hiring, until now.
            </h2>
            <p className="lp-statement" data-reveal>
              For a century it was a counter and an impression. Now the evidence is written down.
            </p>
            <figure className="lp-then-b" data-reveal>
              <img src="/landing/at-the-employment-office.jpg" alt="Ink drawing of a young applicant standing before two women seated at a desk" width="1400" height="941" loading="lazy" />
              <figcaption>At the Employment Office, Charles Samuel Keene, 1870–91</figcaption>
            </figure>
          </div>
        </section>

        {/* The live thing */}
        <section className="lp-showcase" aria-labelledby="try-h">
          <h2 className="lp-h2" id="try-h" data-reveal>
            Type any role.
          </h2>
          <div data-reveal>
            <RoleDraft />
          </div>
        </section>

        {/* How a hire happens: what you give, what comes back */}
        <section className="lp-how" aria-labelledby="how-h">
          <div className="lp-how-col">
            <h2 className="lp-h2" id="how-h" data-reveal>
              How a hire happens.
            </h2>
            {STEPS.map((s) => (
              <div className={`lp-step ${s.wide ? "is-wide" : ""}`} key={s.say}>
                <p className="lp-step-say" data-reveal>
                  {s.say}
                </p>
                <p className="lp-call" data-reveal>
                  {s.call}
                </p>
                <div className="lp-response" data-reveal>
                  {s.response}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Everything in it, as one index; pointing at a name lights its preview */}
        <section className="lp-index" aria-labelledby="index-h">
          <h2 className="lp-h2" id="index-h" data-reveal>
            Three roles, one room.
          </h2>
          <div className="lp-index-grid">
            {GROUPS.map((g, gi) => (
              <div className="lp-index-col" key={g.name} data-reveal>
                <h3>{g.name}</h3>
                <ul>
                  {g.items.map(([name, desc], ii) => {
                    const on = feature[0] === gi && feature[1] === ii;
                    return (
                      <li key={name}>
                        <button
                          type="button"
                          className={on ? "is-on" : ""}
                          onMouseEnter={() => setFeature([gi, ii])}
                          onFocus={() => setFeature([gi, ii])}
                          onClick={() => setFeature([gi, ii])}
                          aria-describedby="index-desc"
                        >
                          {name}
                        </button>
                        <span className="lp-index-touch">{desc}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <div className="lp-index-frame" aria-live="polite" data-reveal>
              <p id="index-desc" key={`${feature[0]}-${feature[1]}`} className="lp-index-desc">
                {group.items[feature[1]][1]}
              </p>
              <div className="lp-index-preview" key={feature[0]}>
                {group.preview}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing: plan names, one live figure */}
        <section className="lp-pricing" id="pricing" aria-labelledby="plans-h">
          <h2 className="sr-only" id="plans-h">
            Pricing
          </h2>
          <div className="lp-plan-names" role="tablist" aria-label="Plans" data-reveal>
            {PLANS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={plan === i}
                aria-controls="plan-stage"
                className={plan === i ? "is-on" : ""}
                onClick={() => setPlan(i)}
                onFocus={() => setPlan(i)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="lp-plan-stage" id="plan-stage" role="tabpanel" data-reveal>
            <div key={plan} className="lp-plan-fade">
              <div className="lp-price-row">
                <p className="lp-price num">{pkr(PLANS[plan].price)}</p>
                <span className="lp-period">a month</span>
              </div>
              <p className="lp-plan-says">{PLANS[plan].says}</p>
              <Link to="/company/pricing" className="lp-btn">
                Choose {PLANS[plan].name}
              </Link>
            </div>
          </div>
        </section>

        {/* Questions: large on the left, answered beside */}
        <section className="lp-faq" aria-labelledby="faq-h">
          <div className="lp-faq-row" data-reveal>
            <h2 className="lp-q lp-q-soft" id="faq-h">
              Questions.
            </h2>
          </div>
          {FAQ.map(([q, a]) => (
            <div className="lp-faq-row" key={q} data-reveal>
              <h3 className="lp-q">{q}</h3>
              <p className="lp-a">{a}</p>
            </div>
          ))}
        </section>

        {/* The first step, already open */}
        <section className="lp-cta" aria-labelledby="cta-h">
          <div className="lp-cta-say" data-reveal>
            <h2 className="lp-cta-h" id="cta-h">
              Post your first job.
            </h2>
            <p>Next you choose a plan and set up your company. Job seekers apply free.</p>
          </div>
          <form
            className="ui ui-dialog"
            data-ui
            data-reveal
            onSubmit={(e) => {
              e.preventDefault();
              navigate(startHiring, { state: { jobTitle, where } });
            }}
          >
            <div className="ui-title">New job</div>
            <label className="ui-field">
              <span>Job title</span>
              <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required maxLength={80} />
            </label>
            <div className="ui-seg" role="group" aria-label="Where the work happens">
              {["On-site", "Remote"].map((w) => (
                <button key={w} type="button" aria-pressed={where === w} onClick={() => setWhere(w)}>
                  {w}
                </button>
              ))}
            </div>
            <button type="submit" className="ui-primary">
              Start hiring
            </button>
          </form>
        </section>
      </main>

      {/* The curtain footer: the page slides away to uncover it */}
      <footer className="lp-footer">
        <div className="lp-footer-cols">
          <nav aria-label="Product">
            <span>Product</span>
            <Link to="/jobs">Jobs</Link>
            <a href="#pricing">Pricing</a>
            <Link to="/login">Sign in</Link>
            <Link to="/signup">Create an account</Link>
          </nav>
          <nav aria-label="Company">
            <span>Company</span>
            <Link to="/about">About</Link>
            <Link to="/careers">Careers</Link>
            <Link to="/press">Press</Link>
            <Link to="/contact">Contact</Link>
          </nav>
          <nav aria-label="Resources">
            <span>Resources</span>
            <Link to="/help">Help centre</Link>
            <Link to="/resume">Resume tips</Link>
            <Link to="/tips">Interview tips</Link>
            <Link to="/salary">Salary guide</Link>
          </nav>
          <nav aria-label="Legal">
            <span>Legal</span>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/cookies">Cookies</Link>
          </nav>
        </div>
        <div className="lp-footer-name">
          <svg viewBox="0 0 1000 158" role="img" aria-label="HIRE.OS">
            <text x="0" y="146" textLength="1000" lengthAdjust="spacing">
              HIRE.OS
            </text>
          </svg>
          <p>
            © {new Date().getFullYear()} HIRE.OS · Prints: Jolan Gross Bettelheim, The Met; Charles Samuel Keene, Art Institute of Chicago. Public domain.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
