// Sample interview content for the landing page's product fragments.
// Names, quotes and timings are illustrative; plans and rules are the product's real ones.

// Same rule as backend modules/report/interviewReport.js scorecardScore
export const MUST_WEIGHT = 2;
export const NICE_WEIGHT = 1;

export const scorecardScore = (competencies, ratings) => {
  let weighted = 0;
  let weights = 0;
  competencies.forEach((c, i) => {
    const r = ratings[i];
    if (r == null) return;
    const w = c.kind === "must" ? MUST_WEIGHT : NICE_WEIGHT;
    weighted += w * ((r - 1) / 3);
    weights += w;
  });
  return weights ? Math.round((weighted / weights) * 100) : null;
};

export const band = (s) =>
  s == null ? "Not rated yet" : s >= 80 ? "Strongly recommend" : s >= 60 ? "Recommend" : s >= 40 ? "Consider" : "Not recommended";

export const ROLES = [
  {
    id: "backend",
    label: "Backend engineer",
    candidate: "Amina Farooq",
    competencies: [
      { name: "Node.js APIs", kind: "must", rating: 4, at: "12:41", quote: "I moved the order service off one Postgres box and cut p95 from 900 to 180 milliseconds." },
      { name: "PostgreSQL tuning", kind: "must", rating: 3, at: "18:05", quote: "A partial index on unpaid orders took the nightly job from forty minutes to six." },
      { name: "System design", kind: "nice", rating: 3, at: "24:30", quote: "I'd queue the payment call so a slow provider can't block checkout." },
      { name: "AWS", kind: "nice", rating: null, at: null, quote: null },
    ],
  },
  {
    id: "design",
    label: "Product designer",
    candidate: "Bilal Khan",
    competencies: [
      { name: "Interaction design", kind: "must", rating: 3, at: "08:12", quote: "We cut checkout from five steps to two after watching people abandon at the address form." },
      { name: "User research", kind: "must", rating: 2, at: "15:47", quote: "Mostly we ran surveys; I sat in on two usability sessions." },
      { name: "Design systems", kind: "nice", rating: 3, at: "21:03", quote: "I wrote the spacing scale and got the four product teams to adopt it." },
      { name: "Prototyping", kind: "nice", rating: null, at: null, quote: null },
    ],
  },
  {
    id: "sales",
    label: "Sales lead",
    candidate: "Sara Iqbal",
    competencies: [
      { name: "Discovery", kind: "must", rating: 4, at: "06:30", quote: "I ask what happens if they do nothing for a year, then I stop talking." },
      { name: "Negotiation", kind: "must", rating: 3, at: "13:18", quote: "I traded a longer term for the discount instead of giving it away." },
      { name: "Forecasting", kind: "nice", rating: 2, at: "19:52", quote: "My forecast was within fifteen percent most quarters." },
      { name: "CRM hygiene", kind: "nice", rating: null, at: null, quote: null },
    ],
  },
];

// Everything is free: one list of what every account gets
export const FREE_FOR_ALL = {
  companies: "Unlimited job posts and recruiter seats, video interviews with the copilot, MCQ tests and assessments, blind screening and the owner's decision queue.",
  seekers: "Apply to any job, analyse your resume, practise interviews, ask the career coach and message the companies you interview with.",
};

export const FAQ = [
  ["Does the AI decide who gets hired?", "No. It transcribes the interview and drafts the report. The interviewer rates each skill, and the company's owner makes the decision."],
  ["What does a score mean?", "Each skill is rated from 1 to 4, and must-haves count double. The total runs from 0 to 100; 80 or more is a strong recommendation."],
  ["Is the interview recorded?", "Only as text, and only with the candidate's consent. Audio is never stored, and transcripts are deleted after 90 days."],
  ["How do recruiters join?", "The company's owner invites them by email. There is no seat limit."],
  ["Is it free for job seekers?", "Yes. Everything is free: applying, resume analysis, interview practice and the career coach. There is no trial that ends."],
];

// The live scorecard on the landing page: a role in, a drafted scorecard out.
// Each entry: words that match a title, then must-haves and nice-to-haves as [skill, opening question].
const DRAFTS = [
  [["backend", "server", "api", "node", "java", "python", "golang"],
    [["API design", "Walk me through an API you designed. What would you change now?"], ["Databases", "Tell me about a slow query you fixed. How did you find it?"]],
    [["System design", "How would you keep checkout working if the payment provider is down?"], ["Cloud", "What have you run in production on AWS or GCP?"]]],
  [["frontend", "react", "web developer", "ui engineer"],
    [["React", "Show me a component you're proud of. Why is it shaped that way?"], ["Web performance", "How did you make a slow page fast?"]],
    [["Accessibility", "How do you test a screen with a keyboard and a screen reader?"], ["Testing", "What do you test, and what do you deliberately not?"]]],
  [["designer", "design", "ux", "ui designer", "ux designer"],
    [["Interaction design", "Take me through a flow you simplified. What did you remove?"], ["User research", "When did research change your mind?"]],
    [["Design systems", "How did you get other teams to use shared components?"], ["Prototyping", "When do you prototype instead of drawing screens?"]]],
  [["sales", "account", "business development"],
    [["Discovery", "How do you find out what the buyer actually needs?"], ["Negotiation", "Tell me about a deal where you held the price."]],
    [["Forecasting", "How close were your forecasts last year?"], ["CRM hygiene", "What do you write down after every call?"]]],
  [["data", "analyst", "analytics", "scientist"],
    [["SQL", "Write the query for monthly active users, out loud."], ["Analysis", "Tell me about a finding that changed a decision."]],
    [["Python", "What do you reach for when SQL isn't enough?"], ["Dashboards", "Which dashboard did people actually use, and why?"]]],
  [["product manager", "product owner", "pm"],
    [["Prioritisation", "What did you say no to last quarter, and how?"], ["Discovery", "How do you know a problem is worth solving?"]],
    [["Metrics", "Which number did your last launch move?"], ["Stakeholders", "Tell me about a roadmap fight you resolved."]]],
  [["marketing", "growth", "content", "seo"],
    [["Campaigns", "Take me through a campaign from brief to result."], ["Measurement", "How do you know which channel worked?"]],
    [["Copywriting", "Rewrite our headline in one line."], ["SEO", "What did you change that moved search traffic?"]]],
  [["support", "customer service", "success"],
    [["Customer empathy", "Tell me about your hardest customer and how it ended."], ["Problem solving", "How do you handle a bug you can't reproduce?"]],
    [["Written clarity", "Explain a refund policy in three sentences."], ["Tooling", "Which support tools have you set up?"]]],
  [["accountant", "finance", "accounts", "bookkeeper"],
    [["Reconciliation", "Walk me through a month-end close."], ["Reporting", "Which report do you produce that someone acts on?"]],
    [["Tax", "What changed in tax rules that affected your last employer?"], ["Spreadsheets", "What's the most complex model you've built?"]]],
];

const GENERIC = [
  [["Role skills", "What part of this job are you best at? Give me an example."], ["Problem solving", "Tell me about a problem nobody else could fix."]],
  [["Communication", "Explain your last project to someone outside your field."], ["Ownership", "What did you take on that wasn't your job?"]],
];

/** A drafted scorecard for any job title: known roles get their skills, others a sound generic draft. */
export const draftScorecard = (title) => {
  const t = ` ${title.toLowerCase().replace(/[^a-z]+/g, " ")} `;
  // Whole words only: "pm" must not match "development", nor "ui" "building"
  const hit = DRAFTS.find(([words]) => words.some((w) => t.includes(` ${w} `)));
  const [must, nice] = hit ? hit.slice(1) : GENERIC;
  return { matched: Boolean(hit), must, nice };
};
