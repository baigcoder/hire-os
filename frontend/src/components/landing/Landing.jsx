import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { ROLES, PLANS, PLAN_ROWS, RECORDS, FAQ, scorecardScore, band } from "./data";
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
      { rootMargin: "0px 0px -12% 0px" },
    );
    el.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [root]);
};

/** The hero's report drifts up a little as the page scrolls. */
const useDrift = (ref) => {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(0, ${Math.min(window.scrollY, 900) * -0.12}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
};

const Wordmark = ({ className = "" }) => (
  <span className={`lp-wordmark ${className}`}>
    <span className="lp-mark" aria-hidden="true" />
    HIRE.OS
  </span>
);

/* ── Product fragments (real interface pieces, built in HTML) ── */

const ReportFragment = () => {
  const role = ROLES[0];
  const ratings = role.competencies.map((c) => c.rating);
  const score = scorecardScore(role.competencies, ratings);
  return (
    <div className="ui ui-report" data-ui aria-label="An interview report in HIRE.OS">
      <div className="ui-row ui-head">
        <div>
          <div className="ui-title">{role.candidate}</div>
          <div className="ui-sub">Backend engineer · interviewed by Riley Shah</div>
        </div>
        <span className="ui-pill">Sent to owner</span>
      </div>
      <div className="ui-kpis">
        <div>
          <div className="ui-label">Interviewer&apos;s call</div>
          <div className="ui-kpi">Recommend</div>
        </div>
        <div>
          <div className="ui-label">Scorecard</div>
          <div className="ui-kpi num">
            {score}
            <span className="ui-unit">/100</span>
          </div>
        </div>
        <div>
          <div className="ui-label">Rated</div>
          <div className="ui-kpi num">
            3<span className="ui-unit"> of 4</span>
          </div>
        </div>
      </div>
      <table className="ui-table">
        <tbody>
          {role.competencies.map((c) => (
            <tr key={c.name}>
              <td>
                {c.name}
                <span className="ui-faint">{c.kind === "must" ? " · must-have" : ""}</span>
              </td>
              <td className="num">{c.rating ?? <span className="ui-faint">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <figure className="ui-quote">
        <blockquote>&ldquo;{role.competencies[0].quote}&rdquo;</blockquote>
        <figcaption>
          {role.candidate} at {role.competencies[0].at} · verified against the transcript
        </figcaption>
      </figure>
    </div>
  );
};

const useLiveScorecard = () => {
  const [roleId, setRoleId] = useState(ROLES[0].id);
  const role = ROLES.find((r) => r.id === roleId);
  const [ratings, setRatings] = useState(() => Object.fromEntries(ROLES.map((r) => [r.id, r.competencies.map((c) => c.rating)])));
  const current = ratings[roleId];
  const score = scorecardScore(role.competencies, current);
  const setRating = (i, v) => setRatings((all) => ({ ...all, [roleId]: all[roleId].map((r, j) => (j === i ? (r === v ? null : v) : r)) }));

  return {
    tabs: (
      <div className="lp-tabs" role="tablist" aria-label="Sample interviews">
        {ROLES.map((r) => (
          <button key={r.id} role="tab" aria-selected={r.id === roleId} className={r.id === roleId ? "is-active" : ""} onClick={() => setRoleId(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
    ),
    card: (
      <div className="ui ui-scorecard" data-ui aria-label={`Scorecard for ${role.candidate}`}>
        <div className="ui-row ui-head">
          <div>
            <div className="ui-title">{role.candidate}</div>
            <div className="ui-sub">{role.label} · scorecard</div>
          </div>
          <div className="ui-score" aria-live="polite">
            <span className="num">{score ?? "—"}</span>
            <span className="ui-unit">{score == null ? "" : "/100"}</span>
            <div className="ui-sub">{band(score)}</div>
          </div>
        </div>
        <ol className="ui-comps">
          {role.competencies.map((c, i) => (
            <li key={c.name}>
              <div className="ui-row">
                <span className="ui-comp-name">
                  {c.name}
                  {c.kind === "must" && <span className="ui-faint"> · must-have, counts double</span>}
                </span>
                <span className="ui-rate" role="group" aria-label={`Rate ${c.name}`}>
                  {[1, 2, 3, 4].map((v) => (
                    <button key={v} aria-pressed={current[i] === v} className={current[i] === v ? "is-on" : ""} onClick={() => setRating(i, v)}>
                      {v}
                    </button>
                  ))}
                </span>
              </div>
              {c.quote ? (
                <p className="ui-evidence">
                  &ldquo;{c.quote}&rdquo; <span className="ui-faint">{c.at}</span>
                </p>
              ) : (
                <p className="ui-evidence ui-faint">Not covered in this interview.</p>
              )}
            </li>
          ))}
        </ol>
      </div>
    ),
  };
};

const NOTES = [
  { id: "coverage", side: "left", top: 74, name: "Coverage", text: "Each competency from the job, marked as the candidate covers it. Coverage never goes back down." },
  { id: "quote", side: "left", top: 236, name: "Verified quote", text: "The exact line that earned the mark, checked against the transcript, with its minute." },
  { id: "followups", side: "left", top: 392, name: "Follow-ups", text: "Up to three questions for what's still uncovered. Questions about protected traits are filtered out." },
  { id: "transcript", side: "right", top: 74, name: "Transcript", text: "Each side's own microphone, transcribed in 15-second chunks. Silence and filler are dropped." },
  { id: "consent", side: "right", top: 300, name: "Consent", text: "Nothing is transcribed until the candidate agrees. Audio is never stored." },
  { id: "draft", side: "right", top: 540, name: "Draft rating", text: "A suggestion, never a score: it counts only once the interviewer confirms it." },
];

const CopilotPanel = ({ focus }) => {
  const dim = (id) => (focus && focus !== id ? "is-dim" : "");
  return (
    <div className="ui ui-copilot" data-ui aria-label="The interview copilot panel">
      <div className={`ui-block ${dim("transcript")}`} data-part="transcript">
        <div className="ui-row ui-head">
          <div className="ui-title">Copilot</div>
          <span className="ui-faint num">24:12</span>
        </div>
        <p className="ui-line">
          <span className="ui-who">Amina</span> …so the queue absorbs it and checkout stays fast.
        </p>
        <p className="ui-line">
          <span className="ui-who">Riley</span> And if the provider is down for an hour?
        </p>
      </div>
      <div className={`ui-block ${dim("coverage")}`} data-part="coverage">
        <div className="ui-label">Coverage</div>
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
      <div className={`ui-block ${dim("consent")}`} data-part="consent">
        <div className="ui-row">
          <span>Transcribing with consent</span>
          <span className="ui-dot" aria-hidden="true" />
        </div>
      </div>
      <div className={`ui-block ${dim("quote")}`} data-part="quote">
        <div className="ui-label">Latest evidence · System design</div>
        <p className="ui-evidence">&ldquo;I&apos;d queue the payment call so a slow provider can&apos;t block checkout.&rdquo;</p>
      </div>
      <div className={`ui-block ${dim("followups")}`} data-part="followups">
        <div className="ui-label">Ask next</div>
        <ol className="ui-asks">
          <li>How would you run this service on AWS?</li>
          <li>What would you monitor to see the queue backing up?</li>
          <li>Where did your design go wrong last time?</li>
        </ol>
      </div>
      <div className={`ui-block ${dim("draft")}`} data-part="draft">
        <div className="ui-row">
          <span>Draft for System design: 3</span>
          <span className="ui-btn">Confirm</span>
        </div>
      </div>
    </div>
  );
};

const QueueFragment = () => (
  <div className="ui ui-queue" data-ui aria-label="The owner's decision queue">
    <div className="ui-row ui-head">
      <div className="ui-title">Awaiting your decision</div>
      <span className="ui-faint num">3</span>
    </div>
    {[
      ["Amina Farooq", "Backend engineer · from Riley Shah", "Recommend", "scorecard 80/100"],
      ["Bilal Khan", "Product designer · from Hamza Ali", "Consider", "scorecard 53/100"],
      ["Sara Iqbal", "Sales lead · from Riley Shah", "Passed directly", "no interview report"],
    ].map(([n, sub, call, meta], i) => (
      <div className={`ui-qrow ${i === 0 ? "is-open" : ""}`} key={n}>
        <div>
          <div className="ui-name">{n}</div>
          <div className="ui-sub">{sub}</div>
        </div>
        <div className="ui-right">
          <div>{call}</div>
          <div className="ui-faint num">{meta}</div>
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

/* ── The many-into-one diagram ── */

const rand = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const Diagram = ({ vertical = false }) => {
  const r = rand(7);
  const n = 144;
  const W = 1200;
  const H = 260;
  const squares = Array.from({ length: n }, (_, i) => {
    const t = i / n;
    // Left third scattered, middle a 3-high ribbon, right neat rows
    const zone = i % 3;
    let x, y, tone;
    if (zone === 0) {
      x = 20 + r() * 340;
      y = 20 + r() * (H - 52);
      tone = r() > 0.5 ? "a" : "b";
    } else if (zone === 1) {
      const k = Math.floor(i / 3);
      x = 420 + (k % 16) * 22;
      y = H / 2 - 30 + Math.floor((k / 16) % 3) * 20;
      tone = "b";
    } else {
      const k = Math.floor(i / 3);
      x = 840 + (k % 12) * 28;
      y = 40 + Math.floor(k / 12) * 46;
      tone = "c";
    }
    return { x, y, tone, t };
  });
  return (
    <svg
      className="lp-diagram"
      viewBox={vertical ? `0 0 ${H} ${W}` : `0 0 ${W} ${H}`}
      role="img"
      aria-label="Many applications, screened and interviewed, become one ordered set of decisions"
    >
      {squares.map((s, i) => (
        <rect key={i} x={vertical ? s.y : s.x} y={vertical ? s.x : s.y} width="12" height="12" className={`sq sq-${s.tone}`} />
      ))}
    </svg>
  );
};

/* ── The page ── */

const Landing = () => {
  const { user } = useSelector((s) => s.auth);
  const root = useRef(null);
  const drift = useRef(null);
  const [focus, setFocus] = useState(null);
  const scorecard = useLiveScorecard();
  useReveal(root);
  useDrift(drift);

  const dash = dashboardPath(user);
  const startHiring = user?.role === "company_admin" ? dash : "/company/pricing";

  return (
    <div className="lp" ref={root}>
      <a className="lp-skip" href="#main">
        Skip to content
      </a>

      {/* Hero: narrow talk, wide headline */}
      <header className="lp-hero">
        <div className="lp-hero-left">
          <Link to="/" className="lp-home" aria-label="HIRE.OS home">
            <Wordmark />
          </Link>
          <div className="lp-hero-talk">
            <p className="lp-lead">A hiring system where every rating cites the candidate&apos;s own words.</p>
            <Link to={startHiring} className="lp-btn lp-btn-brand">
              Start hiring
            </Link>
          </div>
        </div>
        <div className="lp-hero-right">
          <nav className="lp-nav" aria-label="Main">
            <Link to="/browse">Find jobs</Link>
            <a href="#how">How it works</a>
            <a href="#plans">Plans</a>
            {dash ? <Link to={dash}>Dashboard</Link> : <Link to="/login">Sign in</Link>}
          </nav>
          <h1 className="lp-h1 lines" id="main">
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
          <div className="lp-hero-plate">
            <div className="lp-fact">
              <span className="lp-fact-figure">90 days</span>
              <span>Transcripts are kept 90 days. Audio is never stored.</span>
            </div>
            <div className="lp-hero-frame" ref={drift}>
              <ReportFragment />
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Showcase: square plate, spare text — the live scorecard */}
        <section className="lp-showcase" aria-labelledby="rate">
          <div className="lp-plate" data-reveal>
            {scorecard.card}
          </div>
          <div className="lp-showcase-text">
            {scorecard.tabs}
            <div data-reveal>
              <h2 className="lp-h3" id="rate">
                Rate what was said
              </h2>
              <p className="lp-body lp-measure">
                Each competency comes from the job. The interviewer rates it 1 to 4, and the quote that earned the rating sits right under it. Change a
                rating and watch the score: must-haves count double, and anything not covered stays out of it.
              </p>
            </div>
            <div className="lp-cells">
              <Link to={startHiring} className="lp-cell lp-cell-ink">
                Start hiring
              </Link>
              <a href="#how" className="lp-cell">
                How a hire happens
              </a>
            </div>
          </div>
        </section>

        {/* How it works: many into one */}
        <section className="lp-how" id="how" aria-labelledby="how-h">
          <div className="lp-how-head">
            <figure className="lp-figure lp-how-figure" data-reveal>
              <img
                src="/landing/employment-office-1935.jpg"
                width="1100"
                height="1426"
                loading="lazy"
                alt="Lithograph of three tired applicants waiting at a counter under a single hanging lamp"
              />
              <figcaption className="lp-small">Employment Office, Jolan Gross Bettelheim, 1935–36</figcaption>
            </figure>
            <div className="lp-how-text" data-reveal>
              <h2 className="lp-h2" id="how-h">
                From pile
                <br />
                to decision
              </h2>
              <p className="lp-body lp-measure">
                Hiring used to mean a queue at a counter and a judgement nobody wrote down. Here it is three steps, each one leaving a record the
                next can check.
              </p>
            </div>
          </div>
          <div className="lp-diagram-wrap" data-reveal>
            <Diagram />
          </div>
          <div className="lp-how-cols">
            {[
              ["Screen", "Resumes are ranked on skills with the name, contact details and photo links removed first."],
              ["Interview", "The copilot tracks each competency, suggests follow-ups and transcribes, with consent."],
              ["Decide", "The report goes to the company's owner, who approves, holds or rejects with the evidence open."],
            ].map(([name, text]) => (
              <div key={name} data-reveal>
                <h3 className="lp-h4">{name}</h3>
                <p className="lp-body">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features: the copilot panel with margin notes */}
        <section className="lp-panel" aria-labelledby="copilot-h">
          <h2 className="lp-h3 lp-panel-h" id="copilot-h" data-reveal>
            The copilot, part by part
          </h2>
          <div className="lp-panel-stage">
            {["left", "right"].map((side) => (
              <ul className={`lp-notes lp-notes-${side}`} key={side}>
                {NOTES.filter((n) => n.side === side).map((n) => (
                  <li key={n.id} style={{ "--top": `${n.top}px` }}>
                    <button
                      type="button"
                      className="lp-note"
                      onMouseEnter={() => setFocus(n.id)}
                      onMouseLeave={() => setFocus(null)}
                      onFocus={() => setFocus(n.id)}
                      onBlur={() => setFocus(null)}
                    >
                      <span className="lp-note-name">{n.name}</span>
                      <span className="lp-note-text">{n.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ))}
            <div className="lp-panel-ui" data-reveal>
              <CopilotPanel focus={focus} />
            </div>
          </div>
        </section>

        {/* A colour page: the owner's queue */}
        <section className="lp-band" aria-labelledby="owner-h">
          <div className="lp-band-text" data-reveal>
            <h2 className="lp-h2" id="owner-h">
              The owner
              <br />
              has the last word
            </h2>
            <p className="lp-body lp-measure">
              Reports land in one queue for the company&apos;s owner, with the scorecard open beside each name. Approve and the offer letter follows;
              hold and it waits; nothing is sent to the candidate until there is a decision.
            </p>
          </div>
          <div className="lp-band-ui" data-reveal>
            <QueueFragment />
          </div>
        </section>

        {/* Proof: what a decision keeps */}
        <section className="lp-records" aria-labelledby="records-h">
          <div className="lp-records-head">
            <h2 className="lp-h2 lp-stepped" id="records-h" data-reveal>
              <span>What a decision</span>
              <span className="lp-indent">keeps on record</span>
            </h2>
            <figure className="lp-figure lp-records-figure" data-reveal>
              <img
                src="/landing/at-the-employment-office.jpg"
                width="1400"
                height="941"
                loading="lazy"
                alt="Ink drawing of a young applicant standing before two women seated at a desk, being looked over"
              />
              <figcaption className="lp-small">At the Employment Office, Charles Samuel Keene, 1870–91</figcaption>
            </figure>
          </div>
          <div className="lp-table-wrap" data-reveal>
            <table className="lp-table">
              <thead>
                <tr>
                  <th scope="col">Record</th>
                  <th scope="col">Comes from</th>
                  <th scope="col">Kept for</th>
                  <th scope="col">Who sees it</th>
                </tr>
              </thead>
              <tbody>
                {RECORDS.map(([what, from, kept, who]) => (
                  <tr key={what}>
                    <th scope="row">{what}</th>
                    <td>{from}</td>
                    <td>{kept}</td>
                    <td>{who}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pricing: plans as a large table */}
        <section className="lp-plans" id="plans" aria-labelledby="plans-h">
          <div className="lp-plans-wrap" data-reveal>
            <table className="lp-plan-table">
              <thead>
                <tr>
                  <th scope="col">
                    <h2 className="lp-h3" id="plans-h">
                      Plans for companies
                    </h2>
                    <span className="lp-small">Monthly, in Pakistani rupees</span>
                  </th>
                  {PLANS.map((p) => (
                    <th scope="col" key={p.id} className={p.recommended ? "is-rec" : ""}>
                      <span className="lp-plan-name">{p.name}</span>
                      <span className="lp-plan-price">{pkr(p.price)}</span>
                      <span className="lp-small lp-period">a month</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLAN_ROWS.map(([label, ...cells]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {cells.map((c, i) => (
                      <td key={i} className={PLANS[i].recommended ? "is-rec" : ""}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="lp-plan-actions">
                  <th scope="row">
                    <span className="lp-small">
                      Job seekers: every candidate tool is free for 30 days. <Link to="/signup">Create a profile</Link>
                    </span>
                  </th>
                  {PLANS.map((p) => (
                    <td key={p.id} className={p.recommended ? "is-rec" : ""}>
                      <Link to="/company/pricing" className={`lp-btn ${p.recommended ? "lp-btn-ink-on-brand" : "lp-btn-ink"}`}>
                        Choose {p.name}
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {/* Phone: one block per plan */}
          <div className="lp-plan-blocks">
            <h2 className="lp-h3">Plans for companies</h2>
            {PLANS.map((p, i) => (
              <div key={p.id} className={`lp-plan-block ${p.recommended ? "is-rec" : ""}`}>
                <div className="lp-plan-name">{p.name}</div>
                <div className="lp-plan-price">{pkr(p.price)}</div>
                <div className="lp-small lp-period">a month</div>
                <dl>
                  {PLAN_ROWS.map(([label, ...cells]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{cells[i]}</dd>
                    </div>
                  ))}
                </dl>
                <Link to="/company/pricing" className={`lp-btn ${p.recommended ? "lp-btn-ink-on-brand" : "lp-btn-ink"}`}>
                  Choose {p.name}
                </Link>
              </div>
            ))}
            <p className="lp-small">
              Job seekers: every candidate tool is free for 30 days. <Link to="/signup">Create a profile</Link>
            </p>
          </div>
        </section>

        {/* FAQ: large questions, answers beside */}
        <section className="lp-faq" aria-labelledby="faq-h">
          <div className="lp-faq-row" data-reveal>
            <h2 className="lp-q lp-q-head" id="faq-h">
              Questions
            </h2>
          </div>
          {FAQ.map(([q, a]) => (
            <div className="lp-faq-row" key={q} data-reveal>
              <h3 className="lp-q">{q}</h3>
              <p className="lp-body lp-a">{a}</p>
            </div>
          ))}
        </section>

        {/* CTA: the idea again, inverted */}
        <section className="lp-cta" aria-labelledby="cta-h">
          <h2 className="lp-h1 lp-cta-h" id="cta-h" data-reveal>
            Every hire,
            <br />
            on the record.
          </h2>
          <div className="lp-cta-row">
            <p className="lp-lead">Set up a company, invite your recruiters and run the first interview this week.</p>
            <Link to={startHiring} className="lp-btn lp-btn-brand lp-btn-tall">
              Start hiring
            </Link>
          </div>
        </section>
      </main>

      {/* Footer: name first, places under it */}
      <footer className="lp-footer">
        <div className="lp-footer-name" aria-hidden="true">
          HIRE.OS
        </div>
        <div className="lp-footer-row">
          <ul className="lp-places">
            <li>
              <Link to="/browse">Find a job</Link>
            </li>
            <li>
              <Link to={startHiring}>Start hiring</Link>
            </li>
            <li>
              <Link to="/contact">Talk to us</Link>
            </li>
          </ul>
          <div className="lp-links">
            <ul aria-label="Product">
              <li>
                <a href="#how">How it works</a>
              </li>
              <li>
                <a href="#plans">Plans</a>
              </li>
              <li>
                <Link to="/login">Sign in</Link>
              </li>
            </ul>
            <ul aria-label="Company">
              <li>
                <Link to="/about">About</Link>
              </li>
              <li>
                <Link to="/careers">Careers</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
              </li>
            </ul>
            <ul aria-label="Legal">
              <li>
                <Link to="/privacy">Privacy</Link>
              </li>
              <li>
                <Link to="/terms">Terms</Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="lp-small lp-credits">
          Pictures: &ldquo;Employment Office&rdquo; by Jolan Gross Bettelheim, 1935–36, public domain (CC0), The Metropolitan Museum of Art.
          &ldquo;At the Employment Office&rdquo; by Charles Samuel Keene, 1870–91, public domain (CC0), Art Institute of Chicago.
        </p>
        <div className="lp-legal">
          <span>© {new Date().getFullYear()} HIRE.OS</span>
          <a href="#main">Back to top</a>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
