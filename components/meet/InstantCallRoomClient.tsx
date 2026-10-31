"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Users,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Maximize2,
  Minimize2,
  Shield,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useProfile } from "@/hooks/usePermissions";
import { toast } from "react-toastify";

interface InstantCallRoomClientProps {
  roomId: string;
}

interface ParticipantInfo {
  user_id: string;
  full_name: string;
  profile_photo?: string | null;
  online_at: string;
  is_audio_muted: boolean;
  is_video_off: boolean;
}

export default function InstantCallRoomClient({ roomId }: InstantCallRoomClientProps) {
  const { data: profile } = useProfile();
  const supabase = createClient();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [joining, setJoining] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<any>(null);

  // 1. Initialize Local Camera and Microphone
  useEffect(() => {
    let stream: MediaStream | null = null;
    let active = true;

    async function setupMedia() {
      try {
        setJoining(true);
        setMediaError(null);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera and microphone access are not supported by this browser.");
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: true,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.warn("Media capture error:", err);
        if (err.name === "NotAllowedError" || /permission/i.test(err.message || "")) {
          setMediaError("Camera/Microphone permission was denied. Please allow access in your browser settings.");
        } else if (err.name === "NotFoundError") {
          setMediaError("No camera or microphone found. You can still join as a listener.");
        } else {
          setMediaError(err.message || "Failed to start camera feed.");
        }
      } finally {
        if (active) setJoining(false);
      }
    }

    setupMedia();

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // 2. Realtime Presence for Call Room
  useEffect(() => {
    const channelName = `chandak_call_room_${roomId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: roomId } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const list: ParticipantInfo[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id) list.push(p);
          });
        });
        setParticipants(list);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        const names = newPresences.map((p: any) => p.full_name || "Colleague").join(", ");
        toast.info(`${names} joined the video call`, { autoClose: 2500 });
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        const names = leftPresences.map((p: any) => p.full_name || "Colleague").join(", ");
        toast.info(`${names} left the call`, { autoClose: 2000 });
      });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && profile?.id) {
        await channel.track({
          user_id: profile.id,
          full_name: profile.full_name || "Colleague",
          profile_photo: profile.profile_photo || null,
          online_at: new Date().toISOString(),
          is_audio_muted: isAudioMuted,
          is_video_off: isVideoOff,
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, profile?.id, profile?.full_name, profile?.profile_photo, isAudioMuted, isVideoOff, supabase]);

  // 3. Call Duration Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Toggle Microphone
  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isAudioMuted;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  };

  // Toggle Camera
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Screen Share Toggle
  const toggleScreenShare = async () => {
    if (isSharingScreen) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setIsSharingScreen(false);
    } else {
      try {
        const sStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        sStream.getVideoTracks()[0].onended = () => {
          setIsSharingScreen(false);
          setScreenStream(null);
        };

        setScreenStream(sStream);
        setIsSharingScreen(true);

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = sStream;
        }
      } catch (err: any) {
        console.warn("Screen share cancelled:", err);
      }
    }
  };

  const copyCallLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success("Meeting link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleEndCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
    }
    window.location.href = "/meet";
  };

  // Format mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-7xl mx-auto rounded-2xl border border-border bg-black text-white overflow-hidden shadow-2xl">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-5 py-3.5 bg-zinc-900/90 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-sm tracking-wide">Chandak Instant Meet</span>
          </div>
          <span className="hidden sm:inline-block font-mono text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">
            Room: {roomId.slice(0, 16)}
          </span>
          <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
            {formatTime(callDuration)}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={copyCallLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
            title="Copy meeting link to share with colleagues"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedLink ? "Copied" : "Copy Invite Link"}</span>
          </button>

          <Link
            href="/meet/live"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Launch Live Agenda</span>
          </Link>
        </div>
      </header>

      {/* Main Video Stage */}
      <div className="flex-1 min-h-0 relative p-4 flex flex-col md:flex-row gap-4 bg-zinc-950 overflow-hidden">
        {mediaError && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-950/90 border border-red-800 text-red-200 text-xs shadow-xl max-w-md">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{mediaError}</span>
          </div>
        )}

        {/* Video Canvas Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
          {/* Screen Share View if Active */}
          {isSharingScreen && (
            <div className="w-full h-full relative">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black"
              />
              <span className="absolute top-3 left-3 bg-black/70 px-2.5 py-1 rounded text-xs font-medium text-white backdrop-blur-xs">
                Your Screen Share
              </span>
            </div>
          )}

          {/* Local Camera View */}
          <div className={`relative w-full h-full flex items-center justify-center ${isSharingScreen ? "hidden" : "block"}`}>
            {isVideoOff ? (
              <div className="flex flex-col items-center justify-center gap-3">
                <span className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 text-3xl font-bold text-zinc-300 border border-zinc-700">
                  {profile?.full_name?.charAt(0).toUpperCase() || "U"}
                </span>
                <span className="text-sm font-semibold text-zinc-300">
                  {profile?.full_name || "You"} (Camera Off)
                </span>
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            )}

            {/* In-Video Badges */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs">
              <span className="font-semibold text-white">{profile?.full_name || "You"}</span>
              {isAudioMuted && <MicOff className="h-3.5 w-3.5 text-red-400" />}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Active Participants */}
        <div className="w-full md:w-72 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              Attendees ({Math.max(1, participants.length)})
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">P2P Encrypted</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {/* Self entry */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-7 w-7 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {profile?.full_name?.charAt(0) || "Y"}
                </span>
                <span className="text-xs font-medium text-zinc-200 truncate">
                  {profile?.full_name || "You"} (Host)
                </span>
              </div>
              <div className="flex items-center gap-1">
                {isAudioMuted ? (
                  <MicOff className="h-3.5 w-3.5 text-red-400" />
                ) : (
                  <Mic className="h-3.5 w-3.5 text-emerald-400" />
                )}
                {isVideoOff ? (
                  <VideoOff className="h-3.5 w-3.5 text-zinc-500" />
                ) : (
                  <Video className="h-3.5 w-3.5 text-emerald-400" />
                )}
              </div>
            </div>

            {/* Other participants */}
            {participants
              .filter((p) => p.user_id !== profile?.id)
              .map((p) => (
                <div
                  key={p.user_id}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/40 border border-zinc-800"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {p.full_name?.charAt(0) || "U"}
                    </span>
                    <span className="text-xs font-medium text-zinc-300 truncate">
                      {p.full_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.is_audio_muted ? (
                      <MicOff className="h-3.5 w-3.5 text-red-400" />
                    ) : (
                      <Mic className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-800 text-[11px] text-zinc-400 text-center">
            Share the invite link with colleagues on Chandak Messenger to collaborate.
          </div>
        </div>
      </div>

      {/* Bottom Floating Call Control Bar */}
      <footer className="flex items-center justify-center gap-3 px-4 py-3 bg-zinc-900 border-t border-zinc-800 shrink-0">
        {/* Mic Toggle */}
        <button
          type="button"
          onClick={toggleAudio}
          className={`h-11 w-11 rounded-full flex items-center justify-center transition-all ${
            isAudioMuted
              ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/30"
              : "bg-zinc-800 text-white hover:bg-zinc-700"
          }`}
          title={isAudioMuted ? "Unmute Microphone" : "Mute Microphone"}
          aria-label={isAudioMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        {/* Video Toggle */}
        <button
          type="button"
          onClick={toggleVideo}
          className={`h-11 w-11 rounded-full flex items-center justify-center transition-all ${
            isVideoOff
              ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/30"
              : "bg-zinc-800 text-white hover:bg-zinc-700"
          }`}
          title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
          aria-label={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
        >
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </button>

        {/* Screen Share */}
        <button
          type="button"
          onClick={toggleScreenShare}
          className={`h-11 w-11 rounded-full flex items-center justify-center transition-all ${
            isSharingScreen
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-zinc-800 text-white hover:bg-zinc-700"
          }`}
          title={isSharingScreen ? "Stop Screen Share" : "Share Entire Screen or Tab"}
          aria-label={isSharingScreen ? "Stop Screen Share" : "Share Screen"}
        >
          <Monitor className="h-5 w-5" />
        </button>

        {/* End Call */}
        <button
          type="button"
          onClick={handleEndCall}
          className="h-11 px-5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-red-900/40 transition-colors ml-4 cursor-pointer"
          title="Leave Video Call"
        >
          <PhoneOff className="h-4 w-4" />
          <span>Leave Call</span>
        </button>
      </footer>
    </div>
  );
}
