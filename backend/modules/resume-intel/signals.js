/**
 * Stage 4: deterministic signals computed from the structured profile and
 * raw text. No LLM: these are reproducible and unit-tested, and they drive
 * the score.
 */
import { monthsBetween, summarizeIntervals } from "./dates.js";
import { findSkillsInText, normalizeSkills } from "./taxonomy.js";

const ACTION_VERBS = new Set(
  `accelerated achieved added analyzed architected automated boosted built championed coached collaborated configured consolidated created cut debugged decreased delivered deployed designed developed directed drove eliminated enabled engineered enhanced established expanded facilitated founded generated grew guided implemented improved increased initiated integrated introduced launched led maintained managed mentored migrated modernized monitored negotiated optimized orchestrated organized overhauled owned pioneered planned produced programmed published raised redesigned reduced refactored released resolved restructured revamped saved scaled shipped simplified spearheaded standardized streamlined strengthened supervised tested trained transformed tripled troubleshot unified upgraded wrote`.split(
    /\s+/,
  ),
);

const QUANTIFIED =
  /(\d+(\.\d+)?\s?%|[$€£₹]\s?\d|\b\d+(\.\d+)?\s?(x|k|m|mm|bn|million|billion|users|customers|clients|ms|seconds|hours|days|weeks|requests|transactions|downloads|stars)\b|\b\d{2,}\b)/i;

export const isQuantified = (text) => QUANTIFIED.test(text);

export const startsWithActionVerb = (text) => {
  const first = String(text)
    .replace(/^[•\-*–\s]+/, "")
    .split(/\s+/)[0]
    ?.toLowerCase()
    .replace(/[^a-z]/g, "");
  return Boolean(first) && ACTION_VERBS.has(first);
};

const allBullets = (profile) => [
  ...profile.experience.flatMap((r) => r.bullets),
  ...profile.projects.flatMap((p) => p.bullets),
];

const SECTION_HEADINGS = {
  experience: /^(work |professional )?experience|employment|work history/im,
  education: /^education|academic/im,
  skills: /^(technical )?skills|technologies|tech stack|competencies/im,
  projects: /^projects?|portfolio/im,
  summary: /^(professional )?summary|profile|objective|about me/im,
};

export const computeSignals = (profile, text, { now = new Date() } = {}) => {
  // Experience from parsed dates
  const roles = profile.experience.map((role) => ({
    id: role.id,
    months: role.start ? monthsBetween(role.start, role.end, now) : null,
  }));
  const { totalMonths, gaps } = summarizeIntervals(profile.experience, {
    now,
  });
  const datedRoles = roles.filter((r) => r.months !== null).length;

  // Impact
  const bullets = allBullets(profile);
  const quantified = bullets.filter((b) => isQuantified(b.text));
  const action = bullets.filter((b) => startsWithActionVerb(b.text));
  const impact = {
    bullets: bullets.length,
    quantified: quantified.length,
    actionVerbs: action.length,
    quantifiedRatio: bullets.length ? quantified.length / bullets.length : 0,
    actionRatio: bullets.length ? action.length / bullets.length : 0,
    unquantifiedBulletIds: bullets
      .filter((b) => !isQuantified(b.text))
      .map((b) => b.id),
  };

  // Skills with evidence: listed skills plus skills used in roles/projects
  const evidence = new Map(); // canonical -> Set(itemId)
  const addEvidence = (canonical, id) => {
    if (!evidence.has(canonical)) evidence.set(canonical, new Set());
    if (id) evidence.get(canonical).add(id);
  };
  for (const role of profile.experience) {
    const roleText = [role.title, ...role.bullets.map((b) => b.text)].join(
      "\n",
    );
    for (const s of findSkillsInText(roleText))
      addEvidence(s.canonical, role.id);
  }
  for (const project of profile.projects) {
    const projectText = [
      project.name,
      project.description,
      project.technologies.join(", "),
      ...project.bullets.map((b) => b.text),
    ].join("\n");
    for (const s of normalizeSkills(project.technologies)) {
      addEvidence(s.canonical, project.id);
    }
    for (const s of findSkillsInText(projectText)) {
      addEvidence(s.canonical, project.id);
    }
  }
  const listed = normalizeSkills(profile.skills);
  for (const s of listed) addEvidence(s.canonical, null);
  const skills = normalizeSkills([...evidence.keys()]).map((s) => ({
    name: s.canonical,
    family: s.family,
    listed: listed.some((l) => l.canonical === s.canonical),
    evidence: [...(evidence.get(s.canonical) || [])],
  }));

  // ATS checklist
  const words = (text.match(/\S+/g) || []).length;
  const lowerText = text.toLowerCase();
  const checks = [
    {
      id: "email",
      label: "Email address",
      passed: Boolean(profile.contact.email) || /\S+@\S+\.\S+/.test(text),
    },
    {
      id: "phone",
      label: "Phone number",
      passed:
        Boolean(profile.contact.phone) || /\+?\d[\d\s().-]{7,}\d/.test(text),
    },
    {
      id: "links",
      label: "LinkedIn, GitHub or portfolio link",
      passed:
        profile.contact.links.length > 0 ||
        /(linkedin\.com|github\.com|gitlab\.com|behance\.net|https?:\/\/)/.test(
          lowerText,
        ),
    },
    {
      id: "summary",
      label: "Professional summary",
      passed: Boolean(profile.summary) || SECTION_HEADINGS.summary.test(text),
    },
    {
      id: "experience",
      label: "Experience or projects section",
      passed: profile.experience.length > 0 || profile.projects.length > 0,
    },
    {
      id: "education",
      label: "Education section",
      passed: profile.education.length > 0,
    },
    {
      id: "skills",
      label: "Skills section",
      passed: profile.skills.length >= 3,
    },
    {
      id: "dates",
      label: "Dates on every role",
      passed:
        profile.experience.length === 0 ||
        datedRoles === profile.experience.length,
      detail:
        profile.experience.length > 0
          ? `${datedRoles}/${profile.experience.length} roles have readable dates`
          : undefined,
    },
    {
      id: "bullets",
      label: "At least 6 achievement bullets",
      passed: bullets.length >= 6,
      detail: `${bullets.length} bullets`,
    },
    {
      id: "length",
      label: "Length between 250 and 1,100 words",
      passed: words >= 250 && words <= 1100,
      detail: `${words} words`,
    },
  ];

  return {
    experience: {
      totalMonths,
      years: Math.round((totalMonths / 12) * 10) / 10,
      roles,
      gaps,
    },
    impact,
    skills,
    ats: {
      checks,
      passed: checks.filter((c) => c.passed).length,
      total: checks.length,
    },
    words,
  };
};
