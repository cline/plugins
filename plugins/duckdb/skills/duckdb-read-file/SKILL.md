---
name: duckdb-read-file
description: >
  Read any data file (CSV, JSON, Parquet, Avro, Excel, spatial, SQLite) or remote URL (S3, HTTPS).
  Use when user references a data file, asks "what's in this file", or wants to preview/profile a dataset.
  Not for source code.
---

You are helping the user read and analyze a data file using DuckDB.

Filename or URL: use the data file path or URL from the current user request.
Question: answer the user's requested question about the data; if none was provided, describe the data.

## Step 1 - Read it

`RESOLVED_PATH` is the resolved requested file path or URL. If the user gave a bare filename (no `/`), resolve it to a full path with `find` first.

Choose the narrowest reader for the file extension, then run one DuckDB command that describes, counts, and samples the file. Do not define a macro that references every optional reader at once; optional extensions such as `spatial`, `excel`, `sqlite_scanner`, and `avro` should only be loaded when the selected format needs them.

For remote files, prepend the necessary LOAD/SECRET before the macro:

| Protocol | Prepend |
|---|---|
| `https://` / `http://` | `LOAD httpfs;` |
| `s3://` | `LOAD httpfs; CREATE SECRET (TYPE S3, PROVIDER credential_chain);` |
| `gs://` / `gcs://` | `LOAD httpfs; CREATE SECRET (TYPE GCS, PROVIDER credential_chain);` |
| `az://` / `azure://` / `abfss://` | `LOAD httpfs; LOAD azure; CREATE SECRET (TYPE AZURE, PROVIDER credential_chain);` |

For local files, no prefix needed unless the selected reader requires an extension.

| File type | Extension loads | Reader expression |
|---|---|---|
| CSV/TSV/TXT | none | `read_csv('RESOLVED_PATH')` |
| JSON/JSONL/NDJSON/HAR/IPYNB | none | `read_json_auto('RESOLVED_PATH')` |
| Parquet/PQ | none | `read_parquet('RESOLVED_PATH')` |
| Avro | `INSTALL avro; LOAD avro;` | `read_avro('RESOLVED_PATH')` |
| Excel | `INSTALL excel; LOAD excel;` | `read_xlsx('RESOLVED_PATH')` |
| Spatial (`.shp`, `.gpkg`, `.fgb`, `.kml`, `.geojson`) | `INSTALL spatial; LOAD spatial;` | `st_read('RESOLVED_PATH')` |
| SQLite | `INSTALL sqlite_scanner; LOAD sqlite_scanner;` | `sqlite_scan('RESOLVED_PATH', '<table_name>')` |
| Unknown/binary | none | `read_blob('RESOLVED_PATH')` |

```bash
duckdb -csv -c "
<EXTENSION_LOADS>
DESCRIBE FROM <READER_EXPRESSION>;
SELECT count(*) AS row_count FROM <READER_EXPRESSION>;
FROM <READER_EXPRESSION> LIMIT 20;
"
```

If this fails:
- `duckdb: command not found` -> invoke `duckdb-setup` and retry.
- Missing extension (e.g. spatial files, xlsx, sqlite) -> invoke `duckdb-setup <extension>` and retry with the matching `LOAD`.
- SQLite without a table name -> list tables first with `sqlite_scan('RESOLVED_PATH', 'sqlite_master')` or another lightweight inspection, then rerun against the selected table.
- Wrong reader / parse error -> switch to the correct `read_*` function directly.

## Step 2 - Answer

Using the schema, row count, and sample rows, answer:

If the user did not ask a specific question, describe the data by summarizing column types, row count, and notable patterns.
