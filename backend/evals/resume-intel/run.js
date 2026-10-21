/**
 * Golden-set eval for the resume intelligence pipeline, against the real
 * AI gateway (Groq). Spends real tokens — run deliberately:
 *
 *   npm run eval:resume                 # all cases once
 *   npm run eval:resume -- --case backend-fits-backend --repeat 2
 *
 * For each case it checks:
 *   - requirement matching: every `met` keyword maps to a requirement judged
 *     met/partial; every `missing` keyword to one judged missing
 *   - the score falls in the expected range
 *   - grounding: how many LLM claims the verifier had to drop
 *   - expected flags (e.g. prompt injection) are raised
 *   - with --repeat N: the score is identical across runs
 * Results are written to evals/resume-intel/results/ (git-ignored).
 *
 * Fixture resumes are synthetic; add cases to cases.json as you collect
 * anonymized real ones.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ai from "../../platform/ai-gateway/index.js";
import { runResumePipeline } from "../../modules/resume-intel/pipeline.js";
import { extractResume } from "../../modules/resume-intel/extract.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.join(here, "fixtures", rel), "utf8");

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const onlyCase = argValue("--case");
const repeat = Math.max(1, Number(argValue("--repeat")) || 1);

// Best status among requirements whose text mentions the keyword
const statusFor = (keyword, result) => {
  const rank = { met: 2, partial: 1, missing: 0 };
  const reqs = (result.job?.requirements || []).filter((r) =>
    `${r.text} ${r.skills.join(" ")}`.toLowerCase().includes(keyword),
  );
  if (reqs.length === 0) return null;
  const statuses = reqs.map(
    (r) =>
      result.matches.find((m) => m.requirementId === r.id)?.status || "missing",
  );
  return statuses.sort((a, b) => rank[b] - rank[a])[0];
};

const evaluateCase = async (testCase) => {
  const { text, hash } = await extractResume({ text: read(testCase.resume) });
  const job = testCase.job
    ? { text: read(testCase.job), minYears: testCase.minYears ?? null }
    : null;

  const runs = [];
  for (let i = 0; i < repeat; i++) {
    const started = Date.now();
    const result = await runResumePipeline({ ai, text, textHash: hash, job });
    runs.push({ result, ms: Date.now() - started });
  }
  const { result } = runs[0];
  const checks = [];

  for (const keyword of testCase.expect.met) {
    const status = statusFor(keyword, result);
    checks.push({
      check: `met:${keyword}`,
      pass: status === "met" || status === "partial",
      detail: status ?? "no requirement mentions it",
    });
  }
  for (const keyword of testCase.expect.missing) {
    const status = statusFor(keyword, result);
    checks.push({
      check: `missing:${keyword}`,
      pass: status === "missing",
      detail: status ?? "no requirement mentions it",
    });
  }
  const [lo, hi] = testCase.expect.score;
  checks.push({
    check: "score-range",
    pass: result.score.overall >= lo && result.score.overall <= hi,
    detail: `${result.score.overall} (expected ${lo}–${hi})`,
  });
  for (const flag of testCase.expect.flags || []) {
    checks.push({
      check: `flag:${flag}`,
      pass: result.flags.some((f) => f.type === flag),
      detail: result.flags.map((f) => f.type).join(", ") || "none",
    });
  }
  if (repeat > 1) {
    const scores = runs.map((r) => r.result.score.overall);
    checks.push({
      check: "score-stable",
      pass: new Set(scores).size === 1,
      detail: scores.join(" / "),
    });
  }

  return {
    id: testCase.id,
    score: result.score.overall,
    band: result.score.band,
    grounding: result.grounding,
    degraded: result.degraded,
    models: result.models,
    ms: runs.map((r) => r.ms),
    checks,
    passed: checks.every((c) => c.pass),
  };
};

const main = async () => {
  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
    console.error(
      "Set GROQ_API_KEY (and optionally GEMINI_API_KEY) to run the eval.",
    );
    process.exit(2);
  }

  const cases = JSON.parse(
    fs.readFileSync(path.join(here, "cases.json"), "utf8"),
  ).filter((c) => !onlyCase || c.id === onlyCase);
  const results = [];
  for (const testCase of cases) {
    process.stdout.write(`▶ ${testCase.id} … `);
    try {
      const r = await evaluateCase(testCase);
      results.push(r);
      const failed = r.checks.filter((c) => !c.pass);
      console.log(
        `${r.passed ? "PASS" : "FAIL"}  score ${r.score} (${r.band})  dropped ${r.grounding.dropped}/${r.grounding.checked}  downgrades ${r.grounding.matchDowngrades}${r.degraded ? "  [degraded]" : ""}`,
      );
      failed.forEach((c) => console.log(`    ✗ ${c.check}: ${c.detail}`));
    } catch (error) {
      results.push({ id: testCase.id, passed: false, error: error.message });
      console.log(`ERROR  ${error.message}`);
    }
  }

  const checks = results.flatMap((r) => r.checks || []);
  const summary = {
    cases: results.length,
    casesPassed: results.filter((r) => r.passed).length,
    checks: checks.length,
    checksPassed: checks.filter((c) => c.pass).length,
    groundingDropped: results.reduce(
      (s, r) => s + (r.grounding?.dropped || 0),
      0,
    ),
  };
  console.log(
    `\n${summary.casesPassed}/${summary.cases} cases, ${summary.checksPassed}/${summary.checks} checks, ${summary.groundingDropped} ungrounded claims dropped`,
  );

  const outDir = path.join(here, "results");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(
    outDir,
    `${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  fs.writeFileSync(outFile, JSON.stringify({ summary, results }, null, 2));
  console.log(`Results: ${path.relative(process.cwd(), outFile)}`);
  process.exit(summary.casesPassed === summary.cases ? 0 : 1);
};

main();
