import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl =
  process.env.VITE_SUPABASE_URL || "https://bsxhzhvgerdpdohtervp.supabase.co";
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

// Warn if credentials are missing
if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "⚠️ Supabase credentials missing in backend. File uploads may fail.",
  );
}

// Create client only if credentials are available (prevents test failures)
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  // Mock client for testing or when credentials are missing
  supabase = {
    storage: {
      from: () => ({
        upload: async () => ({
          data: null,
          error: new Error("Supabase not configured"),
        }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
      unsubscribe: () => {},
    }),
  };
}

// ═══════════════════════════════════════════════════════════════
// PRIVATE STORAGE (resumes)
// Private buckets are only reachable with the service-role key, which must
// stay server-side. Files are referenced by bucket path and handed out as
// short-lived signed URLs after an authorization check.
// ═══════════════════════════════════════════════════════════════

export const RESUME_BUCKET = "resumes";

let storageAdmin;
const getStorageAdmin = () => {
  if (storageAdmin === undefined) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    storageAdmin =
      supabaseUrl && serviceKey
        ? createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          }).storage
        : null;
  }
  if (!storageAdmin) {
    throw new Error(
      "Private file storage needs SUPABASE_SERVICE_ROLE_KEY on the server",
    );
  }
  return storageAdmin;
};

/** Test seam: swap in a fake storage client (null restores the default). */
export const setStorageAdminForTests = (storage) => {
  storageAdmin = storage ?? undefined;
};

/** Upload to a private bucket. Returns the object path (not a URL). */
export const uploadPrivateFile = async (file, bucket, folder) => {
  const extension = (file.originalname.split(".").pop() || "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const { error } = await getStorageAdmin()
    .from(bucket)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  return { path };
};

/** Short-lived signed URL for a private object. */
export const createSignedFileUrl = async (
  bucket,
  path,
  { expiresIn = 60, downloadName } = {},
) => {
  const { data, error } = await getStorageAdmin()
    .from(bucket)
    .createSignedUrl(
      path,
      expiresIn,
      downloadName ? { download: downloadName } : undefined,
    );
  if (error || !data?.signedUrl) {
    throw new Error(`Could not sign file URL: ${error?.message || "no URL"}`);
  }
  return data.signedUrl;
};

/** Download a private object as a Buffer. */
export const downloadPrivateFile = async (bucket, path) => {
  const { data, error } = await getStorageAdmin().from(bucket).download(path);
  if (error || !data) {
    throw new Error(`Could not download file: ${error?.message || "no data"}`);
  }
  return Buffer.from(await data.arrayBuffer());
};

/**
 * Parse a Supabase storage URL of this project (public, signed or
 * authenticated form) into { bucket, path }, or null. Used to migrate
 * legacy public resume URLs.
 */
export const parseStorageUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (!supabaseUrl || parsed.origin !== new URL(supabaseUrl).origin)
      return null;
    const match = parsed.pathname.match(
      /^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/,
    );
    return match
      ? { bucket: match[1], path: decodeURIComponent(match[2]) }
      : null;
  } catch {
    return null;
  }
};

export { supabaseUrl };
export default supabase;
