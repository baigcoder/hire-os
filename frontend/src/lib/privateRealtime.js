/**
 * A Realtime-only Supabase client for private channels, authorized with a
 * short-lived token minted by our API (see backend/platform/realtime).
 *
 * Kept separate from the shared `supabase` client on purpose: that one owns
 * Supabase Auth sessions (Google sign-in) and would overwrite this token on
 * its own refreshes. The token is refreshed a minute before it expires and
 * pushed to every joined channel.
 */
import { createClient } from "@supabase/supabase-js";

const REFRESH_EARLY_MS = 60_000;
const RETRY_MS = 15_000;

/**
 * @param {{ initial: {token: string, expiresAt: string}, fetchToken: () => Promise<{token: string, expiresAt: string}> }} options
 */
export const createPrivateRealtime = ({ initial, fetchToken }) => {
  let current = initial;
  let timer;
  let stopped = false;

  const client = createClient(import.meta.env.VITE_SUPABASE_URL || "", import.meta.env.VITE_SUPABASE_ANON_KEY || "", {
    accessToken: async () => current?.token ?? null,
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const schedule = () => {
    clearTimeout(timer);
    if (stopped || !current?.expiresAt) return;
    const wait = Math.max(5_000, new Date(current.expiresAt).getTime() - Date.now() - REFRESH_EARLY_MS);
    timer = setTimeout(refresh, wait);
  };

  const refresh = async () => {
    try {
      const next = await fetchToken();
      if (stopped || !next?.token) return;
      current = next;
      await client.realtime.setAuth(); // re-reads accessToken() for joined channels
      schedule();
    } catch {
      if (!stopped) timer = setTimeout(refresh, RETRY_MS);
    }
  };

  schedule();

  return {
    client,
    stop: () => {
      stopped = true;
      clearTimeout(timer);
      client.removeAllChannels();
      client.realtime.disconnect();
    },
  };
};
