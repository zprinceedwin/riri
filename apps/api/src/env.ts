import { z } from "zod";

const EnvSchema = z.object({
  // Agora
  AGORA_APP_ID: z.string().min(1),
  AGORA_APP_CERTIFICATE: z.string().min(1),
  AGORA_CUSTOMER_ID: z.string().min(1),
  AGORA_CUSTOMER_SECRET: z.string().min(1),

  // OpenAI (optional — kept for legacy summarizer path)
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_LLM_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_SUMMARY_MODEL: z.string().default("gpt-4o"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

  // Voyage AI (embeddings for RAG)
  VOYAGE_API_KEY: z.string().default(""),
  VOYAGE_EMBEDDING_MODEL: z.string().default("voyage-3-large"),
  VOYAGE_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1024),

  // Cartesia (primary TTS)
  CARTESIA_API_KEY: z.string().default(""),
  CARTESIA_MODEL_ID: z.string().default("sonic-2"),
  CARTESIA_VOICE_ID_JORDAN: z.string().default(""),
  CARTESIA_VOICE_ID_MIKE: z.string().default(""),
  CARTESIA_VOICE_ID_SOFIA: z.string().default(""),

  // ElevenLabs (optional fallback TTS)
  ELEVENLABS_API_KEY: z.string().default(""),
  ELEVENLABS_VOICE_ID_JORDAN: z.string().default("nPczCjzI2devNBz1zQrb"),
  ELEVENLABS_VOICE_ID_MIKE: z.string().default("onwK4e9ZLuTAKqWW03F9"),
  ELEVENLABS_VOICE_ID_SOFIA: z.string().default("XB0fDUnXU5powFXDhCwa"),

  // Deepgram (optional — ASR)
  DEEPGRAM_API_KEY: z.string().default(""),

  // Resend (optional — booking confirmation emails)
  RESEND_API_KEY: z.string().default(""),
  RESEND_FROM_EMAIL: z
    .string()
    .default("Riri Clinic <onboarding@resend.dev>"),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),

  // Clinic identity
  CLINIC_NAME: z.string().default("Belle Aesthetic Manila"),
  CLINIC_DEMO_NAMESPACE: z.string().default("clinic-belle-manila"),
  CLINIC_ADDRESS_LINE: z
    .string()
    .default("Ground Floor, Bonifacio High Street, BGC, Taguig"),

  // App
  PORT: z.coerce.number().default(3001),
  API_BASE_URL: z.string().default("http://localhost:3001"),
  LLM_PROXY_URL: z
    .string()
    .default("http://localhost:3001/v1/chat/completions"),
  WEB_BASE_URL: z.string().default("http://localhost:3000"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error(
      "Environment validation failed. See .env.example for required keys."
    );
  }
  cached = parsed.data;
  return cached;
}

/**
 * Get a "best effort" env that does not throw on missing keys.
 * Useful for local dev where some integrations are not yet configured.
 */
export function getEnvLoose(): Partial<Env> {
  return EnvSchema.partial().parse(process.env);
}
