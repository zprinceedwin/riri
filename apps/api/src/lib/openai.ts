import OpenAI from "openai";
import { getEnv } from "../env.js";

let cached: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (cached) return cached;
  const env = getEnv();
  cached = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return cached;
}

/** Generate an embedding vector for a single text input. */
export async function embed(text: string): Promise<number[]> {
  const env = getEnv();
  const client = getOpenAI();
  const res = await client.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input: text,
  });
  return res.data[0]!.embedding;
}

/** Generate embeddings for many texts in one batch. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const env = getEnv();
  const client = getOpenAI();
  const res = await client.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}
