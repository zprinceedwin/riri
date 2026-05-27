/**
 * Ingest endpoints. Two flavors:
 *   POST /api/ingest/url      -- scrape a URL, chunk, embed, upsert to Couchbase
 *   POST /api/ingest/text     -- raw text input (faster, used by seed scripts)
 *   POST /api/ingest/prospect -- structured prospect record (name + company + notes)
 */
import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  IngestUrlRequestSchema,
  IngestTextRequestSchema,
  IngestProspectRequestSchema,
  type IngestResponse,
  type IngestProspectResponse,
} from "@riri/shared";
import { scrapeUrlToText } from "../lib/scrape.js";
import { chunkText } from "../lib/chunk.js";
import { embedBatch } from "../lib/openai.js";
import { upsertChunks, type StoredChunk } from "../lib/couchbase.js";

export const ingestRoutes = new Hono();

ingestRoutes.post("/url", async (c) => {
  const body = await c.req.json();
  const parsed = IngestUrlRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_request", detail: parsed.error.message }, 400);
  }
  const { url, kind, namespace, title: titleOverride } = parsed.data;

  const { title, text } = await scrapeUrlToText(url);
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    return c.json({ error: "no_content_extracted", detail: `nothing readable at ${url}` }, 422);
  }

  const embeddings = await embedBatch(chunks);
  const docId = nanoid(10);

  const items = chunks.map((chunkContent, i) => ({
    id: `${docId}-${i}`,
    chunk: {
      text: chunkContent,
      embedding: embeddings[i]!,
      kind,
      namespace,
      source: url,
      title: titleOverride ?? title,
      createdAt: Date.now(),
    } satisfies StoredChunk,
  }));
  await upsertChunks(items);

  const res: IngestResponse = { docId, chunks: items.length, namespace, kind };
  return c.json(res);
});

ingestRoutes.post("/text", async (c) => {
  const body = await c.req.json();
  const parsed = IngestTextRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_request", detail: parsed.error.message }, 400);
  }
  const { text, kind, namespace, title, source } = parsed.data;

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return c.json({ error: "empty_text" }, 422);
  }
  const embeddings = await embedBatch(chunks);
  const docId = nanoid(10);

  const items = chunks.map((c2, i) => ({
    id: `${docId}-${i}`,
    chunk: {
      text: c2,
      embedding: embeddings[i]!,
      kind,
      namespace,
      source,
      title,
      createdAt: Date.now(),
    } satisfies StoredChunk,
  }));
  await upsertChunks(items);

  const res: IngestResponse = { docId, chunks: items.length, namespace, kind };
  return c.json(res);
});

ingestRoutes.post("/prospect", async (c) => {
  const body = await c.req.json();
  const parsed = IngestProspectRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_request", detail: parsed.error.message }, 400);
  }
  const { name, company, companyUrl, role, notes } = parsed.data;

  const prospectId = nanoid(10);
  const namespace = `prospect:${prospectId}`;

  // Build a structured profile text we can chunk + embed.
  const lines = [
    `Prospect: ${name}`,
    `Company: ${company}`,
    role ? `Role: ${role}` : null,
    companyUrl ? `Company URL: ${companyUrl}` : null,
    notes ? `\nNotes:\n${notes}` : null,
  ].filter(Boolean) as string[];
  const profileText = lines.join("\n");

  const profileChunks = chunkText(profileText);
  const items: Array<{ id: string; chunk: StoredChunk }> = [];

  if (profileChunks.length > 0) {
    const embeddings = await embedBatch(profileChunks);
    for (let i = 0; i < profileChunks.length; i++) {
      items.push({
        id: `${prospectId}-profile-${i}`,
        chunk: {
          text: profileChunks[i]!,
          embedding: embeddings[i]!,
          kind: "prospect",
          namespace,
          source: "prospect-profile",
          title: `${name} @ ${company}`,
          createdAt: Date.now(),
        },
      });
    }
  }

  // Optional: also scrape company URL and store under same namespace.
  if (companyUrl) {
    try {
      const { title, text } = await scrapeUrlToText(companyUrl);
      const cChunks = chunkText(text);
      if (cChunks.length > 0) {
        const cEmb = await embedBatch(cChunks);
        for (let i = 0; i < cChunks.length; i++) {
          items.push({
            id: `${prospectId}-web-${i}`,
            chunk: {
              text: cChunks[i]!,
              embedding: cEmb[i]!,
              kind: "prospect",
              namespace,
              source: companyUrl,
              title,
              createdAt: Date.now(),
            },
          });
        }
      }
    } catch (err) {
      console.warn(`[ingest.prospect] failed to scrape ${companyUrl}:`, err);
    }
  }

  await upsertChunks(items);

  const res: IngestProspectResponse = { prospectId, chunks: items.length };
  return c.json(res);
});
