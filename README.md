# HomeServices Inc. Voice Terminal

Next.js (App Router, TypeScript, Tailwind v4) frontend for the Summit voice agents
(LiveKit Agents 0.12.21: Ava the receptionist, Jordan in sales, Taylor in support).
Guests click **Initiate Call**, allow the microphone, and talk to the agents through
LiveKit Cloud. Built and tested with Next.js 16.3, livekit-client 2.22,
@livekit/components-react 2.9, livekit-server-sdk 2.19.

## Files

| File | What it does |
| --- | --- |
| `app/api/token/route.ts` | GET handler. Checks env vars, creates `exhibition_guest_<hex>` identity, signs a 15-minute token for a fresh `support_triage_room_<hex>` room (roomJoin, canPublish, canSubscribe), returns `{ token, serverUrl, roomName, identity }`. |
| `app/page.tsx` | Landing card: title, exhibition badge, persona cards, **Initiate Call**. The LiveKit room is not mounted until the click. |
| `components/AgentDashboard.tsx` | Fetches the token, renders `<LiveKitRoom audio video={false}>`, `<RoomAudioRenderer />`, `<BarVisualizer />`, mic-only `<VoiceAssistantControlBar />`, status pill, active persona highlight, End Call. |
| `app/layout.tsx`, `app/globals.css` | Title/metadata, dark theme, LiveKit visualizer styling. |

## Setup from scratch

```bash
npx create-next-app@latest voice-terminal --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
cd voice-terminal
npm install livekit-client @livekit/components-react @livekit/components-styles livekit-server-sdk
# copy app/, components/, .env.example from this folder over the generated ones
cp .env.example .env.local   # fill in real values
npm run dev                  # http://localhost:3000
```

Or use this folder directly: `npm install && npm run dev`.

## Deploy to Vercel

Set these three in Vercel → Project → Settings → Environment Variables (Production and Preview),
then redeploy:

- `LIVEKIT_URL`: `wss://<your-project>.livekit.cloud`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

They must be the same LiveKit Cloud project your Python workers use. Nothing is `NEXT_PUBLIC_`:
the token route returns the server URL to the browser, so the secret never leaves the server.
If any is missing, `/api/token` returns a 500 naming the missing variable and the page shows it.

## How it maps to your backend

- **Room name.** The workers never reference a room name. Ava registers with no `agent_name`,
  so LiveKit auto-dispatches her into every *new* room. Jordan and Taylor are dispatched by Ava
  into the same room via `create_dispatch`. So each call gets its own room,
  `support_triage_room_<hex>`. A single fixed `support_triage_room` would fail at the exhibition:
  Ava's `VoiceAssistant` binds to the first guest it sees and never listens to anyone else, so a
  second guest, or a re-dial before LiveKit closes the old room, would sit in silence.
- **Status text.** `useVoiceAssistant()` reads the `lk.agent.state` participant attribute, which
  0.12.21's `VoiceAssistant` publishes (initializing / listening / thinking / speaking).
- **Who is talking.** `announce_persona()` sets the agent's participant name to Ava, Jordan or
  Taylor; the dashboard lights up the matching card.
- **Handoffs.** The old agent leaves before the new one joins. When an agent was present and
  none is, the status reads "Transferring your call..." instead of looking stalled.

## Autoplay

Nothing connects until the click. The click also unlocks audio in Chrome/Edge. On Safari,
if audio is still blocked, a "Tap to enable audio" button appears (`<StartAudio />`).
Microphone access needs HTTPS (Vercel gives you that) or `localhost`.

## Exhibition checklist

1. Workers running (`./run_all.sh` or three `python ... dev` terminals) against the same LiveKit project.
2. Open the Vercel URL on the demo laptop, click Initiate Call once and allow the mic permanently.
3. Use a headset or a directional mic: in a noisy hall, open speakers can make Ava interrupt herself.
4. Note: Ava's greeting says "Summit Roofing and Plumbing", while this page says HomeServices Inc.
   Change one of them so the judges hear the same company name they read.
