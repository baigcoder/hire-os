/**
 * Structured-output schemas for the LLM stages. These go to Groq as strict
 * JSON Schema, so every field is required — "may be absent" is .nullable().
 * Array lengths are steered in the prompts and trimmed in code, because
 * strict mode doesn't guarantee minItems/maxItems support.
 */
import { z } from "zod";

const nullableString = z.string().nullable();

export const ProfileExtractionSchema = z.object({
  contact: z.object({
    name: nullableString,
    email: nullableString,
    phone: nullableString,
    location: nullableString,
    links: z.array(z.string()),
  }),
  summary: nullableString,
  experience: z.array(
    z.object({
      title: z.string(),
      company: nullableString,
      location: nullableString,
      dateText: nullableString,
      start: nullableString,
      end: nullableString,
      current: z.boolean(),
      bullets: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      degree: nullableString,
      field: nullableString,
      institution: nullableString,
      dateText: nullableString,
    }),
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: nullableString,
      technologies: z.array(z.string()),
      link: nullableString,
      bullets: z.array(z.string()),
    }),
  ),
  skills: z.array(z.string()),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: nullableString,
      year: nullableString,
    }),
  ),
});

export const RequirementsSchema = z.object({
  title: nullableString,
  minYears: z.number().nullable(),
  requirements: z.array(
    z.object({
      text: z.string(),
      kind: z.enum(["must", "nice"]),
      skills: z.array(z.string()),
    }),
  ),
});

const EvidenceSchema = z.object({
  itemId: z.string(),
  quote: z.string(),
});

export const MatchSchema = z.object({
  matches: z.array(
    z.object({
      requirementId: z.string(),
      status: z.enum(["met", "partial", "missing"]),
      evidence: z.array(EvidenceSchema),
      rationale: z.string(),
    }),
  ),
});

export const CriticSchema = z.object({
  summary: z.string(),
  strengths: z.array(
    z.object({ text: z.string(), evidence: z.array(EvidenceSchema) }),
  ),
  gaps: z.array(
    z.object({
      text: z.string(),
      requirementId: nullableString,
      suggestion: z.string(),
    }),
  ),
  rewrites: z.array(
    z.object({ itemId: z.string(), after: z.string(), why: z.string() }),
  ),
  quickWins: z.array(z.string()),
  interviewQuestions: z.array(
    z.object({
      question: z.string(),
      why: z.string(),
      evidence: z.array(EvidenceSchema),
    }),
  ),
  learningPath: z.array(
    z.object({ skill: z.string(), why: z.string(), resource: z.string() }),
  ),
});
