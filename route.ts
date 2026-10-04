import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

// Never cache or prerender: every call needs a fresh identity and token.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Every call gets its own room: support_triage_room_<random>.
// The receptionist worker (agent.py) registers without an agent_name, so
// LiveKit auto-dispatches Ava into any NEW room, whatever it is called.
// A single shared room would break the demo: Ava's VoiceAssistant binds to the
// first guest it sees, so a second guest (or a quick re-dial before the room
// closes) would join a room where nobody is listening to them.
const ROOM_PREFIX = "support_triage_room";

export async function GET() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.LIVEKIT_URL;

  const missing = [
    !apiKey && "LIVEKIT_API_KEY",
    !apiSecret && "LIVEKIT_API_SECRET",
    !serverUrl && "LIVEKIT_URL",
  ].filter(Boolean);

  if (missing.length > 0) {
    console.error(`[token] Missing environment variable(s): ${missing.join(", ")}`);
    return NextResponse.json(
      { error: `Server is missing ${missing.join(", ")}. Set it in Vercel → Settings → Environment Variables.` },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const suffix = randomBytes(4).toString("hex");
  const identity = `exhibition_guest_${suffix}`;
  const roomName = `${ROOM_PREFIX}_${suffix}`;

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: "Exhibition Guest",
      ttl: "15m",
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // toJwt() is async in livekit-server-sdk v2.
    const token = await at.toJwt();

    return NextResponse.json(
      { token, serverUrl, roomName, identity },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[token] Failed to sign LiveKit token", err);
    return NextResponse.json(
      { error: "Could not create a call token." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
