/**
 * Couchbase Capella client + vector search helpers.
 *
 * Setup (one-time, in Capella UI):
 *   1. Create bucket `Riri`
 *   2. Default scope, create two collections: `knowledge` and `calls`
 *   3. Create a Search index named `riri_vector_idx` with the JSON shown in
 *      infra/couchbase-vector-index.md (vector field: `embedding`, dim 1536).
 *
 * Connection is lazy -- the API server starts even if Capella creds are missing,
 * so frontend dev work is not blocked. First DB call throws if misconfigured.
 */
import {
  Bucket,
  Cluster,
  Collection,
  Scope,
  SearchRequest,
  VectorQuery,
  VectorSearch,
  connect,
} from "couchbase";
import { getEnv } from "../env.js";
import type { IngestKind, RagChunk } from "@riri/shared";

let clusterCache: Cluster | null = null;
let bucketCache: Bucket | null = null;
let scopeCache: Scope | null = null;
let knowledgeCache: Collection | null = null;
let callsCache: Collection | null = null;

async function getCluster(): Promise<Cluster> {
  if (clusterCache) return clusterCache;
  const env = getEnv();
  clusterCache = await connect(env.COUCHBASE_CONNECTION_STRING, {
    username: env.COUCHBASE_USERNAME,
    password: env.COUCHBASE_PASSWORD,
    configProfile: "wanDevelopment",
  });
  return clusterCache;
}

async function getBucket(): Promise<Bucket> {
  if (bucketCache) return bucketCache;
  const cluster = await getCluster();
  bucketCache = cluster.bucket(getEnv().COUCHBASE_BUCKET);
  return bucketCache;
}

async function getScope(): Promise<Scope> {
  if (scopeCache) return scopeCache;
  const bucket = await getBucket();
  scopeCache = bucket.scope(getEnv().COUCHBASE_SCOPE);
  return scopeCache;
}

export async function getKnowledgeCollection(): Promise<Collection> {
  if (knowledgeCache) return knowledgeCache;
  const scope = await getScope();
  knowledgeCache = scope.collection(getEnv().COUCHBASE_COLLECTION_KNOWLEDGE);
  return knowledgeCache;
}

export async function getCallsCollection(): Promise<Collection> {
  if (callsCache) return callsCache;
  const scope = await getScope();
  callsCache = scope.collection(getEnv().COUCHBASE_COLLECTION_CALLS);
  return callsCache;
}

// ============================================================================
// Knowledge documents (RAG chunks)
// ============================================================================

export interface StoredChunk {
  text: string;
  embedding: number[];
  kind: IngestKind;
  namespace: string;
  source?: string;
  title?: string;
  createdAt: number;
}

export async function upsertChunk(id: string, chunk: StoredChunk): Promise<void> {
  const collection = await getKnowledgeCollection();
  await collection.upsert(id, chunk);
}

export async function upsertChunks(items: Array<{ id: string; chunk: StoredChunk }>): Promise<void> {
  // Couchbase Node SDK lacks a bulk upsert helper -- parallelize manually.
  await Promise.all(items.map(({ id, chunk }) => upsertChunk(id, chunk)));
}

/**
 * Vector search over the `knowledge` collection.
 * Returns top-k chunks with similarity scores, optionally filtered by namespace.
 */
export async function vectorSearch(
  queryEmbedding: number[],
  opts: { topK?: number; namespace?: string } = {}
): Promise<RagChunk[]> {
  const topK = opts.topK ?? 4;
  const cluster = await getCluster();
  const env = getEnv();

  const vq = VectorQuery.create("embedding", queryEmbedding).numCandidates(Math.max(topK * 4, 10));

  const request = SearchRequest.create(VectorSearch.fromVectorQuery(vq));

  const result = await cluster.searchQuery(env.COUCHBASE_VECTOR_INDEX, request, {
    limit: topK,
    fields: ["text", "kind", "namespace", "source", "title"],
  });

  const rows = result.rows ?? [];
  const filtered = opts.namespace
    ? rows.filter((r) => (r.fields?.namespace as string | undefined) === opts.namespace)
    : rows;

  return filtered.map((r) => ({
    id: r.id,
    text: (r.fields?.text as string) ?? "",
    kind: (r.fields?.kind as IngestKind) ?? "company",
    namespace: (r.fields?.namespace as string) ?? "default",
    source: r.fields?.source as string | undefined,
    title: r.fields?.title as string | undefined,
    score: r.score,
  }));
}

// ============================================================================
// Call records
// ============================================================================

export interface StoredCall {
  callId: string;
  agentId: string;
  personaId: string;
  channel: string;
  prospectId?: string;
  namespace: string;
  startedAt: number;
  endedAt?: number;
  transcript?: Array<{ role: "user" | "assistant"; text: string; ts: number }>;
  summary?: unknown;
}

export async function upsertCall(call: StoredCall): Promise<void> {
  const collection = await getCallsCollection();
  await collection.upsert(call.callId, call);
}

export async function getCall(callId: string): Promise<StoredCall | null> {
  try {
    const collection = await getCallsCollection();
    const res = await collection.get(callId);
    return res.content as StoredCall;
  } catch (err: unknown) {
    if (err && typeof err === "object" && "context" in err) {
      // DocumentNotFound -- return null
      return null;
    }
    throw err;
  }
}
