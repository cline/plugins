---
name: duckdb-s3-explore
description: >
  Explore and query data on S3, Cloudflare R2, GCS, MinIO, or any S3-compatible storage.
  Use when the user mentions an s3://, r2://, gs://, or gcs:// URL, asks "what's in this bucket",
  wants to list remote files, preview remote Parquet/CSV/JSON, or query data on object storage
  without downloading it. Also triggers when the user wants to know the size, schema, or row count
  of remote datasets.
---

You are helping the user explore data on remote object storage using DuckDB.

URL: use the object-storage URL from the current user request.
Question: answer the user's requested question; if none was provided, list and describe what is there.

## Step 1 - Detect provider and set up credentials

Based on the URL or user context, prepend the appropriate secret configuration:

| Provider | URL patterns | Secret setup |
|---|---|---|
| AWS S3 | `s3://` | `CREATE SECRET (TYPE S3, PROVIDER credential_chain);` |
| Cloudflare R2 | `r2://`, `s3://` with R2 endpoint | `CREATE SECRET (TYPE R2, PROVIDER credential_chain);` |
| GCS | `gs://`, `gcs://` | `CREATE SECRET (TYPE GCS, PROVIDER credential_chain);` |
| MinIO / custom | `s3://` with custom endpoint | Prefer credential-chain or environment-backed credentials; only create an explicit temporary secret after the user confirms the endpoint and where credentials come from. |

For R2, if the user provides an account ID, the endpoint is `<account_id>.r2.cloudflarestorage.com`. R2 URLs like `r2://bucket/path` should be rewritten to `s3://bucket/path` with the R2 secret.

For public buckets (e.g. Overture Maps, AWS open data), no secret is needed - skip this step.

Do not ask the user to paste access keys or secret values into chat or SQL examples. Prefer local profiles, environment variables, credential-chain providers, or user-managed DuckDB secrets. Ask before creating any new DuckDB secret.

Always prepend:
```sql
LOAD httpfs;
```

## Step 2 - Determine what the URL points to

If the URL looks like a directory or bucket (no file extension, or ends with `/`), list its contents with sizes:

```bash
duckdb -c "
LOAD httpfs;
<SECRET_SETUP>
SELECT filename, (size / 1024 / 1024)::DECIMAL(10,1) AS size_mb, last_modified
FROM read_blob('<URL>/*')
ORDER BY filename
LIMIT 50;
"
```

Note: only select `filename`, `size`, `last_modified` - never select `content`, which would download the actual files.
If the path is broad (bucket root, high-cardinality prefix, or recursive glob), ask the user to confirm or narrow the prefix before running the listing.

If the URL points to a specific file or glob pattern (has a file extension or contains `*`), preview it:

```bash
duckdb -c "
LOAD httpfs;
<SECRET_SETUP>
DESCRIBE FROM '<URL>';
SELECT count(*) AS row_count FROM '<URL>';
FROM '<URL>' LIMIT 20;
"
```

For Parquet files, get row counts and sizes from metadata (no data download):

```bash
duckdb -c "
LOAD httpfs;
<SECRET_SETUP>
SELECT file_name,
       sum(row_group_num_rows) AS total_rows,
       (sum(row_group_compressed_bytes) / 1024 / 1024)::DECIMAL(10,1) AS compressed_mb
FROM parquet_metadata('<URL>')
GROUP BY file_name;
"
```

## Step 3 - Answer the question

Using the listing, schema, or sample data, answer:

If the user did not ask a specific question, list and describe what is available at the remote path.

If the user asks an analytical question (e.g., "how many rows match X"), write and run the appropriate SQL query. DuckDB pushes predicates down into Parquet on S3, so filtering is efficient even on large remote datasets.

## Error handling

- `duckdb: command not found` -> delegate to `duckdb-setup`
- Access denied / 403 -> suggest the user check local credentials such as `aws configure`, environment variables, or an existing DuckDB secret. Do not request secret values in chat.
- Bucket not found / 404 -> check the URL and region
- Timeout on large listing -> suggest narrowing the glob pattern or adding a prefix
