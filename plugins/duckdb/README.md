# DuckDB

DuckDB adds Cline skills for local and remote data exploration with the DuckDB CLI. It helps inspect files, convert data formats, run bounded SQL, attach DuckDB databases, search DuckDB docs, work with object storage, and handle spatial data.

## Cline Primitives

This is a skills-only plugin. It does not register MCP servers, tools, hooks, or commands.

The bundled skills cover:

- `duckdb-setup` for checking DuckDB and installing or updating extensions.
- `duckdb-read-file` for profiling CSV, JSON, Parquet, Avro, Excel, SQLite, spatial files, notebooks, and remote files.
- `duckdb-convert-file` for writing Parquet, CSV, JSON, Excel, GeoJSON, GeoPackage, Shapefile, and partitioned outputs.
- `duckdb-attach-db` for attaching DuckDB database files and maintaining shared project state.
- `duckdb-query` for bounded SQL and natural-language analysis over attached databases or ad-hoc files.
- `duckdb-docs` for searching DuckDB and DuckLake documentation indexes.
- `duckdb-s3-explore` for S3, R2, GCS, MinIO, HTTPS, and S3-compatible object-storage exploration.
- `duckdb-spatial` for spatial extension workflows, Overture Maps, distances, containment checks, and geospatial format conversion.

## Requirements

Most workflows require the `duckdb` CLI on PATH. Some file formats or remote sources require DuckDB extensions such as `httpfs`, `spatial`, `excel`, `sqlite_scanner`, or community extensions.

DuckDB can read local files and remote object storage. Ask before installing software, writing converted output files, appending persistent state, creating secrets, or running expensive remote scans. This plugin does not include session-log search skills; do not use DuckDB workflows to search private Cline or other assistant session logs.
