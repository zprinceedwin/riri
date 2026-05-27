/**
 * Seed Couchbase with the "company we're selling for" knowledge base.
 *
 * For the hackathon demo we're selling Couchbase to Couchbase -- sponsor
 * brownie points and the knowledge is already public. Run this once before
 * the event to pre-warm the vector index.
 *
 * Usage:
 *   pnpm seed:company                       # default: Couchbase
 *   COMPANY=acme pnpm seed:company          # swap to another seeded company
 */
import { embedBatch } from "../lib/openai.js";
import { upsertChunks, type StoredChunk } from "../lib/couchbase.js";
import { chunkText } from "../lib/chunk.js";
import { nanoid } from "nanoid";

interface SeedDoc {
  title: string;
  source: string;
  text: string;
}

const COUCHBASE_SEED: SeedDoc[] = [
  {
    title: "Couchbase Capella overview",
    source: "couchbase.com/products/capella",
    text: `Couchbase Capella is a fully-managed Database-as-a-Service for modern applications. It unifies multiple data services into one platform: key-value, document, SQL++, full-text search, analytics, eventing, and vector search. Capella runs on AWS, Azure, and Google Cloud, with a free tier that includes vector search for hackathon and prototype use cases. Where MongoDB Atlas separates Atlas Vector Search and the core document DB, Capella ships them as one engine, with one query API, one cost model, and zero data movement.`,
  },
  {
    title: "Couchbase Vector Search and AI Services",
    source: "couchbase.com/products/vector-search",
    text: `Capella AI Services and Vector Search lets you embed text, images, and other modalities and query them with k-nearest-neighbor search inside the same database that stores your operational data. Real customers use it for retrieval-augmented generation (RAG), semantic search, recommendation, and personalization. Because vectors live next to your JSON documents, you can JOIN vector similarity with SQL++ predicates -- e.g. "find products similar to this image that are in stock in this region under fifty dollars" -- in a single query. That eliminates the second copy of data and second sync pipeline most teams hit with a bolt-on vector DB.`,
  },
  {
    title: "Performance and scale story",
    source: "couchbase.com/why-couchbase",
    text: `Couchbase serves sub-millisecond reads at scale through its memory-first architecture. It scales horizontally with auto-sharding, runs multi-dimensional scaling so you can scale query, index, search, and data services independently, and supports cross-data-center replication for global low-latency. The Mobile and Edge SDKs let the same engine run on devices, on edge servers, and in cloud, with built-in sync. For real-time AI agents like Stratton, that means low-latency RAG retrieval next to fresh operational data, no eventual-consistency surprises.`,
  },
  {
    title: "Customer outcomes",
    source: "couchbase.com/customers",
    text: `Cisco modernized their service experience on Couchbase. Domino's runs millions of orders through it. PayPal scaled fraud workloads on it. eBay uses it for personalized search. Common themes: existing teams replacing complex stacks (Mongo + Redis + Elasticsearch + a vector DB) with Couchbase because one engine does all of those jobs with better latency and lower operating overhead.`,
  },
  {
    title: "Pricing and trial path",
    source: "couchbase.com/pricing",
    text: `Capella has a free tier that includes vector search and is enough to build a working RAG application. Paid tiers start in the low hundreds of dollars per month for production-scale clusters with HA, backups, and 24/7 support. Enterprise self-managed and Capella dedicated tiers are available for companies with custom security, data residency, or scale requirements. For pilots, customers often start on the free tier, validate the workload in two to four weeks, and scale to a paid dedicated cluster once production traffic begins.`,
  },
  {
    title: "Common objections and how to handle them",
    source: "stratton-internal-playbook",
    text: `OBJECTION: "We already use MongoDB Atlas and added Atlas Vector Search." RESPONSE: Atlas Vector Search is a separate service with its own scaling, billing, and consistency model -- it's a bolt-on, not native. Capella was designed from day one to have vectors next to operational JSON in one engine. Customers consolidating from Mongo + Pinecone + Redis to Capella usually see 30 to 50 percent infrastructure cost reduction and simpler ops.

OBJECTION: "We use Pinecone for vector search." RESPONSE: Pinecone is excellent for pure vector search but means you copy your operational data into a second system, keep two indexes in sync, and pay a second bill. With Capella you write once, query JSON and vectors together, and your AI app doesn't need a sync pipeline.

OBJECTION: "We've already standardized on Postgres + pgvector." RESPONSE: pgvector works for low scale but most teams hit pain at five to ten million vectors -- index build time, memory pressure, and lack of native distributed search. Capella is a distributed engine designed for high vector counts and high QPS without the pgvector ceiling.

OBJECTION: "Will it work on the edge for our IoT or mobile use case?" RESPONSE: Yes -- Couchbase Mobile and Couchbase Lite run the same engine on devices and edge servers with native sync to Capella. Most competitors require a separate stack for edge.

OBJECTION: "Is it production-ready for finance-grade workloads?" RESPONSE: PayPal, Visa, and major banks run Couchbase in production for fraud and core financial workloads. The engine has been hardened for over a decade.`,
  },
  {
    title: "Discovery questions Jordan and Mike should ask",
    source: "stratton-internal-playbook",
    text: `1. "What's your current stack for storing customer data and powering search or AI features?"
2. "How many vectors are you running today, and where do you expect to be in twelve months?"
3. "When you ship a new AI feature, how long does it take to get fresh data into the vector store and into production? Days? Weeks?"
4. "Who owns the call on database infrastructure for your team -- engineering, platform, or someone else?"
5. "What's driving the timing? Are you replacing something, scaling something, or building something net new?"`,
  },
  {
    title: "Differentiation cheat sheet",
    source: "stratton-internal-playbook",
    text: `One sentence: Couchbase is the only database that gives you key-value, document, SQL, search, analytics, and vector search in one engine, one query language, and one cost model -- so you can build modern AI apps without a sprawling sync pipeline. Where MongoDB needs Atlas Vector Search bolted on, Pinecone needs a separate sync, and Postgres + pgvector hits a scale ceiling, Capella was designed for this from the start.`,
  },
];

async function main() {
  const company = (process.env.COMPANY ?? "couchbase").toLowerCase();
  const docs = company === "couchbase" ? COUCHBASE_SEED : COUCHBASE_SEED;
  console.log(`Seeding company knowledge: ${company} (${docs.length} docs)`);

  let totalChunks = 0;
  for (const doc of docs) {
    const chunks = chunkText(doc.text);
    if (chunks.length === 0) continue;
    const embeddings = await embedBatch(chunks);
    const docId = nanoid(8);
    const items = chunks.map((text, i) => ({
      id: `seed-company-${docId}-${i}`,
      chunk: {
        text,
        embedding: embeddings[i]!,
        kind: "company" as const,
        namespace: "default",
        source: doc.source,
        title: doc.title,
        createdAt: Date.now(),
      } satisfies StoredChunk,
    }));
    await upsertChunks(items);
    totalChunks += items.length;
    console.log(`  + ${doc.title} -- ${items.length} chunks`);
  }
  console.log(`Done. Seeded ${totalChunks} chunks under namespace=default, kind=company.`);
}

main().catch((err) => {
  console.error("seed:company failed:", err);
  process.exit(1);
});
