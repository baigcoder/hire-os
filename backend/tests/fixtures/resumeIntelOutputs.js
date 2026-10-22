/**
 * Hand-written LLM outputs for the synthetic resume in
 * evals/resume-intel/fixtures/resumes/backend_mid.txt, used to test the
 * pipeline without calling a model.
 */

export const backendExtraction = {
  contact: {
    name: "Jordan Reyes",
    email: "jordan.reyes@example.com",
    phone: "+1 555 010 2233",
    location: "Austin, TX",
    links: ["github.com/jordan-reyes-dev"],
  },
  summary:
    "Backend engineer with four years building Node.js services and PostgreSQL data models for payments and logistics products.",
  experience: [
    {
      title: "Senior Software Engineer",
      company: "Parcelwise",
      location: null,
      dateText: "Mar 2023 – Present",
      start: "2023-03",
      end: null,
      current: true,
      bullets: [
        "Led migration of the shipment tracking API from a monolith to 6 Node.js microservices, cutting p95 latency from 820ms to 190ms",
        "Designed PostgreSQL schemas and partitioning for 40M tracking events per month",
        "Built CI/CD pipelines with GitHub Actions and Docker, reducing deploy time by 70%",
        "Mentored 3 junior engineers through code review and pairing",
      ],
    },
    {
      title: "Software Engineer",
      company: "Ledgerly",
      location: null,
      dateText: "Jun 2021 – Feb 2023",
      start: "2021-06",
      end: "2023-02",
      current: false,
      bullets: [
        "Developed REST APIs in Express and TypeScript for invoicing used by 12,000 small businesses",
        "Implemented idempotent payment webhooks with Redis locks, eliminating duplicate charges",
        "Wrote Jest integration tests raising coverage from 35% to 80%",
        "Deployed services on AWS ECS with Terraform",
      ],
    },
    {
      title: "Backend Intern",
      company: "CityBike Labs",
      location: null,
      dateText: "Jun 2020 – Aug 2020",
      start: "2020-06",
      end: "2020-08",
      current: false,
      bullets: [
        "Built an internal admin dashboard API with Node.js and MongoDB",
      ],
    },
  ],
  education: [
    {
      degree: "B.S.",
      field: "Computer Science",
      institution: "University of Texas at Austin",
      dateText: "2017 – 2021",
    },
  ],
  projects: [
    {
      name: "queue-lite",
      description:
        "open-source job queue for Node.js backed by PostgreSQL (420 GitHub stars)",
      technologies: ["Node.js", "PostgreSQL"],
      link: null,
      bullets: [],
    },
  ],
  skills: [
    "Node.js",
    "TypeScript",
    "JavaScript",
    "Express",
    "PostgreSQL",
    "MongoDB",
    "Redis",
    "Docker",
    "AWS",
    "Terraform",
    "GitHub Actions",
    "Jest",
    "REST APIs",
    "Microservices",
  ],
  certifications: [],
};

export const backendRequirements = {
  title: "Backend Engineer (Node.js)",
  minYears: 3,
  requirements: [
    { text: "3+ years of backend development", kind: "must", skills: [] },
    { text: "Node.js and TypeScript", kind: "must", skills: ["node", "ts"] },
    {
      text: "Relational databases such as PostgreSQL or MySQL",
      kind: "must",
      skills: ["PostgreSQL", "MySQL"],
    },
    { text: "Kubernetes", kind: "nice", skills: ["k8s"] },
  ],
};

export const backendMatches = {
  matches: [
    {
      requirementId: "req_1",
      status: "met",
      evidence: [{ itemId: "exp_2", quote: "Software Engineer · Ledgerly" }],
      rationale: "Five years of backend roles.",
    },
    {
      requirementId: "req_2",
      status: "met",
      evidence: [
        {
          itemId: "exp_2.b1",
          quote: "REST APIs in Express and TypeScript",
        },
      ],
      rationale: "Node/TypeScript APIs in production.",
    },
    {
      requirementId: "req_3",
      status: "met",
      evidence: [
        {
          itemId: "exp_1.b2",
          quote: "Designed PostgreSQL schemas and partitioning",
        },
      ],
      rationale: "Designed PostgreSQL schemas.",
    },
    {
      // Hallucinated: there is no Kubernetes in the resume
      requirementId: "req_4",
      status: "partial",
      evidence: [
        { itemId: "exp_1.b3", quote: "deployed to Kubernetes clusters" },
      ],
      rationale: "Some container orchestration.",
    },
  ],
};

export const backendCritique = {
  summary:
    "Strong mid-level backend engineer with measurable impact; missing Kubernetes.",
  strengths: [
    {
      text: "Delivers measurable performance wins",
      evidence: [
        {
          itemId: "exp_1.b1",
          quote: "cutting p95 latency from 820ms to 190ms",
        },
      ],
    },
    {
      text: "Database design at scale",
      evidence: [
        { itemId: "exp_1.b2", quote: "40M tracking events per month" },
      ],
    },
    {
      text: "Led a team of 20 engineers",
      evidence: [
        { itemId: "exp_1.b4", quote: "managed a team of 20 engineers" },
      ],
    },
  ],
  gaps: [
    {
      text: "No Kubernetes experience shown",
      requirementId: "req_4",
      suggestion: "Deploy queue-lite on a local k3s cluster and describe it.",
    },
  ],
  rewrites: [
    {
      itemId: "exp_3.b1",
      after:
        "Built an internal admin dashboard API (Node.js, MongoDB) used by [N] operations staff",
      why: "Adds scale and audience.",
    },
  ],
  quickWins: ["Add a LinkedIn link."],
  interviewQuestions: [
    {
      question: "How did you decide where to split the monolith?",
      why: "Core of the most recent role.",
      evidence: [
        {
          itemId: "exp_1.b1",
          quote: "from a monolith to 6 Node.js microservices",
        },
      ],
    },
  ],
  learningPath: [
    {
      skill: "Kubernetes",
      why: "Listed as nice to have.",
      resource: "Kubernetes official tutorials",
    },
  ],
};

export const backendScreeningSummary = {
  summary:
    "[Candidate] meets every required backend skill with production evidence. Kubernetes is the main gap.",
  strengths: [
    {
      text: "Production Node.js microservices",
      evidence: [
        {
          itemId: "exp_1.b1",
          quote: "from a monolith to 6 Node.js microservices",
        },
      ],
    },
    {
      text: "Claims leadership of a large org",
      evidence: [{ itemId: "exp_1.b4", quote: "led an org of 40 engineers" }],
    },
  ],
  concerns: [
    { text: "No Kubernetes experience", requirementId: "req_4" },
    { text: "Unverifiable requirement id", requirementId: "req_99" },
  ],
  interviewProbes: [
    {
      question: "Walk through the PostgreSQL partitioning design.",
      evidence: [
        {
          itemId: "exp_1.b2",
          quote: "Designed PostgreSQL schemas and partitioning",
        },
      ],
    },
  ],
};
