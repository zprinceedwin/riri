/**
 * RAG retrieval: takes a query string, embeds it, and pulls the top-k
 * relevant chunks from Couchbase. Used by the LLM proxy on every turn
 * and by the post-call summary endpoint.
 */
import type { RagChunk } from "@riri/shared";
import { vectorSearch } from "./couchbase.js";
import { embed } from "./openai.js";

export interface RetrieveOptions {
  topK?: number;
  namespace?: string;
}

export async function retrieve(query: string, opts: RetrieveOptions = {}): Promise<RagChunk[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];
  const queryVec = await embed(trimmed);
  return vectorSearch(queryVec, opts);
}

/**
 * Format a list of retrieved chunks as a single CONTEXT block for the
 * system prompt. Keeps it conversational and source-tagged so the LLM
 * can cite naturally.
 */
export function formatContextBlock(chunks: RagChunk[]): string {
  if (chunks.length === 0) return "";
  const lines: string[] = [
    "===== CONTEXT (your photographic memory; use these facts to sell) =====",
  ];
  chunks.forEach((c, i) => {
    const header = c.title
      ? `[${i + 1}] ${c.title}${c.source ? ` -- ${c.source}` : ""}`
      : `[${i + 1}] ${c.source ?? c.kind}`;
    lines.push(header);
    lines.push(c.text.trim());
    lines.push("");
  });
  lines.push("===== END CONTEXT =====");
  return lines.join("\n");
}
