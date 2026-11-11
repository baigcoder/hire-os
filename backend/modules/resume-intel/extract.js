import crypto from "crypto";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export const MAX_ANALYZED_CHARS = 15_000;
const MIN_CHARS = 200;

export class ExtractionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ExtractionError";
    this.code = code;
  }
}

const PDF = "application/pdf";
const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const SUPPORTED_MIME_TYPES = [PDF, DOCX];

/**
 * Normalize extracted text while keeping line structure (bullets and section
 * headings matter to the later stages): strip control characters, collapse
 * runs of spaces, trim lines, cap blank lines.
 */
export const normalizeText = (text) =>
  String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F​-‍﻿]/g, " ")
    .replace(/[•▪●◦■►✓➢]/g, "•")
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// A DOCX is a ZIP: a few KB can declare gigabytes of XML. Read the central directory and
// refuse archives whose declared uncompressed size or entry count is implausible for a
// resume, before anything is inflated.
const MAX_ZIP_ENTRIES = 1000;
const MAX_ZIP_UNCOMPRESSED = 30 * 1024 * 1024;

export const assertSafeZip = (buf) => {
  const bad = () => new ExtractionError("UNREADABLE_FILE", "This Word document is too large or malformed to read.");
  const searchFrom = Math.max(0, buf.length - 65557);
  let eocd = -1;
  for (let i = buf.length - 22; i >= searchFrom; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw bad();
  const cdSize = buf.readUInt32LE(eocd + 12);
  const cdStart = buf.readUInt32LE(eocd + 16);
  if (cdStart === 0xffffffff || cdStart + cdSize > buf.length) throw bad();
  // Walk records until the signature stops matching, as a ZIP reader would, instead of
  // trusting the declared entry count (a lying count could hide later records).
  let off = cdStart;
  let n = 0;
  let total = 0;
  while (off + 46 <= buf.length && buf.readUInt32LE(off) === 0x02014b50) {
    if (++n > MAX_ZIP_ENTRIES) throw bad();
    const size = buf.readUInt32LE(off + 24);
    if (size === 0xffffffff) throw bad(); // zip64: not a resume
    total += size;
    if (total > MAX_ZIP_UNCOMPRESSED) throw bad();
    off += 46 + buf.readUInt16LE(off + 28) + buf.readUInt16LE(off + 30) + buf.readUInt16LE(off + 32);
  }
  if (n === 0 || off !== cdStart + cdSize) throw bad();
};

export const hashText = (text) =>
  crypto.createHash("sha256").update(text).digest("hex");

/**
 * Turn an uploaded file (or pasted text) into analyzable text.
 * Returns { text, format, pages, chars, truncated, warnings, hash }.
 */
export const extractResume = async ({ buffer, mimetype, text: pasted }) => {
  let raw;
  let format;
  let pages = null;

  if (typeof pasted === "string") {
    raw = pasted;
    format = "text";
  } else if (mimetype === PDF) {
    format = "pdf";
    try {
      const pdf = await pdfParse(buffer, { max: 30 }); // page cap: bounds parse time and memory
      raw = pdf.text;
      pages = pdf.numpages || null;
    } catch {
      throw new ExtractionError(
        "UNREADABLE_FILE",
        "Could not read this PDF. Make sure it isn't password-protected or corrupted.",
      );
    }
  } else if (mimetype === DOCX) {
    format = "docx";
    assertSafeZip(buffer); // throws ExtractionError before mammoth inflates anything
    try {
      raw = (await mammoth.extractRawText({ buffer })).value;
    } catch {
      throw new ExtractionError(
        "UNREADABLE_FILE",
        "Could not read this Word document.",
      );
    }
  } else {
    throw new ExtractionError(
      "UNSUPPORTED_FORMAT",
      "Upload a PDF or DOCX resume, or paste the text.",
    );
  }

  const normalized = normalizeText(raw);
  if (normalized.length < MIN_CHARS) {
    throw new ExtractionError(
      format === "pdf" ? "NO_TEXT_LAYER" : "TOO_SHORT",
      format === "pdf"
        ? "This PDF has almost no selectable text — it may be a scanned image. Export it from your editor as a text PDF, or paste the text."
        : "The resume is too short to analyze.",
    );
  }

  const warnings = [];
  if (pages && pages > 2) {
    warnings.push(
      `Your resume is ${pages} pages. Most recruiters and ATS screens favour 1–2 pages.`,
    );
  }

  const truncated = normalized.length > MAX_ANALYZED_CHARS;
  const text = truncated ? normalized.slice(0, MAX_ANALYZED_CHARS) : normalized;
  if (truncated) {
    warnings.push(
      `Only the first ${MAX_ANALYZED_CHARS.toLocaleString()} characters were analyzed; the rest of the resume was ignored.`,
    );
  }

  return {
    text,
    format,
    pages,
    chars: normalized.length,
    truncated,
    warnings,
    hash: hashText(text),
  };
};
