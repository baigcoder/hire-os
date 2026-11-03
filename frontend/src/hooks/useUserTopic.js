/**
 * Subscribe to the signed-in user's own notification topic ("user:<id>").
 * The API pushes to it (e.g. "a candidate is waiting"); with private
 * channels enabled no one else can read it, and clients can't send on it.
 */
import { useEffect, useRef } from "react";
import api from "@/utils/api";
import { supabase } from "@/lib/supabase";
import { createPrivateRealtime } from "@/lib/privateRealtime";

const fetchToken = () => api.get("/realtime/token").then((r) => r.data.realtime);

/**
 * @param {string|undefined} userId
 * @param {Object<string, (payload: any) => void>} handlers broadcast event → handler
 */
export const useUserTopic = (userId, handlers) => {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    let cleanup = () => {};

    fetchToken()
      .catch(() => ({ privateChannels: false }))
      .then((realtime) => {
        if (cancelled) return;
        const privateRt = realtime.privateChannels ? createPrivateRealtime({ initial: realtime, fetchToken }) : null;
        const client = privateRt?.client ?? supabase;
        const channel = client.channel(`user:${userId}`, {
          config: realtime.privateChannels ? { private: true } : {},
        });
        for (const event of Object.keys(handlersRef.current)) {
          channel.on("broadcast", { event }, ({ payload }) => handlersRef.current[event]?.(payload));
        }
        channel.subscribe();
        cleanup = () => {
          channel.unsubscribe();
          if (privateRt) privateRt.stop();
          else supabase.removeChannel(channel);
        };
      });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [userId]);
};
