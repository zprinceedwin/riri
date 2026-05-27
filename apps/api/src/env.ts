import { z } from "zod";

const EnvSchema = z.object({
  // Agora
  AGORA_APP_ID: z.string().min(1),
  AGORA_APP_CERTIFICATE: z.string().min(1),
  AGORA_CUSTOMER_ID: z.string().min(1),
  AGORA_CUSTOMER_SECRET: z.string().min(1),

  // OpenAI (kept for the post-call summarizer until we swap that too; not used
  // for embeddings any more -- Voyage handles those.)
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_LLM_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_SUMMARY_MODEL: z.string().default("gpt-4o"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

  // Voyage AI (embeddings for RAG)
  VOYAGE_API_KEY: z.string().min(1),
  VOYAGE_EMBEDDING_MODEL: z.string().default("voyage-3-large"),
  VOYAGE_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1024),

  // ElevenLabs
  ELEVENLABS_API_KEY: z.string().min(1),
  ELEVENLABS_VOICE_ID_JORDAN: z.string().min(1),
  ELEVENLABS_VOICE_ID_MIKE: z.string().min(1),
  ELEVENLABS_VOICE_ID_SOFIA: z.string().min(1),

  // Deepgram
  DEEPGRAM_API_KEY: z.string().min(1),

  // Resend (transactional email for booking confirmations)
  RESEND_API_KEY: z.string().min(1),
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
