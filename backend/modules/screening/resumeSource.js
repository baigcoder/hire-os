/**
 * Load an applicant's stored resume file for screening.
 *
 * Resume references come from user records, so this never fetches
 * arbitrary URLs (SSRF). Accepted:
 *   - { path }: an object in the private "resumes" bucket (current uploads)
 *   - a legacy Supabase storage URL of this project's "resumes" bucket
 *   - a Cloudinary URL over HTTPS
 * Supabase objects are read with the server's service-role client, so this
 * works with the bucket private. The file type is sniffed from its bytes.
 */
import axios from "axios";
import {
  RESUME_BUCKET,
  downloadPrivateFile,
  parseStorageUrl,
} from "../../utils/supabase.js";

const MAX_BYTES = 5 * 1024 * 1024;
const PDF = "application/pdf";
const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export class ResumeSourceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ResumeSourceError";
    this.code = code;
  }
}

const sniffMimetype = (buffer) => {
  if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") return PDF;
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return DOCX; // zip container
  return null;
};

const fromPrivateStorage = async (path) => {
  try {
    return await downloadPrivateFile(RESUME_BUCKET, path);
  } catch (error) {
    throw new ResumeSourceError(
      "DOWNLOAD_FAILED",
      `Could not download resume: ${error.message}`,
    );
  }
};

const fromCloudinary = async (url) => {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15_000,
      maxContentLength: MAX_BYTES,
      maxRedirects: 0,
    });
    return Buffer.from(response.data);
  } catch (error) {
    throw new ResumeSourceError(
      "DOWNLOAD_FAILED",
      `Could not download resume: ${error.message}`,
    );
  }
};

/**
 * @param {string | { path: string }} ref
 * @returns {Promise<{ buffer: Buffer, mimetype: string }>}
 */
export const fetchResumeFile = async (ref) => {
  let buffer;
  if (ref && typeof ref === "object" && ref.path) {
    buffer = await fromPrivateStorage(ref.path);
  } else {
    let parsed;
    try {
      parsed = new URL(ref);
    } catch {
      throw new ResumeSourceError("INVALID_URL", "Resume URL is invalid");
    }

    const stored = parseStorageUrl(parsed.href);
    if (stored) {
      if (stored.bucket !== RESUME_BUCKET) {
        throw new ResumeSourceError(
          "UNSUPPORTED_SOURCE",
          "Resume is not in the resumes bucket",
        );
      }
      buffer = await fromPrivateStorage(stored.path);
    } else if (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com"
    ) {
      buffer = await fromCloudinary(parsed.href);
    } else {
      throw new ResumeSourceError(
        "UNSUPPORTED_SOURCE",
        "Resume is stored somewhere screening can't read from",
      );
    }
  }

  if (buffer.length > MAX_BYTES) {
    throw new ResumeSourceError("TOO_LARGE", "Resume file is larger than 5 MB");
  }
  const mimetype = sniffMimetype(buffer);
  if (!mimetype) {
    throw new ResumeSourceError(
      "UNSUPPORTED_FORMAT",
      "Resume is not a PDF or DOCX file",
    );
  }
  return { buffer, mimetype };
};
