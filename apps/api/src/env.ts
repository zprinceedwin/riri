import { z } from "zod";

const EnvSchema = z.object({
  // Agora
  AGORA_APP_ID: z.string().min(1),
  AGORA_APP_CERTIFICATE: z.string().min(1),
  AGORA_CUSTOMER_ID: z.string().min(1),
  AGORA_CUSTOMER_SECRET: z.string().min(1),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_LLM_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_SUMMARY_MODEL: z.string().default("gpt-4o"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

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

  // Couchbase
  COUCHBASE_CONNECTION_STRING: z.string().min(1),
  COUCHBASE_USERNAME: z.string().min(1),
  COUCHBASE_PASSWORD: z.string().min(1),
  COUCHBASE_BUCKET: z.string().default("Riri"),
  COUCHBASE_SCOPE: z.string().default("_default"),
  COUCHBASE_COLLECTION_KNOWLEDGE: z.string().default("knowledge"),
  COUCHBASE_COLLECTION_CALLS: z.string().default("calls"),
  COUCHBASE_COLLECTION_SLOTS: z.string().default("slots"),
  COUCHBASE_COLLECTION_CONTACTS: z.string().default("contacts"),
  COUCHBASE_COLLECTION_BOOKINGS: z.string().default("bookings"),
  COUCHBASE_COLLECTION_HANDOFFS: z.string().default("handoffs"),
  COUCHBASE_VECTOR_INDEX: z.string().default("riri_vector_idx"),

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
