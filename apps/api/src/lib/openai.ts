/**
 * OpenAI client -- kept only for the post-call summarizer (routes/calls.ts)
 * until that's swapped to a different LLM. Embeddings now live in voyage.ts.
 */
import OpenAI from "openai";
import { getEnv } from "../env.js";

let cached: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (cached) return cached;
  const env = getEnv();
  cached = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return cached;
}
