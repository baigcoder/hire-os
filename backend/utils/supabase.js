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
        upload: async () => ({ data: null, error: new Error("Supabase not configured") }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => { } }),
      subscribe: () => { },
      unsubscribe: () => { },
    }),
  };
}

export const uploadFileToSupabase = async (file, bucket, folder = "") => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials not configured");
  }

  try {
    const timestamp = Date.now();
    const fileExtension = file.originalname.split(".").pop();
    const fileName = `${folder ? folder + "/" : ""}${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);

    return {
      publicUrl,
      fileName: file.originalname,
    };
  } catch (error) {
    console.error("Error in uploadFileToSupabase:", error);
    throw error;
  }
};

export default supabase;

