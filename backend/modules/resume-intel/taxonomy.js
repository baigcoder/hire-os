/**
 * Skill taxonomy: canonical names, aliases and families.
 *
 * Normalizing "ReactJS", "react.js" and "React" to one skill makes matching
 * and gap lists consistent; families let "PostgreSQL" count as partial
 * evidence for a "relational databases" style requirement.
 */

// family -> [[canonical, ...aliases]]
const CATALOG = {
  language: [
    ["JavaScript", "js", "ecmascript", "es6"],
    ["TypeScript", "ts"],
    ["Python", "py"],
    ["Java"],
    ["C++", "cpp"],
    ["C#", "csharp", "c sharp"],
    ["C"],
    ["Go", "golang"],
    ["Rust"],
    ["Ruby"],
    ["PHP"],
    ["Swift"],
    ["Kotlin"],
    ["Scala"],
    ["R"],
    ["Dart"],
    ["SQL"],
    ["Bash", "shell", "shell scripting"],
  ],
  frontend: [
    ["React", "reactjs", "react.js"],
    ["Next.js", "nextjs", "next"],
    ["Vue", "vuejs", "vue.js"],
    ["Angular", "angularjs"],
    ["Svelte", "sveltekit"],
    ["HTML", "html5"],
    ["CSS", "css3"],
    ["Tailwind CSS", "tailwind", "tailwindcss"],
    ["Redux", "redux toolkit"],
    ["Sass", "scss"],
  ],
  backend: [
    ["Node.js", "node", "nodejs"],
    ["Express", "express.js", "expressjs"],
    ["NestJS", "nest.js"],
    ["Django"],
    ["Flask"],
    ["FastAPI"],
    ["Spring Boot", "spring"],
    ["Laravel"],
    ["Ruby on Rails", "rails"],
    ["ASP.NET", ".net", "dotnet", ".net core"],
    ["GraphQL"],
    ["REST APIs", "rest", "restful", "rest api", "restful apis"],
    ["gRPC"],
    ["Microservices", "microservice"],
  ],
  database: [
    ["PostgreSQL", "postgres", "psql"],
    ["MySQL"],
    ["SQLite"],
    ["SQL Server", "mssql"],
    ["Oracle Database", "oracle"],
    ["MongoDB", "mongo", "mongoose"],
    ["Redis"],
    ["DynamoDB"],
    ["Cassandra"],
    ["Elasticsearch", "elastic search", "opensearch"],
    ["Firebase", "firestore"],
    ["Supabase"],
  ],
  cloud: [
    ["AWS", "amazon web services"],
    ["Azure", "microsoft azure"],
    ["GCP", "google cloud", "google cloud platform"],
    ["Vercel"],
    ["Heroku"],
  ],
  devops: [
    ["Docker", "containers"],
    ["Kubernetes", "k8s"],
    ["Terraform"],
    ["CI/CD", "ci cd", "continuous integration"],
    ["GitHub Actions"],
    ["Jenkins"],
    ["Linux"],
    ["Nginx"],
    ["Git", "github", "gitlab", "version control"],
  ],
  data: [
    ["Pandas"],
    ["NumPy", "numpy"],
    ["Spark", "apache spark", "pyspark"],
    ["Airflow", "apache airflow"],
    ["Power BI", "powerbi"],
    ["Tableau"],
    ["Excel", "microsoft excel"],
    ["ETL"],
    ["Data Analysis", "data analytics"],
  ],
  ml: [
    ["Machine Learning", "ml"],
    ["Deep Learning", "dl"],
    ["PyTorch", "torch"],
    ["TensorFlow", "tf", "keras"],
    ["scikit-learn", "sklearn", "scikit learn"],
    ["NLP", "natural language processing"],
    ["Computer Vision", "cv", "opencv"],
    ["LLMs", "llm", "large language models", "generative ai", "genai"],
    ["LangChain"],
  ],
  mobile: [["React Native"], ["Flutter"], ["Android"], ["iOS"]],
  testing: [
    ["Jest"],
    ["Cypress"],
    ["Playwright"],
    ["Selenium"],
    ["Unit Testing", "unit tests", "tdd", "test driven development"],
  ],
  practice: [
    ["Agile", "scrum", "kanban"],
    ["System Design"],
    ["Data Structures", "algorithms", "dsa", "data structures and algorithms"],
    ["OOP", "object oriented programming", "object-oriented programming"],
  ],
  design: [["Figma"], ["UI/UX", "ui ux", "ux design", "ui design"]],
};

const key = (value) =>
  String(value).toLowerCase().replace(/[_]/g, " ").replace(/\s+/g, " ").trim();

const INDEX = new Map(); // alias key -> { canonical, family }
for (const [family, entries] of Object.entries(CATALOG)) {
  for (const [canonical, ...aliases] of entries) {
    for (const name of [canonical, ...aliases]) {
      INDEX.set(key(name), { canonical, family });
    }
  }
}

/** Normalize a free-text skill. Unknown skills keep their own name. */
export const normalizeSkill = (raw) => {
  const k = key(raw);
  if (!k) return null;
  return INDEX.get(k) || { canonical: String(raw).trim(), family: null };
};

/** Normalize and de-duplicate a list of skills. */
export const normalizeSkills = (list = []) => {
  const seen = new Map();
  for (const raw of list) {
    const skill = normalizeSkill(raw);
    if (skill && !seen.has(skill.canonical.toLowerCase())) {
      seen.set(skill.canonical.toLowerCase(), skill);
    }
  }
  return [...seen.values()];
};

/**
 * Find catalog skills mentioned in free text (word-boundary match on every
 * alias). Used to attach evidence to items and as a cross-check on the LLM.
 */
export const findSkillsInText = (text) => {
  const lower = ` ${String(text).toLowerCase()} `;
  const found = new Map();
  for (const [alias, skill] of INDEX.entries()) {
    // Very short aliases ("c", "r", "go", "ts", "ml") are too ambiguous in prose
    if (alias.length < 3 && !["c#", "go"].includes(alias)) continue;
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^a-z0-9+#.])${escaped}(?=$|[^a-z0-9+#])`, "i");
    if (re.test(lower)) found.set(skill.canonical, skill);
  }
  return [...found.values()];
};

export const skillFamily = (canonical) =>
  INDEX.get(key(canonical))?.family ?? null;
