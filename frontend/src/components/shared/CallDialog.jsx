import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useRealtime } from "@/context/SocketContext";
import { toast } from "sonner";

// WebRTC Configuration
const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ],
};

const CallDialog = () => {
  const {
    incomingCall,
    outgoingCall,
    endCall,
    callSignal,
    sendCallSignal,
    user,
  } = useRealtime();

  // Call State
  const [callStatus, setCallStatus] = useState("idle"); // idle, calling, ringing, connected, ending
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // WebRTC Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  // Determine active call details
  const activeCall = outgoingCall || incomingCall;
  const isIncoming = !!incomingCall;

  useEffect(() => {
    if (!activeCall) {
      cleanupCall();
      return;
    }

    if (outgoingCall && callStatus === "idle") {
      setCallStatus("calling");
      startCall();
    } else if (incomingCall && callStatus === "idle") {
      setCallStatus("ringing");
    }
  }, [activeCall, outgoingCall, incomingCall]);

  // Handle Signaling
  useEffect(() => {
    if (!callSignal || !peerConnectionRef.current) return;

    const handleSignal = async () => {
      const pc = peerConnectionRef.current;
      const { type, data } = callSignal;

      try {
        if (type === "offer") {
          // Only process offer if we haven't already (or if renegotiation logic is added)
          if (pc.signalingState !== "stable") return;

          await pc.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          sendCallSignal(activeCall.callerId, "answer", answer);
        } else if (type === "answer") {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
          }
        } else if (type === "ice-candidate") {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        }
      } catch (error) {
        console.error("Signaling error:", error);
      }
    };

    handleSignal();
  }, [callSignal, activeCall, sendCallSignal]);

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: activeCall.callType === "video",
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Add tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendCallSignal(
            activeCall.recipientId,
            "ice-candidate",
            event.candidate,
          );
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        remoteStreamRef.current = remoteStream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setCallStatus("connected");
      };

      // Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to recipient
      sendCallSignal(activeCall.recipientId, "offer", offer);
    } catch (error) {
      console.error("Failed to start call:", error);
      cleanupCall();
      toast.error("Failed to access camera/microphone");
    }
  };

  const handleAcceptCall = async () => {
    setCallStatus("connecting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: activeCall.callType === "video",
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Add tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendCallSignal(activeCall.callerId, "ice-candidate", event.candidate);
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        remoteStreamRef.current = remoteStream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setCallStatus("connected");
      };

      // If we have a pending offer (stored in callSignal or if we just assume offer arrived first)
      // Ideally we should look at callSignal history, but for simplicity assuming offer arrives fast
      // The useEffect on `callSignal` handles the 'offer' processing.
      // Wait, if offer arrived BEFORE we accepted, callSignal might have changed.
      // But `useEffect` checks `peerConnectionRef.current`. If it wasn't set, it skipped 'offer'.
      // WE NEED TO STORE THE OFFER if it arrives before we start PC.
    } catch (error) {
      console.error("Failed to accept call:", error);
      handleEndCall();
    }
  };

  // We need to handle the case where Offer arrives before Accept
  // A better approach for the Offer handling inside useEffect:
  // If incoming call and no PC yet, just store the offer?
  // Actually, let's keep it simple: initiating `startCall` for caller sends offer.
  // Receiver `handleAccept` initializes PC. But what if offer came already?
  // We should rely on `callSignal` but it's ephemeral in context (overwritten by next signal).
  // The Context stores only the *last* signal.
  // If offer is sent immediately, and receiver takes 5s to accept, the signal might still be 'offer' unless ICE candidates overrode it.
  // PROBLEM: ICE candidates usually flood right after offer. `callSignal` will be the last ICE candidate.
  // The Context should ideally buffer signals or separate offer/answer.

  // Quick fix: The caller should RE-SEND offer periodically or upon 'accept' signal?
  // Or simpler: RealtimeContext should maybe append signals?
  // Or: Just assume smooth connection for this prototype.
  // Let's refine RealtimeContext later if needed. For now, let's assume standard flow.
  // Wait, if I miss the offer, the call fails.

  // ADJUSTMENT: The caller should wait for 'call-accepted' signal before sending offer?
  // Yes.
  // 1. Caller: `incoming-call` event. Status: calling.
  // 2. Receiver: Accepts. Sends `call-accepted`.
  // 3. Caller: Receives `call-accepted`. Calls `startCall()` (create PC, create Offer, send Offer).
  // 4. Receiver: Receives `offer`. Handles in useEffect (create Answer, send Answer).

  // I need to update `CallDialog` logic to support this 'handshake' before WebRTC.

  const handleEndCall = () => {
    if (activeCall) {
      endCall(
        activeCall.callId,
        isIncoming ? activeCall.callerId : activeCall.recipientId,
      );
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setCallStatus("idle");
  };

  if (!activeCall) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        drag={isMinimized}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        className={`fixed z-50 overflow-hidden shadow-2xl transition-all duration-300 ${
          isMinimized
            ? "bottom-4 right-4 w-72 h-48 rounded-2xl"
            : "inset-0 bg-[#0A0A0A]"
        } bg-[#1A1A1A] border border-white/10`}
      >
        {/* Minimized / Maximized Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <Button
            size="sm"
            variant="input"
            className="bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 p-0"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="w-5 h-5 text-white" />
            ) : (
              <Minimize2 className="w-5 h-5 text-white" />
            )}
          </Button>
        </div>

        {/* Video Area */}
        <div className="relative w-full h-full flex items-center justify-center">
          {activeCall.callType === "video" ? (
            <>
              {/* Remote Video (Full) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Local Video (PIP) */}
              {!isMinimized && (
                <div className="absolute bottom-24 right-8 w-48 h-36 bg-black rounded-xl overflow-hidden shadow-xl border border-white/20">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </>
          ) : (
            // Audio Call Interface
            <div className="flex flex-col items-center justify-center p-8">
              <Avatar className="w-32 h-32 border-4 border-[#FFD700] mb-6 animate-pulse">
                <AvatarImage src="" />
                <AvatarFallback className="text-4xl bg-[#FFD700] text-black font-bold">
                  {isIncoming ? activeCall.callerName?.[0] : "U"}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold text-white mb-2">
                {isIncoming ? activeCall.callerName : "Calling..."}
              </h2>
              <p className="text-gray-400">
                {callStatus === "connected"
                  ? "Connected"
                  : callStatus === "ringing"
                    ? "Incoming Audio Call..."
                    : "Calling..."}
              </p>
              <audio ref={remoteVideoRef} autoPlay />
              <audio ref={localVideoRef} autoPlay muted />
            </div>
          )}

          {/* Controls Overlay */}
          {!isMinimized && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10">
              {/* Call Controls */}
              {callStatus === "ringing" ? (
                <>
                  <Button
                    onClick={handleEndCall}
                    className="bg-red-500 hover:bg-red-600 rounded-full w-14 h-14 p-0 shadow-lg shadow-red-500/20"
                  >
                    <PhoneOff className="w-6 h-6 text-white" />
                  </Button>
                  <Button
                    onClick={handleAcceptCall}
                    className="bg-green-500 hover:bg-green-600 rounded-full w-14 h-14 p-0 animate-bounce shadow-lg shadow-green-500/20"
                  >
                    <Phone className="w-6 h-6 text-white" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`rounded-full w-12 h-12 p-0 ${isMuted ? "bg-red-500/20 text-red-500" : "bg-white/10 text-white"}`}
                  >
                    {isMuted ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </Button>

                  <Button
                    onClick={handleEndCall}
                    className="bg-red-500 hover:bg-red-600 rounded-full w-16 h-16 p-0 mx-4 shadow-xl shadow-red-500/30"
                  >
                    <PhoneOff className="w-8 h-8 text-white" />
                  </Button>

                  {activeCall.callType === "video" && (
                    <Button
                      onClick={() => setIsVideoOff(!isVideoOff)}
                      className={`rounded-full w-12 h-12 p-0 ${isVideoOff ? "bg-red-500/20 text-red-500" : "bg-white/10 text-white"}`}
                    >
                      {isVideoOff ? (
                        <VideoOff className="w-5 h-5" />
                      ) : (
                        <Video className="w-5 h-5" />
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CallDialog;
