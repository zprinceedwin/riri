# Demo Script — 5 minutes, plus 2 minutes Q&A

This is the script. Memorize the beats. The whole build serves this arc.

## Stage setup (do this before walking on)

- Dashboard is open on the projector at `/`
- Persona is set to **Sofia** (default), pre-loaded caller toggle **ON** so Sofia greets Maria by name
- A teammate is on the floor with a mic, ready to play Maria Cruz (returning client calling to refresh her Botox)
- Backup video is open in a second tab, one click away
- ngrok / cloudflared tunnel is alive; `LLM_PROXY_URL` env is set to the public URL
- `pnpm seed:clinic` has been run; calendar is full of available slots and ~50% pre-booked
- A real email inbox is open on a second monitor (or shared screen) so the Resend confirmation lands visibly
- Phone is off, laptop charger is in

## 0:00 — Hook (30 seconds)

> "Who's seen Rocky?
> I'm Rocky — but for you. That's Riri.
>
> Quick story. My Tita Maria runs a derma clinic in BGC. Three out of every ten calls go to voicemail. Half of those calls are clients trying to book five-thousand-peso treatments. That's twenty thousand pesos walking out the door — every single day.
>
> Riri is the voice AI receptionist that picks up every single call. Photographic memory of every service, every doctor, every returning client. Today, you'll meet Sofia."

## 0:30 — Frame the data (30 seconds)

Show the dashboard:

> "Right now you're looking at Belle Aesthetic Manila's front desk. Live calendar. Stats. Pipeline. All of it streaming out of Couchbase Capella in real time.
>
> Sixty seconds before this demo, we taught Sofia everything about the clinic — services, doctors, prices, the FAQ, the objection-handling playbook. Now she's about to take a call."

(point at the calendar — about half the cells filled gold, the other half open)

## 1:00 — Press the call button (2 minutes 30)

Press the gold call button. Sofia joins.

**Teammate plays Maria Cruz**, a returning client. Cues:

1. **Warm open:** Don't say your name — let Sofia greet you ("Hi Maria, welcome back!") to prove the contact-lookup magic worked.
2. **The ask:** "Hi Sofia — I'd like to book my Botox refresh."
3. **Price test:** "How much is it? … that's a lot, actually."
   *(Sofia should pivot to the 3-session package savings, naturally.)*
4. **Doctor preference:** "Can I have it with Doctor Santos again?"
5. **Slot pick:** "Thursday afternoon, two PM works. Yes confirm — my email is the same one on file."

**Watch for these moments to call out live to judges:**

- *When Sofia opens with "Hi Maria, welcome back"* → "Notice that. We never told her the caller's name. Couchbase looked up the contact by phone number and Sofia greeted her with full context."
- *When Sofia mentions the 3-session package after the price pushback* → "That's the objection-handling playbook firing — vector-retrieved from Couchbase, not hardcoded."
- *When the calendar cell turns gold (booked) on screen* → "That cell flipping is a Couchbase CAS lock — Sofia just won the race condition for that exact 30-minute slot. Try to book it from another browser tab right now and you'll get rejected."
- *When the confirmation email shows up on the second monitor* → "That email landed via Resend the moment Sofia confirmed verbally. Not three minutes later. Now."

End the call.

## 3:30 — Dashboard reveal (45 seconds)

Land on the summary page:

> "Here's what just happened. Lead score: hot lead, ninety-something. Captured contact. Intent: book_new. Objection handled — price — with effectiveness 'strong'. Sources cited from the Couchbase KB. Next steps, ready for the coordinator.
>
> This is the whole call, scored and stored, twelve seconds after she said goodbye."

Click back to the dashboard. Stats strip ticks up. Pipeline shows a new "NEW" pill on Maria's card. Calendar still shows the gold cell.

## 4:15 — Persona switch (optional, V1 only, 30 seconds)

If the persona-engine demo is solid:

> "Sofia is just one persona. Belle Aesthetic uses her warmth. Now imagine a Series-B SaaS startup hiring Riri."

Switch the persona to Jordan. Start a 20-second call where the teammate plays a SaaS prospect.

> "Same product. Same Agora voice quality. Same Couchbase RAG. Different soul. We call this the persona engine."

## 4:45 — The frame (30 seconds)

> "Riri — I'm Rocky, but for you.
>
> Built on Agora Conversational AI for sub-650-millisecond voice. Couchbase Capella for the brain — vector RAG plus operational data in one engine. ElevenLabs for the voice. Deepgram for the ears. Resend for the inbox. Shipped in 7 hours by 4 engineers using TRAE, Cursor, and Claude Code.
>
> We're not selling SaaS. We're plugging the leak in your phone.
>
> Thank you."

## Q&A preparation (2 minutes)

Likely questions:

- **"How does this differ from a generic IVR or a chatbot?"** → "Sofia is a closer with photographic memory. Generic IVRs route. Sofia books. She also escalates the moment she sees a medical question — voice AI for clinics has to know its lane."
- **"What happens if the call needs a human?"** → "Look at the Pending Handoff panel — Sofia generates a handoff record with reason and priority. A coordinator gets the call within five minutes. We don't pretend to be a doctor."
- **"How do you handle hallucinations?"** → "System prompt is explicit: only cite from retrieved CONTEXT and AVAILABLE_SLOTS. If a fact isn't there, she defers. Post-call summary flags any unsupported claims. The CONTEXT is the safety rail."
- **"Why Couchbase over Pinecone/Postgres+pgvector?"** → "We need vector RAG and operational slot/contact/booking data in the same engine. Capella does both with one query path. A bolt-on vector DB means a sync pipeline and two failure modes."
- **"What about non-English / Tagalog / Taglish?"** → "Agora ASR supports 30+ languages. Sofia is English-tuned today. A Tagalog Sofia is a 1-hour swap of the persona JSON plus a Tagalog ElevenLabs voice ID. Filipino dermas would absolutely want her code-switching."
- **"Production-ready?"** → "Auth, multi-tenant signup, real CRM integrations are cut for the hackathon. Voice + RAG + persona + CAS-based slot reservation + Resend confirmation are real and working."

## Backup plan if the live call fails

1. **Plan A:** retry once (30 seconds max).
2. **Plan B:** "We've actually seen this on venue WiFi — let me show you the same call we ran 20 minutes ago." Switch to the backup video tab. Don't apologize for it; treat it as the demo.
3. **Plan C:** voice over the dashboard with words: "imagine you press the button and..." (only if A and B both fail — almost never necessary).
