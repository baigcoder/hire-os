/**
 * Stage 8: grounding verifier. Every claim the LLM makes about the resume
 * must cite an item ID that exists and quote text that is actually in that
 * item. Anything that fails is dropped (and counted), so hallucinated
 * experience never reaches the user.
 */

const normalize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#%$ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (text) => normalize(text).split(" ").filter(Boolean);

/** True if `quote` appears in `source` (normalized), or ≥80% of its words do. */
export const quoteIsGrounded = (quote, source) => {
  const q = normalize(quote);
  if (q.length < 3) return false;
  const s = normalize(source);
  if (s.includes(q)) return true;
  const sourceTokens = new Set(tokens(source));
  const quoteTokens = tokens(quote);
  const hits = quoteTokens.filter((t) => sourceTokens.has(t)).length;
  return quoteTokens.length >= 3 && hits / quoteTokens.length >= 0.8;
};

/** Keep only evidence whose itemId exists and whose quote is in that item. */
export const verifyEvidence = (evidence, items) =>
  (evidence || []).filter((e) => {
    const item = items.get(e.itemId);
    return item && quoteIsGrounded(e.quote, item.text);
  });

/**
 * Verify requirement matches. A "met"/"partial" claim with no surviving
 * evidence is downgraded to "missing". Unknown requirement IDs are dropped,
 * and requirements the model skipped are added as "missing".
 */
export const verifyMatches = (matches, requirements, items) => {
  const known = new Set(requirements.map((r) => r.id));
  const byId = new Map();
  let downgraded = 0;
  for (const m of matches) {
    if (!known.has(m.requirementId) || byId.has(m.requirementId)) continue;
    const evidence = verifyEvidence(m.evidence, items);
    let status = m.status;
    if (status !== "missing" && evidence.length === 0) {
      status = "missing";
      downgraded++;
    }
    byId.set(m.requirementId, {
      requirementId: m.requirementId,
      status,
      evidence,
      // The model's rationale argued for the rejected status, so don't show it
      rationale:
        status !== m.status
          ? "No evidence for this could be verified in the resume."
          : m.rationale,
      ...(status !== m.status && { downgradedFrom: m.status }),
    });
  }
  const verified = requirements.map(
    (r) =>
      byId.get(r.id) || {
        requirementId: r.id,
        status: "missing",
        evidence: [],
        rationale: "Not assessed.",
      },
  );
  return { matches: verified, downgraded };
};

/**
 * Verify critic output. Returns the cleaned critique plus how many claims
 * were dropped, so the pipeline can retry if too much was ungrounded.
 */
export const verifyCritique = (critique, items, requirements = []) => {
  const requirementIds = new Set(requirements.map((r) => r.id));
  let checked = 0;
  let dropped = 0;

  const strengths = critique.strengths
    .map((s) => {
      checked++;
      const evidence = verifyEvidence(s.evidence, items);
      if (evidence.length === 0) {
        dropped++;
        return null;
      }
      return { ...s, evidence };
    })
    .filter(Boolean);

  const interviewQuestions = critique.interviewQuestions.map((q) => ({
    ...q,
    evidence: verifyEvidence(q.evidence, items),
  }));

  const rewrites = critique.rewrites
    .map((r) => {
      checked++;
      const item = items.get(r.itemId);
      if (!item || item.kind !== "bullet" || !r.after?.trim()) {
        dropped++;
        return null;
      }
      // "before" always comes from the resume, never from the model
      return {
        itemId: r.itemId,
        before: item.text,
        after: r.after.trim(),
        why: r.why,
      };
    })
    .filter(Boolean);

  const gaps = critique.gaps.map((g) => ({
    ...g,
    requirementId:
      g.requirementId && requirementIds.has(g.requirementId)
        ? g.requirementId
        : null,
  }));

  return {
    critique: {
      summary: critique.summary,
      strengths: strengths.slice(0, 6),
      gaps: gaps.slice(0, 6),
      rewrites: rewrites.slice(0, 6),
      quickWins: critique.quickWins.slice(0, 5),
      interviewQuestions: interviewQuestions.slice(0, 5),
      learningPath: critique.learningPath.slice(0, 5),
    },
    checked,
    dropped,
  };
};
