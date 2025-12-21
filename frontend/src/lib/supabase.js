import { createClient } from "@supabase/supabase-js";

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase credentials not found. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file",
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

// Auth helper functions
export const supabaseAuth = {
  // Sign up with email and password
  signUp: async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  },

  // Sign in with email and password
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Sign in with Google OAuth
  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    return { data, error };
  },

  // Send OTP to email
  sendOTP: async (email) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  },

  // Verify OTP
  verifyOTP: async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    return { data, error };
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current session
  getSession: async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    return { session, error };
  },

  // Get current user
  getUser: async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return { user, error };
  },

  // Reset password
  resetPassword: async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  },

  // Update password
  updatePassword: async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },

  // Update user metadata
  updateUser: async (updates) => {
    const { data, error } = await supabase.auth.updateUser(updates);
    return { data, error };
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Storage helper functions
export const supabaseStorage = {
  // Upload file to storage bucket
  uploadFile: async (bucket, path, file, options = {}) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        ...options,
      });
    return { data, error };
  },

  // Upload resume/CV
  uploadResume: async (userId, file) => {
    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/resume_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("resumes")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (error) return { data: null, error };

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("resumes").getPublicUrl(fileName);

    return {
      data: {
        path: fileName,
        url: publicUrl,
        originalName: file.name,
      },
      error: null,
    };
  },

  // Upload profile photo
  uploadProfilePhoto: async (userId, file) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/avatar_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (error) return { data: null, error };

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    return { data: { path: fileName, url: publicUrl }, error: null };
  },

  // Delete file from storage
  deleteFile: async (bucket, path) => {
    const { data, error } = await supabase.storage.from(bucket).remove([path]);
    return { data, error };
  },

  // Get file URL
  getFileUrl: (bucket, path) => {
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  },

  // List files in a folder
  listFiles: async (bucket, folder) => {
    const { data, error } = await supabase.storage.from(bucket).list(folder);
    return { data, error };
  },
};

// ========== REALTIME HELPERS ==========

/**
 * Realtime channel management and broadcasting
 */
export const supabaseRealtime = {
  /**
   * Create and subscribe to a channel
   * @param {string} channelName - Unique channel name
   * @param {object} config - Channel configuration
   * @returns {RealtimeChannel} - Supabase channel instance
   */
  createChannel: (channelName, config = {}) => {
    return supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ...config.broadcast },
        presence: config.presence || {},
      },
    });
  },

  /**
   * Subscribe to a channel with event handlers
   * @param {string} channelName - Channel name
   * @param {object} handlers - Event handlers { onBroadcast, onPresence, onSubscribe }
   */
  subscribe: (channelName, handlers = {}) => {
    const channel = supabase.channel(channelName);

    if (handlers.onBroadcast) {
      Object.entries(handlers.onBroadcast).forEach(([event, handler]) => {
        channel.on("broadcast", { event }, ({ payload }) => handler(payload));
      });
    }

    if (handlers.onPresence) {
      if (handlers.onPresence.onSync) {
        channel.on("presence", { event: "sync" }, () => {
          handlers.onPresence.onSync(channel.presenceState());
        });
      }
      if (handlers.onPresence.onJoin) {
        channel.on("presence", { event: "join" }, handlers.onPresence.onJoin);
      }
      if (handlers.onPresence.onLeave) {
        channel.on("presence", { event: "leave" }, handlers.onPresence.onLeave);
      }
    }

    channel.subscribe((status) => {
      if (handlers.onSubscribe) handlers.onSubscribe(status);
    });

    return channel;
  },

  /**
   * Broadcast a message to a channel
   * @param {string} channelName - Channel name
   * @param {string} event - Event name
   * @param {object} payload - Data to broadcast
   */
  broadcast: async (channelName, event, payload) => {
    const channel = supabase.channel(channelName);
    await channel.subscribe();
    await channel.send({
      type: "broadcast",
      event,
      payload: { ...payload, timestamp: new Date().toISOString() },
    });
    return channel;
  },

  /**
   * Track presence in a channel
   * @param {RealtimeChannel} channel - Channel instance
   * @param {object} presenceData - User presence data
   */
  trackPresence: async (channel, presenceData) => {
    await channel.track(presenceData);
  },

  /**
   * Get all channels
   */
  getChannels: () => supabase.getChannels(),

  /**
   * Remove a channel
   */
  removeChannel: (channel) => supabase.removeChannel(channel),

  /**
   * Remove all channels
   */
  removeAllChannels: () => supabase.removeAllChannels(),
};

export default supabase;
