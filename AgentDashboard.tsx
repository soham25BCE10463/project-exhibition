"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionState, MediaDeviceFailure } from "livekit-client";
import {
  BarVisualizer,
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  VoiceAssistantControlBar,
  useConnectionState,
  useRoomContext,
  useVoiceAssistant,
} from "@livekit/components-react";
import "@livekit/components-styles";

type Persona = { name: string; role: string; blurb: string };

type TokenResponse = {
  token: string;
  serverUrl: string;
  roomName: string;
  identity: string;
};

type Props = {
  personas: Persona[];
  onCallEnded: () => void;
};

export default function AgentDashboard({ personas, onCallEnded }: Props) {
  const [details, setDetails] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Distinguishes "the call ended" from "the call never connected".
  const connectedOnce = useRef(false);

  // This component only mounts after the guest clicks "Initiate Call",
  // so fetching here keeps the whole connection behind a user gesture.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/token", { cache: "no-store", signal: controller.signal });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? `Token request failed (${res.status})`);
        setDetails(body as TokenResponse);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Could not start the call.");
      }
    })();
    return () => controller.abort();
  }, []);

  const handleMediaFailure = useCallback((failure?: MediaDeviceFailure) => {
    if (failure === MediaDeviceFailure.PermissionDenied) {
      setError("Microphone access was blocked. Allow it in the browser's address bar and try again.");
    } else if (failure === MediaDeviceFailure.NotFound) {
      setError("No microphone found. Plug one in and try again.");
    } else {
      setError("The microphone could not be started.");
    }
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <p className="max-w-md text-sm text-red-300">{error}</p>
        <button
          type="button"
          onClick={onCallEnded}
          className="rounded-full border border-white/15 px-6 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
        >
          Back
        </button>
      </div>
    );
  }

  if (!details) {
    return <StatusPill tone="amber" label="Connecting..." pulse />;
  }

  return (
    <LiveKitRoom
      serverUrl={details.serverUrl}
      token={details.token}
      connect={true}
      audio={true}
      video={false}
      onConnected={() => {
        connectedOnce.current = true;
      }}
      onDisconnected={() => {
        if (connectedOnce.current) {
          onCallEnded();
        } else {
          setError(`Could not reach the voice server at ${details.serverUrl}. Check LIVEKIT_URL and the network.`);
        }
      }}
      onMediaDeviceFailure={handleMediaFailure}
      onError={(e) => setError(e.message)}
      data-lk-theme="default"
      className="!bg-transparent"
    >
      <CallView personas={personas} />
      {/* Plays every remote audio track: this is how the agent's TTS reaches the speakers. */}
      <RoomAudioRenderer />
      {/* Fallback for strict autoplay policies (e.g. Safari): shows a button only if audio is still blocked. */}
      <StartAudio
        label="Tap to enable audio"
        className="mx-auto mt-4 block rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-950"
      />
    </LiveKitRoom>
  );
}

function CallView({ personas }: { personas: Persona[] }) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { state, audioTrack, agent } = useVoiceAssistant();

  // The backend sets each agent's participant name to "Ava", "Jordan" or "Taylor".
  const activeName = agent?.name || agent?.identity;
  const active = personas.find((p) => p.name.toLowerCase() === activeName?.toLowerCase());

  // During a handoff the current agent leaves before the next one joins.
  // Remember that an agent was here so that gap reads as a transfer, not a stall.
  const [hadAgent, setHadAgent] = useState(false);
  if (agent && !hadAgent) setHadAgent(true);

  const status = describeStatus(connectionState, state, !!agent, hadAgent, active?.name);

  return (
    <div className="flex flex-col items-center gap-8">
      <StatusPill tone={status.tone} label={status.label} pulse={status.pulse} />

      <div className="relative flex h-44 w-full max-w-md items-center justify-center rounded-2xl border border-white/5 bg-zinc-950/60 px-6">
        <div
          aria-hidden
          className={`absolute inset-0 rounded-2xl bg-amber-500/10 blur-2xl transition-opacity duration-500 ${
            state === "speaking" ? "opacity-100" : "opacity-0"
          }`}
        />
        <BarVisualizer
          state={state}
          track={audioTrack}
          barCount={7}
          options={{ minHeight: 12 }}
          className="agent-visualizer relative h-full w-full"
        />
      </div>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {personas.map((p) => {
          const isActive = active?.name === p.name;
          return (
            <div
              key={p.name}
              className={`rounded-2xl border p-4 transition-all duration-300 ${
                isActive
                  ? "border-amber-400/60 bg-amber-400/10 shadow-[0_0_30px_-8px_rgba(245,158,11,0.7)]"
                  : "border-white/5 bg-zinc-950/50 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">{p.role}</p>
                {isActive && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">On the line</span>
                )}
              </div>
              <p className="mt-1 text-lg font-semibold text-zinc-100">{p.name}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Mic mute + device picker only; no camera, chat or screen share. */}
        <VoiceAssistantControlBar controls={{ microphone: true, leave: false }} />
        <button
          type="button"
          onClick={() => room.disconnect()}
          className="inline-flex items-center gap-2 rounded-full bg-red-500/90 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          End Call
        </button>
      </div>
    </div>
  );
}

type Tone = "amber" | "green" | "sky" | "zinc";

function describeStatus(
  connection: ConnectionState,
  agentState: ReturnType<typeof useVoiceAssistant>["state"],
  hasAgent: boolean,
  hadAgent: boolean,
  agentName?: string,
): { label: string; tone: Tone; pulse?: boolean } {
  if (connection === ConnectionState.Connecting) return { label: "Connecting...", tone: "amber", pulse: true };
  if (connection === ConnectionState.Reconnecting || connection === ConnectionState.SignalReconnecting)
    return { label: "Reconnecting...", tone: "amber", pulse: true };
  if (connection === ConnectionState.Disconnected) return { label: "Call ended", tone: "zinc" };

  if (!hasAgent) {
    return hadAgent
      ? { label: "Transferring your call...", tone: "sky", pulse: true }
      : { label: "Waiting for the receptionist...", tone: "amber", pulse: true };
  }

  const who = agentName ?? "Agent";
  switch (agentState) {
    case "speaking":
      return { label: `${who} Speaking...`, tone: "amber", pulse: true };
    case "thinking":
      return { label: `${who} Thinking...`, tone: "sky", pulse: true };
    case "listening":
      return { label: "Listening...", tone: "green" };
    case "initializing":
    case "connecting":
    case "pre-connect-buffering":
      return { label: `${who} is picking up...`, tone: "amber", pulse: true };
    default:
      return { label: "Connected", tone: "green" };
  }
}

const TONES: Record<Tone, string> = {
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-200 [--dot:var(--color-amber-400)]",
  green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 [--dot:var(--color-emerald-400)]",
  sky: "border-sky-400/30 bg-sky-400/10 text-sky-200 [--dot:var(--color-sky-400)]",
  zinc: "border-white/10 bg-white/5 text-zinc-300 [--dot:var(--color-zinc-400)]",
};

function StatusPill({ label, tone, pulse }: { label: string; tone: Tone; pulse?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mx-auto inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-sm font-medium ${TONES[tone]}`}
    >
      <span className="relative flex h-2 w-2">
        {pulse && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--dot)] opacity-75" />}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--dot)]" />
      </span>
      {label}
    </div>
  );
}
