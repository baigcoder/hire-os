import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { ROLES, PLANS, PLAN_ROWS, FAQ, scorecardScore, band } from "./data";
import "./landing.css";

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
          // Also reveal parts already scrolled past, e.g. after a jump to an anchor
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    el.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [root]);
};

const Wordmark = () => (
  <span className="lp-wordmark">
    <span className="lp-mark" aria-hidden="true" />
    HIRE.OS
  </span>
);

/* ── The product, built in HTML ── */

/** A real scorecard: rate it and the score follows the backend's rule. */
const Scorecard = () => {
  const [roleId, setRoleId] = useState(ROLES[0].id);
  const role = ROLES.find((r) => r.id === roleId);
  const [ratings, setRatings] = useState(() => Object.fromEntries(ROLES.map((r) => [r.id, r.competencies.map((c) => c.rating)])));
  const current = ratings[roleId];
  const score = scorecardScore(role.competencies, current);
  const setRating = (i, v) => setRatings((all) => ({ ...all, [roleId]: all[roleId].map((r, j) => (j === i ? (r === v ? null : v) : r)) }));

  return (
    <div className="ui ui-scorecard" data-ui aria-label={`Scorecard for ${role.candidate}`}>
      <div className="ui-row ui-head">
        <div className="ui-roles" role="tablist" aria-label="Sample interviews">
          {ROLES.map((r) => (
            <button key={r.id} role="tab" aria-selected={r.id === roleId} className={r.id === roleId ? "is-on" : ""} onClick={() => setRoleId(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="ui-score" aria-live="polite">
          <span className="num">{score ?? "—"}</span>
          <span className="ui-faint">{band(score)}</span>
        </div>
      </div>
      <ol className="ui-comps">
        {role.competencies.map((c, i) => (
          <li key={c.name}>
            <div className="ui-row">
              <span className="ui-comp-name">{c.name}</span>
              <span className="ui-rate" role="group" aria-label={`Rate ${c.name}`}>
                {[1, 2, 3, 4].map((v) => (
                  <button key={v} aria-pressed={current[i] === v} className={current[i] === v ? "is-on" : ""} onClick={() => setRating(i, v)}>
                    {v}
                  </button>
                ))}
              </span>
            </div>
            <p className={`ui-evidence ${c.quote ? "" : "ui-faint"}`}>{c.quote ? <>&ldquo;{c.quote}&rdquo;</> : "Not covered"}</p>
          </li>
        ))}
      </ol>
    </div>
  );
};

const Copilot = () => (
  <div className="ui ui-copilot" data-ui aria-label="The interview copilot">
    <div className="ui-block">
      <div className="ui-row">
        <span className="ui-title">Amina Farooq</span>
        <span className="ui-live">
          <span className="ui-dot" aria-hidden="true" /> Live
        </span>
      </div>
      <p className="ui-line">
        <span className="ui-who">Amina</span> …so the queue absorbs it and checkout stays fast.
      </p>
      <p className="ui-line">
        <span className="ui-who">Riley</span> And if the provider is down for an hour?
      </p>
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
      <ol className="ui-asks">
        <li>How would you run this service on AWS?</li>
        <li>What would you monitor to see the queue backing up?</li>
      </ol>
    </div>
  </div>
);

const Decisions = () => (
  <div className="ui ui-queue" data-ui aria-label="The owner's decisions">
    {[
      ["Amina Farooq", "Backend engineer", "Recommend", 80],
      ["Bilal Khan", "Product designer", "Consider", 53],
      ["Sara Iqbal", "Sales lead", "Recommend", 71],
    ].map(([n, job, call, s], i) => (
      <div className={`ui-qrow ${i === 0 ? "is-open" : ""}`} key={n}>
        <div>
          <div className="ui-name">{n}</div>
          <div className="ui-faint">{job}</div>
        </div>
        <div className="ui-right">
          {call} <span className="num ui-faint">{s}</span>
        </div>
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

const Matches = () => (
  <div className="ui ui-queue" data-ui aria-label="Jobs matched to a candidate">
    {[
      ["Backend engineer", "Northwind Logistics · Lahore", 86, ["Node.js", "PostgreSQL"]],
      ["Platform engineer", "Indus Pay · Karachi", 74, ["AWS", "Node.js"]],
      ["API developer", "Kora Health · Remote", 69, ["PostgreSQL"]],
    ].map(([title, where, score, skills], i) => (
      <div className={`ui-qrow ${i === 0 ? "is-open" : ""}`} key={title}>
        <div>
          <div className="ui-name">{title}</div>
          <div className="ui-faint">{where}</div>
        </div>
        <div className="ui-right num">{score}%</div>
        {i === 0 && (
          <div className="ui-actions">
            {skills.map((k) => (
              <span key={k} className="ui-btn">
                {k}
              </span>
            ))}
            <span className="ui-btn ui-btn-ink">Apply</span>
          </div>
        )}
      </div>
    ))}
  </div>
);

/* ── The page ── */

const Landing = () => {
  const { user } = useSelector((s) => s.auth);
  const root = useRef(null);
  useReveal(root);
  const dash = dashboardPath(user);
  const startHiring = user?.role === "company_admin" ? dash : "/company/pricing";

  return (
    <div className="lp" ref={root}>
      <a className="lp-skip" href="#main">
        Skip to content
      </a>

      <header className="lp-bar">
        <Link to="/" className="lp-home" aria-label="HIRE.OS home">
          <Wordmark />
        </Link>
        <nav className="lp-nav" aria-label="Main">
          <Link to="/jobs">Jobs</Link>
          <a href="#pricing">Pricing</a>
          {dash ? <Link to={dash}>Dashboard</Link> : <Link to="/login">Sign in</Link>}
        </nav>
      </header>

      <main id="main">
        <section className="lp-hero">
          <h1 className="lp-h1 lines">
            <span className="line">
              <span data-line style={{ "--i": 0 }}>
                Hire on
              </span>
            </span>
            <span className="line">
              <span data-line style={{ "--i": 1 }}>
                evidence.
              </span>
            </span>
          </h1>
          <div className="lp-hero-side">
            <p className="lp-lead">Structured interviews, scored with the candidate&apos;s own words.</p>
            <div className="lp-actions">
              <Link to={startHiring} className="lp-btn lp-btn-brand">
                Start hiring
              </Link>
              <Link to="/jobs" className="lp-btn lp-btn-ghost">
                Find a job
              </Link>
            </div>
          </div>
        </section>

        <section className="lp-stage" aria-label="A scorecard you can try">
          <div className="lp-stage-ui" data-reveal>
            <Scorecard />
          </div>
        </section>

        <section className="lp-feature" aria-labelledby="f-copilot">
          <h2 className="lp-h2" id="f-copilot" data-reveal>
            It listens while you interview.
          </h2>
          <div className="lp-feature-ui" data-reveal>
            <Copilot />
          </div>
        </section>

        <section className="lp-feature lp-feature-flip" aria-labelledby="f-owner">
          <h2 className="lp-h2" id="f-owner" data-reveal>
            The owner makes the call.
          </h2>
          <div className="lp-feature-ui" data-reveal>
            <Decisions />
          </div>
        </section>

        <section className="lp-feature" aria-labelledby="f-jobs">
          <h2 className="lp-h2" id="f-jobs" data-reveal>
            Find work that fits.
          </h2>
          <div className="lp-feature-ui" data-reveal>
            <Matches />
            <Link to="/jobs" className="lp-btn lp-btn-ghost lp-under">
              Browse jobs
            </Link>
          </div>
        </section>

        <section className="lp-pricing" id="pricing" aria-labelledby="pricing-h">
          <h2 className="lp-h2" id="pricing-h" data-reveal>
            Pricing
          </h2>
          <div className="lp-plans" data-reveal>
            {PLANS.map((p, i) => (
              <div key={p.id} className={`lp-plan ${p.recommended ? "is-rec" : ""}`}>
                <div className="lp-plan-name">{p.name}</div>
                <div className="lp-plan-price">{pkr(p.price)}</div>
                <div className="lp-plan-period">a month</div>
                <dl>
                  {PLAN_ROWS.map(([label, ...cells]) => (
                    <div key={label} className={cells[i] === "—" ? "is-off" : ""}>
                      <dt>{label}</dt>
                      <dd>{cells[i]}</dd>
                    </div>
                  ))}
                </dl>
                <Link to="/company/pricing" className={`lp-btn ${p.recommended ? "lp-btn-brand" : "lp-btn-ghost"}`}>
                  Choose {p.name}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-faq" aria-label="Questions">
          {FAQ.map(([q, a]) => (
            <div className="lp-faq-row" key={q} data-reveal>
              <h3 className="lp-q">{q}</h3>
              <p className="lp-a">{a}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-row">
          <Wordmark />
          <nav className="lp-footer-links" aria-label="Footer">
            <Link to="/jobs">Jobs</Link>
            <a href="#pricing">Pricing</a>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
          <span className="lp-copy">© {new Date().getFullYear()} HIRE.OS</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
