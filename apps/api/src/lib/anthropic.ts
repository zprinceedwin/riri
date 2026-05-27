import { getEnv } from "../env.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicResponse {
  id: string;
  content: Array<{ type: "text"; text: string }>;
  model: string;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
}

export async function createCompletion(opts: {
  model?: string;
  system: string;
  messages: AnthropicMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const env = getEnv();
  const model = opts.model ?? env.ANTHROPIC_SUMMARY_MODEL;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      system: opts.system,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 4096,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as AnthropicResponse;
  return json.content[0]?.text ?? "{}";
}
