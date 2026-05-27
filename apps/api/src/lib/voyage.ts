/**
 * Voyage AI embeddings client. Replaces OpenAI text-embedding-3-small.
 *
 * Voyage distinguishes between "query" and "document" inputs at embedding time
 * to improve retrieval quality, so we expose two helpers:
 *   - embed(query)         -> input_type: "query"     (used by RAG retrieval)
 *   - embedBatch(documents) -> input_type: "document"  (used by ingest + seed)
 *
 * Default model: voyage-3-large at 1024 dims. The dim MUST match the Supabase
 * knowledge.embedding column type (currently vector(1024)).
 */
import { getEnv } from "../env.js";

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

interface VoyageEmbeddingResponse {
  object: "list";
  data: Array<{ object: "embedding"; embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
}

async function call(
  input: string | string[],
  inputType: "query" | "document"
): Promise<number[][]> {
  const env = getEnv();
  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.VOYAGE_EMBEDDING_MODEL,
      input,
      input_type: inputType,
      output_dimension: env.VOYAGE_EMBEDDING_DIMENSIONS,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Voyage embedding failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as VoyageEmbeddingResponse;
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/** Generate an embedding for a single query string (use at RAG retrieval time). */
export async function embed(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    // Return a zero vector of the right dim so the caller can short-circuit
    // without a network round-trip on empty input.
    const env = getEnv();
    return new Array(env.VOYAGE_EMBEDDING_DIMENSIONS).fill(0);
  }
  const out = await call(trimmed, "query");
  return out[0]!;
}

/** Generate embeddings for many document strings (use at ingest/seed time). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  // Voyage has a batch limit of 128 items per call; chunk if needed.
  const BATCH = 128;
  if (texts.length <= BATCH) return call(texts, "document");
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const part = await call(slice, "document");
    out.push(...part);
  }
  return out;
}
