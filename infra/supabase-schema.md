# Supabase schema — Riri data layer

The replacement for the old Couchbase Capella setup. Everything was applied via the Supabase MCP into the project `Riri-hackathon` (ref `fubjaujicmgvfahycgyg`, region `ap-southeast-1`). You should not need to re-apply this by hand unless you blow away the project.

## Live project

| Item | Value |
|---|---|
| Project name | `Riri-hackathon` |
| Project ref | `fubjaujicmgvfahycgyg` |
| Region | `ap-southeast-1` (Singapore) |
| URL | `https://fubjaujicmgvfahycgyg.supabase.co` |
| Dashboard | https://supabase.com/dashboard/project/fubjaujicmgvfahycgyg |
| Postgres version | 17 |
| pgvector | enabled |

## Schema (migration `riri_schema_v1`)

Six tables. All have RLS enabled with no policies — that means anon access is denied. The backend uses the `service_role` key, which bypasses RLS.

| Table | Purpose | Notes |
|---|---|---|
| `knowledge` | RAG chunks | `embedding vector(1536)`, HNSW cosine index |
| `calls` | post-call records | transcript + summary as `jsonb` |
| `slots` | clinic appointment slots | atomic `UPDATE WHERE status='available'` replaces Couchbase CAS |
| `contacts` | caller-side CRM | unique partial index on `phone` |
| `bookings` | confirmed appointments | contact as `jsonb`, `scheduled_for` as `timestamptz` |
| `handoffs` | voice → human escalations | indexed on `status` |

## Vector search RPC

A SQL function the backend calls via `supabase.rpc('match_knowledge', …)`:

```sql
match_knowledge(
  query_embedding vector(1536),
  match_count int DEFAULT 4,
  filter_namespace text DEFAULT NULL
) RETURNS TABLE (id, text, kind, namespace, source, title, score)
```

Returns rows ordered by `embedding <=> query_embedding` (cosine distance), score is `1 - distance` for an intuitive 0..1 similarity.

## Atomic slot reservation

Couchbase's CAS is replaced by Postgres's natural row-level locking. The reserve flow does:

```sql
UPDATE slots
SET status = 'held', held_until = $1, call_id = $2
WHERE id = $3 AND status = 'available'
RETURNING *;
```

If zero rows match (someone else got it), the data layer inspects current state and returns `slot_taken_concurrent` / `slot_unavailable` / `slot_not_found`. Same return shape as the previous Couchbase implementation, so the route + UI code didn't change.

## Embedding dimension

The schema is hardcoded to 1536 dims to match OpenAI's `text-embedding-3-small`. If you swap embedding providers, update the column type and the RPC signature:

```sql
ALTER TABLE knowledge ALTER COLUMN embedding TYPE vector(<new_dim>);
DROP INDEX knowledge_embedding_idx;
CREATE INDEX knowledge_embedding_idx ON knowledge USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(<new_dim>),
  match_count int DEFAULT 4,
  filter_namespace text DEFAULT NULL
) RETURNS TABLE (...)
LANGUAGE sql STABLE AS $$ ... $$;
```

After that, re-run `pnpm seed:clinic` so the embeddings get regenerated at the new dimension.

## Smoke test

Once `.env` has `SUPABASE_SERVICE_ROLE_KEY`:

```powershell
pnpm seed:clinic
pnpm dev:api

# in another shell:
curl "http://localhost:3001/api/slots?from=2026-05-27T00:00:00Z&to=2026-06-10T00:00:00Z"
# expect ~100 rows
```

## Common gotchas

- **`service_role` vs `anon` key.** The backend MUST use the `service_role` secret (Supabase dashboard → Project Settings → API → "Reveal" under service_role). The publishable/anon key will be rejected by RLS on every write.
- **Service role bypasses RLS.** That's intentional for backend code. Never expose this key to the browser.
- **Embedding dim mismatch silently zeros results.** If your embedding provider returns a different dim than 1536, inserts will fail and vector queries will error. Match dim end-to-end.
