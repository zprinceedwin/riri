# Demo Script — 5 minutes, plus 2 minutes Q&A

This is the script. Memorize the beats. The whole build serves this arc.

## Stage setup (do this before walking on)

- Dashboard is open on the projector at `/`
- Persona is set to **Jordan**
- A teammate is on the floor with a mic, ready to play the prospect
- Backup video is open in a second tab, one click away
- ngrok / cloudflared tunnel is alive; LLM_PROXY_URL env is set to the public URL
- Couchbase seed has been run; vector index is healthy
- Phone is off, laptop charger is in

## 0:00 — Hook (30 seconds)

> "Quick show of hands — who's seen Rocky?
> I'm Rocky — but for you. That's Riri.
> We built a voice AI sales platform where you don't just get a bot — you get a closer with personality. Photographic memory of your product and your prospect.
> Today Jordan's on the line. He's been preparing for this call."

## 0:30 — Frame the ingest (30 seconds)

Show the dashboard:

> "Sixty seconds ago, we fed Jordan everything Couchbase publishes about itself, and a Series-B fintech prospect named Voltline. He's read it all. He remembers all of it. Watch."

(point at the right panel — "Photographic memory" — empty for now, will fill during the call)

## 1:00 — Press the call button (2 minutes 30)

Press the gold call button. Agent joins, you hear the greeting.

Teammate plays the prospect role (Sara Mendoza, VP Eng at Voltline). **Cues for the teammate:**

1. **Discovery:** "Hi — sure, what's this about?"
2. **Skeptical:** "We already use MongoDB Atlas with Atlas Vector Search. What's different about Couchbase?"
3. **Hard objection:** "We've already standardized on Postgres with pgvector. Why would we move?"
4. **Interruption test:** start saying "Actually we don't have time today—" then go silent — let Jordan handle the interruption gracefully.
5. **The close moment:** "Okay, I'm curious. What's the next step?"

**Watch for these moments to call out live to judges:**

- *When Jordan cites the Sequoia Series B fact about Voltline* → "Notice that — that fact wasn't in the prompt. He pulled it from Couchbase vector search."
- *When you interrupt mid-sentence and he yields* → "That's Agora's sub-650-millisecond interruption handling. Most voice bots can't do that."
- *When sources appear in the right panel* → "Those are the Couchbase chunks he's pulling from right now."

End the call with the close.

## 3:30 — Persona switch (45 seconds, V1 only)

If V1 shipped:
> "But maybe Jordan isn't your brand. Maybe you sell to enterprise, and you want someone calmer. Click."

Switch persona dropdown to **Mike**. Restart the call. Same prospect. Same product. Different soul.

Run the same hook for 15-20 seconds — judges will hear the contrast in tone.

> "Same product. Same brain. Different closer. That's our persona engine."

## 4:15 — Dashboard reveal (30 seconds)

End the call. Navigate to summary:

> "Here's the dashboard. Live transcript. Qualification score. Captured lead. Sources cited. Objections handled — with effectiveness scoring. Ready for your CRM."

## 4:45 — The frame (45 seconds)

> "Riri — I'm Rocky, but for you. Voice AI sales agents with the personality of a real closer.
> Built on Agora Conversational AI for sub-650-millisecond voice. Couchbase Capella for the brain — vector RAG over your product knowledge and your prospect intel. Shipped in 7 hours by 4 engineers using TRAE and Cursor.
> We're not building another chatbot. We're hiring closers.
> Thank you."

## Q&A preparation (2 minutes)

Likely questions:

- **"How does this differ from ElevenLabs Convai / Vapi?"** → "Sales-native, not generic. Persona engine, qualification scoring, lead capture, RAG over prospect intel as a first-class feature. Plus Agora's voice quality and Couchbase's vector + JSON in one engine — most competitors stitch two databases."
- **"What's the business model?"** → "Per-seat SaaS for SDR teams, plus usage-based on voice minutes. Pilots start free, scale by call volume."
- **"How do you handle hallucinations?"** → "System prompt is explicit: only cite from retrieved CONTEXT. If a fact isn't there, defer. Post-call summary flags any unsupported claims. In practice, the CONTEXT is the safety rail."
- **"Production-ready?"** → "Today, no — auth, billing, multi-tenant signup, CRM integrations are cut for the hackathon. The voice + RAG + persona core is real and working."
- **"What about non-English markets?"** → "Agora ASR supports 30+ languages. ElevenLabs supports multilingual voices. The persona prompts are English-tuned today; adding a Tagalog Jordan is a 1-hour change."

## Backup plan if the live call fails

1. **Plan A:** retry once (30 seconds max).
2. **Plan B:** "We've actually seen this on venue WiFi — let me show you the same call we ran 20 minutes ago." Switch to the backup video tab. Don't apologize for it; treat it as the demo.
3. **Plan C:** voice over the dashboard with words: "imagine you press the button and..." (only if A and B both fail — almost never necessary).
