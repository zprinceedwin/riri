# Couchbase Capella — vector search index setup

This file is the exact thing to run before any RAG works. Do it FIRST in hour 0 — the index build can take a couple of minutes and we don't want to be debugging this at hour 3.

## 1. Create the cluster + bucket

1. Sign up at https://cloud.couchbase.com (free tier).
2. Create a new free-tier cluster (any region close to where your laptop is during the event — Singapore is good for Manila).
3. Once the cluster is healthy:
   - Create a **bucket** named `stratton`.
   - In the default `_default` scope, create two **collections**:
     - `knowledge` — holds the RAG chunks (text + 1536-dim embedding)
     - `calls` — holds the post-call records (transcript + summary)

## 2. Allowlist your IP

In Capella > Settings > Allowed IPs, add your dev laptop's public IP (and your deployment IP later). Without this, the SDK times out with cryptic auth errors.

## 3. Create a database access user

In Capella > Settings > Database Access, create a user with read/write on the `stratton` bucket. Note the username/password — these go in `.env` as `COUCHBASE_USERNAME` / `COUCHBASE_PASSWORD`.

## 4. Get the connection string

In Capella > Cluster > Connect > "Use a driver". Copy the `couchbases://...` connection string. Goes into `.env` as `COUCHBASE_CONNECTION_STRING`.

## 5. Create the vector search index

In Capella > Search > Indexes > "Create Search Index":

- Name: `stratton_vector_idx` (must match `COUCHBASE_VECTOR_INDEX` in `.env`)
- Bucket: `stratton`
- Scope: `_default`
- Collection: `knowledge`

Switch to **JSON Editor** and paste this:

```json
{
  "name": "stratton_vector_idx",
  "type": "fulltext-index",
  "params": {
    "doc_config": {
      "docid_prefix_delim": "",
      "docid_regexp": "",
      "mode": "scope.collection.type_field",
      "type_field": "type"
    },
    "mapping": {
      "default_analyzer": "standard",
      "default_datetime_parser": "dateTimeOptional",
      "default_field": "_all",
      "default_mapping": {
        "dynamic": false,
        "enabled": false
      },
      "default_type": "_default",
      "docvalues_dynamic": false,
      "index_dynamic": false,
      "store_dynamic": false,
      "type_field": "_type",
      "types": {
        "_default.knowledge": {
          "dynamic": false,
          "enabled": true,
          "properties": {
            "embedding": {
              "enabled": true,
              "dynamic": false,
              "fields": [
                {
                  "vector_index_optimized_for": "recall",
                  "dims": 1536,
                  "similarity": "cosine",
                  "index": true,
                  "name": "embedding",
                  "type": "vector"
                }
              ]
            },
            "text": {
              "enabled": true,
              "dynamic": false,
              "fields": [
                {
                  "index": true,
                  "name": "text",
                  "store": true,
                  "type": "text"
                }
              ]
            },
            "kind": {
              "enabled": true,
              "dynamic": false,
              "fields": [
                {
                  "index": true,
                  "name": "kind",
                  "store": true,
                  "type": "text"
                }
              ]
            },
            "namespace": {
              "enabled": true,
              "dynamic": false,
              "fields": [
                {
                  "index": true,
                  "name": "namespace",
                  "store": true,
                  "type": "text"
                }
              ]
            },
            "source": {
              "enabled": true,
              "dynamic": false,
              "fields": [
                {
                  "index": true,
                  "name": "source",
                  "store": true,
                  "type": "text"
                }
              ]
            },
            "title": {
              "enabled": true,
              "dynamic": false,
              "fields": [
                {
                  "index": true,
                  "name": "title",
                  "store": true,
                  "type": "text"
                }
              ]
            }
          }
        }
      }
    },
    "store": {
      "indexType": "scorch",
      "segmentVersion": 16
    }
  },
  "sourceType": "gocbcore",
  "sourceName": "stratton",
  "sourceParams": {},
  "planParams": {
    "maxPartitionsPerPIndex": 64,
    "indexPartitions": 1,
    "numReplicas": 0
  }
}
```

Click "Create Index". Wait for the index status to show **Healthy** before running `pnpm seed:all`. The first build for an empty collection is fast (~10-20 sec). After seeding, it'll re-index in seconds.

## 6. Smoke test

Once seeded, run this manually in the SDK to confirm vector search works:

```bash
pnpm --filter @stratton/api exec tsx -e "
import { vectorSearch } from './src/lib/couchbase.js';
import { embed } from './src/lib/openai.js';
const v = await embed('how does Couchbase compare to MongoDB');
console.log(await vectorSearch(v, { topK: 3 }));
"
```

You should see 3 chunks with `score` values. If you get an empty array: the index is still building or the namespace filter is wrong. If you get an error about "index not found": double-check the index name in `.env` matches the one you created.
