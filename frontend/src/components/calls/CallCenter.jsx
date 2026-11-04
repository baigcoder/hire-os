/**
 * Calls from Messages: the ringing card and the call window.
 *
 * The API rings the callee (SocketContext → incomingCall). Both browsers then
 * join the private "call:<id>" topic from the call config; the caller sends
 * the WebRTC offer when the callee appears, using the TURN servers the API
 * handed out so the call connects behind strict NATs too.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";
import { useRealtime } from "@/context/SocketContext";
import { supabase } from "@/lib/supabase";
import { createPrivateRealtime } from "@/lib/privateRealtime";
import { useVideoCall } from "@/hooks/useVideoCall";
import api from "@/utils/api";

const RING_MS = 45_000;

const btn = "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition-colors";

const CallRoom = ({ config, role, peerName, onEnd }) => {
  const { user } = useSelector((s) => s.auth);
  const me = String(user?._id);
  const callId = config.call._id;
  const audioOnly = config.call.type === "audio";
  const channelRef = useRef(null);
  const offeredRef = useRef(false);
  const [peerHere, setPeerHere] = useState(false);
  const remoteAudioRef = useRef(null);

  const send = useCallback(
    (event, payload) => channelRef.current?.send({ type: "broadcast", event, payload: { ...payload, senderId: me } }),
    [me],
  );
  const signaling = {
    sendOffer: useCallback((offer, targetId) => send("webrtc-offer", { offer, targetId }), [send]),
    sendAnswer: useCallback((answer, targetId) => send("webrtc-answer", { answer, targetId }), [send]),
    sendIceCandidate: useCallback((candidate, targetId) => send("webrtc-ice-candidate", { candidate, targetId }), [send]),
  };
  const vc = useVideoCall(signaling, callId, { iceServers: config.ice?.iceServers, audioOnly });
  const vcRef = useRef(vc);
  vcRef.current = vc;

  // Camera/mic preview straight away
  useEffect(() => {
    vcRef.current.initializeMedia();
  }, []);

  useEffect(() => {
    const usePrivate = Boolean(config.realtime?.privateChannels);
    const privateRt = usePrivate
      ? createPrivateRealtime({
          initial: config.realtime,
          fetchToken: () => api.get(`/calls/${callId}/config`).then((r) => r.data.realtime),
        })
      : null;
    const client = privateRt?.client ?? supabase;
    const channel = client.channel(config.topic, {
      config: { ...(usePrivate && { private: true }), presence: { key: me } },
    });
    channelRef.current = channel;

    const mine = (handler) => ({ payload }) => payload?.targetId === me && handler(payload);
    channel.on("broadcast", { event: "webrtc-offer" }, mine((p) => vcRef.current.handleOffer(p)));
    channel.on("broadcast", { event: "webrtc-answer" }, mine((p) => vcRef.current.handleAnswer(p)));
    channel.on("broadcast", { event: "webrtc-ice-candidate" }, mine((p) => vcRef.current.handleIceCandidate(p)));
    channel.on("presence", { event: "sync" }, () => {
      const others = Object.keys(channel.presenceState()).filter((k) => k !== me);
      setPeerHere(others.length > 0);
      // The caller offers once the callee is in the room
      if (role === "caller" && others[0] && !offeredRef.current) {
        offeredRef.current = true;
        vcRef.current.createOffer(others[0]);
      }
    });
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await channel.track({ joinedAt: new Date().toISOString() });
      if (status === "CHANNEL_ERROR") toast.error("Couldn't connect the call");
    });

    return () => {
      channel.unsubscribe();
      if (privateRt) privateRt.stop();
      else supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [config.topic]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nobody answered
  useEffect(() => {
    if (role !== "caller" || peerHere) return undefined;
    const t = setTimeout(() => {
      toast("No answer");
      onEnd();
    }, RING_MS);
    return () => clearTimeout(t);
  }, [role, peerHere, onEnd]);

  // Attach streams whenever they (re)appear
  useEffect(() => {
    if (vc.localVideoRef.current && vc.localStream) vc.localVideoRef.current.srcObject = vc.localStream;
  }, [vc.localStream]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (vc.remoteVideoRef.current && vc.remoteStream) vc.remoteVideoRef.current.srcObject = vc.remoteStream;
    if (remoteAudioRef.current && vc.remoteStream) remoteAudioRef.current.srcObject = vc.remoteStream;
  }, [vc.remoteStream]); // eslint-disable-line react-hooks/exhaustive-deps

  const connected = ["connected", "completed"].includes(vc.connectionState);
  const status = connected ? "Connected" : peerHere ? "Connecting…" : role === "caller" ? "Ringing…" : "Joining…";

  return (
    <div role="dialog" aria-label={`Call with ${peerName || "contact"}`} className="fixed bottom-4 right-4 z-[100] w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0c] text-white shadow-2xl">
      <div className="relative aspect-video bg-black">
        {audioOnly ? (
          <div className="flex h-full items-center justify-center text-3xl font-medium text-white/80">{(peerName || "?").slice(0, 1)}</div>
        ) : (
          <video ref={vc.remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
        )}
        {audioOnly && <audio ref={remoteAudioRef} autoPlay />}
        {!audioOnly && (
          <video ref={vc.localVideoRef} autoPlay playsInline muted className="absolute bottom-2 right-2 h-20 w-28 rounded-lg border border-white/20 object-cover" />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{peerName || "Call"}</p>
          <p className="text-xs text-white/60" aria-live="polite">
            {vc.callError || status}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btn} onClick={vc.toggleAudio} aria-label={vc.isAudioOn ? "Mute" : "Unmute"}>
            {vc.isAudioOn ? <Mic size={18} /> : <MicOff size={18} />}
          </button>
          {!audioOnly && (
            <button type="button" className={btn} onClick={vc.toggleVideo} aria-label={vc.isVideoOn ? "Turn camera off" : "Turn camera on"}>
              {vc.isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
          )}
          <button type="button" className={`${btn} border-transparent bg-red-600 hover:bg-red-500`} onClick={onEnd} aria-label="Hang up">
            <PhoneOff size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const CallCenter = () => {
  const { incomingCall, activeCall, acceptCall, rejectCall, endCall } = useRealtime();

  // Stop ringing when the caller's ring window is over
  useEffect(() => {
    if (!incomingCall?.ringUntil) return undefined;
    const t = setTimeout(rejectCall, Math.max(0, new Date(incomingCall.ringUntil) - Date.now()));
    return () => clearTimeout(t);
  }, [incomingCall, rejectCall]);

  if (activeCall) return <CallRoom key={activeCall.config.call._id} {...activeCall} onEnd={endCall} />;
  if (!incomingCall) return null;

  const { caller, type } = incomingCall;
  return (
    <div role="alertdialog" aria-label="Incoming call" className="fixed bottom-4 right-4 z-[100] flex w-[min(380px,calc(100vw-32px))] items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0b0c] p-4 text-white shadow-2xl">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{caller?.fullname}</p>
        <p className="text-xs text-white/60">Incoming {type === "audio" ? "voice" : "video"} call</p>
      </div>
      <button type="button" className={`${btn} border-transparent bg-red-600 hover:bg-red-500`} onClick={rejectCall} aria-label="Decline">
        <PhoneOff size={18} />
      </button>
      <button type="button" className={`${btn} border-transparent bg-emerald-600 hover:bg-emerald-500`} onClick={acceptCall} aria-label="Answer">
        {type === "audio" ? <Phone size={18} /> : <Video size={18} />}
      </button>
    </div>
  );
};

export default CallCenter;
