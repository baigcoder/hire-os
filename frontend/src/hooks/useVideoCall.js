/**
 * useVideoCall Hook - WebRTC Video Call Management
 * Handles peer connections, media streams, and ICE negotiation
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

export const useVideoCall = (socket, interviewId, options = {}) => {
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

  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    try {
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
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      console.log("📹 Local media initialized");
      return stream;
    } catch (error) {
      console.error("Failed to get local media:", error);
      setCallError(error.message);
      throw error;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("ice-candidate", {
          interviewId,
          candidate: event.candidate,
        });
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
  }, [socket, interviewId]);

  // Add local tracks to peer connection
  const addLocalTracks = useCallback((pc, stream) => {
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });
  }, []);

  // Create and send offer (for initiator)
  const createOffer = useCallback(async () => {
    try {
      const pc = peerConnectionRef.current || createPeerConnection();
      const stream = localStream || (await initializeMedia());
      addLocalTracks(pc, stream);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      if (socket) {
        socket.emit("offer", { interviewId, offer });
      }

      console.log("📤 Sent offer");
    } catch (error) {
      console.error("Create offer error:", error);
      setCallError(error.message);
    }
  }, [
    socket,
    interviewId,
    localStream,
    createPeerConnection,
    initializeMedia,
    addLocalTracks,
  ]);

  // Handle incoming offer
  const handleOffer = useCallback(
    async ({ offer, senderId }) => {
      try {
        console.log("📥 Received offer from:", senderId);

        const pc = peerConnectionRef.current || createPeerConnection();
        const stream = localStream || (await initializeMedia());
        addLocalTracks(pc, stream);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Add any pending ICE candidates
        for (const candidate of pendingCandidates.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidates.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socket) {
          socket.emit("answer", { interviewId, answer, targetId: senderId });
        }

        console.log("📤 Sent answer");
      } catch (error) {
        console.error("Handle offer error:", error);
        setCallError(error.message);
      }
    },
    [
      socket,
      interviewId,
      localStream,
      createPeerConnection,
      initializeMedia,
      addLocalTracks,
    ],
  );

  // Handle incoming answer
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

  // Handle ICE candidate
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
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  }, [localStream]);

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
      if (pc && localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
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
  }, [localStream]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
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
  }, [localStream]);

  // Socket event listeners for WebRTC signaling
  useEffect(() => {
    if (!socket) return;

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    // When new participant joins, initiate call
    socket.on("participant-joined", ({ participant }) => {
      // If we have local stream and peer connection, create offer
      if (localStream && !peerConnectionRef.current) {
        setTimeout(() => createOffer(), 1000);
      }
    });

    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
    };
  }, [
    socket,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    localStream,
    createOffer,
  ]);

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
  };
};

export default useVideoCall;
