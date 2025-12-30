/**
 * useVideoCall Hook - WebRTC Video Call Management
 * Handles peer connections, media streams, and ICE negotiation
 * Updated to use Supabase Realtime signaling instead of Socket.io
 */

import { useEffect, useRef, useCallback, useState } from "react";

// Free STUN servers for ICE
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

/**
 * @param {Object} signaling - Supabase signaling functions { sendOffer, sendAnswer, sendIceCandidate }
 * @param {string} interviewId - Interview room ID
 * @param {Object} options - Optional configuration
 */
export const useVideoCall = (signaling = {}, interviewId, options = {}) => {
  const { sendOffer, sendAnswer, sendIceCandidate } = signaling || {};

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState("new");
  const [callError, setCallError] = useState(null);

  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenStreamRef = useRef(null);
  const pendingCandidates = useRef([]);
  const localStreamRef = useRef(null);

  // Initialize local media stream with fallback
  const initializeMedia = useCallback(async () => {
    try {
      // Try full video + audio first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      console.log("📹 Local media initialized (video + audio)");
      return stream;
    } catch (videoError) {
      console.warn("Video failed, trying audio-only:", videoError.message);

      try {
        // Fallback to audio-only
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        setLocalStream(audioStream);
        localStreamRef.current = audioStream;
        setIsVideoOn(false);

        console.log("🎤 Audio-only mode initialized");
        setCallError("Camera unavailable - audio-only mode");
        return audioStream;
      } catch (audioError) {
        console.error("Failed to get any media:", audioError);
        setCallError("No camera or microphone available");
        // Return null instead of throwing - allow UI to still render
        return null;
      }
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((targetId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && sendIceCandidate) {
        sendIceCandidate(event.candidate, targetId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE state:", pc.iceConnectionState);
      setConnectionState(pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (pc.connectionState === "failed") {
        setCallError("Connection failed. Please try rejoining.");
      }
    };

    pc.ontrack = (event) => {
      console.log("📥 Received remote track");
      const [stream] = event.streams;
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [sendIceCandidate]);

  // Add local tracks to peer connection
  const addLocalTracks = useCallback((pc, stream) => {
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });
  }, []);

  // Create and send offer (for initiator)
  const createOffer = useCallback(async (targetId) => {
    try {
      const pc = peerConnectionRef.current || createPeerConnection(targetId);
      const stream = localStreamRef.current || await initializeMedia();
      addLocalTracks(pc, stream);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      if (sendOffer) {
        sendOffer(offer, targetId);
      }

      console.log("📤 Sent offer");
    } catch (error) {
      console.error("Create offer error:", error);
      setCallError(error.message);
    }
  }, [sendOffer, createPeerConnection, initializeMedia, addLocalTracks]);

  // Handle incoming offer (called from parent component)
  const handleOffer = useCallback(
    async ({ offer, senderId }) => {
      try {
        console.log("📥 Received offer from:", senderId);

        const pc = peerConnectionRef.current || createPeerConnection(senderId);
        const stream = localStreamRef.current || await initializeMedia();
        addLocalTracks(pc, stream);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Add any pending ICE candidates
        for (const candidate of pendingCandidates.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidates.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (sendAnswer) {
          sendAnswer(answer, senderId);
        }

        console.log("📤 Sent answer");
      } catch (error) {
        console.error("Handle offer error:", error);
        setCallError(error.message);
      }
    },
    [sendAnswer, createPeerConnection, initializeMedia, addLocalTracks],
  );

  // Handle incoming answer (called from parent component)
  const handleAnswer = useCallback(async ({ answer, senderId }) => {
    try {
      console.log("📥 Received answer from:", senderId);

      const pc = peerConnectionRef.current;
      if (pc && pc.signalingState !== "stable") {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error("Handle answer error:", error);
    }
  }, []);

  // Handle ICE candidate (called from parent component)
  const handleIceCandidate = useCallback(async ({ candidate, senderId }) => {
    try {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        pendingCandidates.current.push(candidate);
      }
    } catch (error) {
      console.error("Add ICE candidate error:", error);
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  }, []);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false,
      });

      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      // Replace video track in peer connection
      const pc = peerConnectionRef.current;
      if (pc) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }
      }

      // Handle screen share stop
      screenTrack.onended = () => {
        stopScreenShare();
      };

      setIsScreenSharing(true);
      console.log("🖥️ Screen sharing started");
    } catch (error) {
      console.error("Screen share error:", error);
    }
  }, []);

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    try {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }

      // Restore camera video
      const pc = peerConnectionRef.current;
      const stream = localStreamRef.current;
      if (pc && stream) {
        const videoTrack = stream.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      }

      setIsScreenSharing(false);
      console.log("🖥️ Screen sharing stopped");
    } catch (error) {
      console.error("Stop screen share error:", error);
    }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState("closed");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, []);

  return {
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    isAudioOn,
    isVideoOn,
    isScreenSharing,
    connectionState,
    callError,
    initializeMedia,
    createOffer,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    cleanup,
    // Handlers for parent component to call when receiving signals
    handleOffer,
    handleAnswer,
    handleIceCandidate,
  };
};

export default useVideoCall;

