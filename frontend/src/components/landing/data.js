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

// The real plans (backend models/company.model.js SUBSCRIPTION_PLANS), monthly in PKR
export const PLANS = [
  { id: "basic", name: "Basic", price: 5000 },
  { id: "professional", name: "Professional", price: 15000, recommended: true },
  { id: "enterprise", name: "Enterprise", price: 40000 },
];

export const PLAN_ROWS = [
  ["Job posts", "5", "20", "Unlimited"],
  ["Recruiter seats", "1", "5", "Unlimited"],
  ["Video interviews with the copilot", "—", "Included", "Included"],
  ["API access", "—", "—", "Included"],
  ["Support", "Email", "Priority", "Dedicated"],
];


export const FAQ = [
  ["Does the AI decide who gets hired?", "No. It transcribes and drafts. The interviewer rates, and the company's owner decides."],
  ["Is the interview recorded?", "Only as text, with the candidate's consent. Audio is never stored; transcripts are deleted after 90 days."],
  ["Is it free for job seekers?", "Applying is. Resume analysis and interview practice are free for the first 30 days."],
];
