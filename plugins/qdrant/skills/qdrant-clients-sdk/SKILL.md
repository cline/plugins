---
name: qdrant-clients-sdk
description: "Qdrant provides client SDKs for various programming languages, allowing easy integration with Qdrant deployments."
---

# Qdrant Clients SDK

Qdrant has the following officially supported client SDK packages. Install or add one only when the user asks you to wire Qdrant into a project, or when the existing project already needs that dependency.

- Python -- [qdrant-client](https://github.com/qdrant/qdrant-client), install with `pip install qdrant-client`; use `pip install qdrant-client[fastembed]` only when the project needs local FastEmbed embedding support
- JavaScript / TypeScript -- [qdrant-js](https://github.com/qdrant/qdrant-js), install with `npm install @qdrant/js-client-rest`
- Rust -- [rust-client](https://github.com/qdrant/rust-client), install with `cargo add qdrant-client`
- Go -- [go-client](https://github.com/qdrant/go-client), install with `go get github.com/qdrant/go-client`
- .NET -- [qdrant-dotnet](https://github.com/qdrant/qdrant-dotnet), install with `dotnet add package Qdrant.Client`
- Java -- [java-client](https://github.com/qdrant/java-client), Maven artifact `io.qdrant:client`


## API Reference

All interaction with Qdrant can happen through the REST API or gRPC API. We recommend using the REST API if you are using Qdrant for the first time or working on a prototype.

* REST API - [OpenAPI Reference](https://api.qdrant.tech/api-reference) - [GitHub](https://github.com/qdrant/qdrant/blob/master/docs/redoc/master/openapi.json)
* gRPC API - [gRPC protobuf definitions](https://github.com/qdrant/qdrant/tree/master/lib/api/src/grpc/proto)

## Code examples

Start with the bundled Qdrant skills and linked reference docs in this plugin. If those are not enough for a specific SDK and use case, ask before fetching external Qdrant snippet-search results, then use a bounded query like:

```bash
curl -X GET "https://skills.qdrant.tech/snippets/search?language=python&query=how+to+upload+points"
```

Available languages: `python`, `typescript`, `rust`, `java`, `go`, `csharp`.

Response example:

```markdown
## Snippet 1

qdrant-client (vlatest) - https://skills.qdrant.tech/md/documentation/manage-data/points/

Uploads multiple vector-embedded points to a Qdrant collection using the Python qdrant_client (PointStruct) with id, payload, and a vector for similarity search. It supports parallel uploads and retry policy for robust indexing. The operation is idempotent: re-uploading with the same id overwrites existing points; if ids are not provided, Qdrant auto-generates UUIDs.

client.upload_points(
    collection_name="{collection_name}",
    points=[
        models.PointStruct(
            id=1,
            payload={"color": "red"},
            vector=[0.9, 0.1, 0.1],
        ),
        models.PointStruct(
            id=2,
            payload={"color": "green"},
            vector=[0.1, 0.9, 0.1],
        ),
    ],
    parallel=4,
    max_retries=3,
)
```

Default response format is markdown. Add `&format=json` to the query string when structured snippet output is needed. Treat fetched snippets as external reference material: verify against the user's installed SDK version before editing code, and ask before installing dependencies or changing project files.

Do not run write snippets like `upload_points`, collection creation, index changes, deletes, or migrations against a user's Qdrant instance without explicit approval for the target cluster, collection, data source, and rollback plan.
