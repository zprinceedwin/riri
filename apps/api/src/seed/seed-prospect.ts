/**
 * Seed a sample prospect into Couchbase. For the hackathon demo we use a
 * realistic Series-B SaaS prospect that gives Jordan/Mike plenty of hooks.
 *
 * Usage:
 *   pnpm seed:prospect
 *
 * Outputs the generated prospectId you can paste into the dashboard, or copy
 * into apps/web/lib/api.ts as DEMO_PROSPECT_ID for the demo.
 */
import { embedBatch } from "../lib/openai.js";
import { upsertChunks, type StoredChunk } from "../lib/couchbase.js";
import { chunkText } from "../lib/chunk.js";
import { nanoid } from "nanoid";

const PROSPECT = {
  name: "Sara Mendoza",
  company: "Voltline",
  role: "VP of Engineering",
  notes: `Voltline is a Series-B fintech based in Singapore that powers real-time transaction risk scoring for digital wallets across Southeast Asia. They closed a $40M Series B led by Sequoia in March 2026 and are doubling their engineering team this year. Their existing stack uses MongoDB Atlas as the primary database and Pinecone for vector embeddings used by their fraud-detection ML pipeline. Their CTO has publicly said on the Asia FinTech podcast that maintaining two separate data stores and a custom sync pipeline is one of their biggest operational pain points heading into 2026. They are evaluating a database consolidation -- the ask from leadership is to cut infrastructure cost and reduce on-call burden. Sara herself joined six months ago from Grab where her team ran on Couchbase. She is technical, prefers depth over hype, and decisions on infra are made by a small architecture review board of three people that meets every two weeks.

Recent public signals:
- Series B announcement: March 2026, led by Sequoia, $40M
- New office opened in Manila, March 2026
- Job postings: Senior Platform Engineer (4 open), Staff ML Engineer (2 open), Site Reliability Engineer (3 open)
- Sara's LinkedIn: "We're investing heavily in real-time AI for fraud. The next 18 months are about consolidation, not sprawl."
- CTO interview on Asia FinTech podcast, April 2026: "Our biggest pain isn't ML quality -- it's keeping our transactional data and our vector store in sync without paging the on-call team at 3 AM."

Why this is a hot prospect for Riri/Couchbase:
- Already feeling the pain of MongoDB Atlas + Pinecone sprawl
- Sara has positive Couchbase priors from Grab
- Funded, growing, and explicitly looking to consolidate
- Fraud workload needs sub-millisecond latency, which is a Couchbase strength
- Geographic fit -- Couchbase has a strong APAC presence`,
};

async function main() {
  const prospectId = nanoid(10);
  const namespace = `prospect:${prospectId}`;

  const profileText = [
    `Prospect: ${PROSPECT.name}`,
    `Company: ${PROSPECT.company}`,
    `Role: ${PROSPECT.role}`,
    "",
    PROSPECT.notes,
  ].join("\n");

  const chunks = chunkText(profileText);
  const embeddings = await embedBatch(chunks);

  const items = chunks.map((text, i) => ({
    id: `${prospectId}-profile-${i}`,
    chunk: {
      text,
      embedding: embeddings[i]!,
      kind: "prospect" as const,
      namespace,
      source: "prospect-profile",
      title: `${PROSPECT.name} @ ${PROSPECT.company}`,
      createdAt: Date.now(),
    } satisfies StoredChunk,
  }));
  await upsertChunks(items);

  console.log(`Seeded prospect: ${PROSPECT.name} @ ${PROSPECT.company}`);
  console.log(`  prospectId: ${prospectId}`);
  console.log(`  namespace:  ${namespace}`);
  console.log(`  chunks:     ${items.length}`);
  console.log("");
  console.log(`Set this in your dashboard as the demo prospect, or paste into apps/web/lib/api.ts:`);
  console.log(`  export const DEMO_PROSPECT_ID = "${prospectId}";`);
}

main().catch((err) => {
  console.error("seed:prospect failed:", err);
  process.exit(1);
});
