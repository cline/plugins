# Package URL (PURL) Format by Ecosystem

PURLs follow the spec at https://github.com/package-url/purl-spec. Format: `pkg:<type>/<namespace>/<name>@<version>`

## Common Parsing Mistakes

When building PURLs from dependency manifests, strip everything that isn't the package identifier and exact version:

| Manifest syntax | Mistake | Correct PURL |
|---|---|---|
| `Flask[async]==2.3.0` (pip extras) | Including `[async]` | `pkg:pypi/flask@2.3.0` |
| `scikit_learn==1.3.2` (underscore) | Keeping underscore | `pkg:pypi/scikit-learn@1.3.2` |
| `requests>=2.28.0,<3.0.0` (range) | Using the range | `pkg:pypi/requests@2.28.0` (use resolved/lock version) |
| `"@babel/core": "^7.23.0"` (npm range) | Using `^7.23.0` | `pkg:npm/%40babel/core@7.23.0` (use lock version) |
| `github.com/jackc/pgx/v5 v5.5.0` (Go v2+ module) | Dropping `/v5` from path | `pkg:golang/github.com/jackc/pgx/v5@5.5.0` |
| `github.com/gin-gonic/gin v1.9.1` (Go v prefix) | Keeping `v` in version | `pkg:golang/github.com/gin-gonic/gin@1.9.1` |

Key rule: Always prefer lock file versions or other exact resolved versions over manifest ranges. If only a range is available, say the result is approximate and ask for a lockfile or resolved version before treating the dependency as checked.

## Maven / Gradle

```
pkg:maven/<groupId>/<artifactId>@<version>
```

- Namespace (groupId) is required
- Gradle projects use Maven PURLs since they resolve from Maven repositories

Examples:
```
pkg:maven/org.apache.logging.log4j/log4j-core@2.23.1
pkg:maven/com.google.guava/guava@33.0.0-jre
pkg:maven/org.springframework.boot/spring-boot-starter-web@3.2.0
```

## NPM

```
pkg:npm/<name>@<version>
pkg:npm/%40<scope>/<name>@<version>
```

- Scoped packages: encode `@` as `%40` in the namespace
- Version optional for latest lookups

Examples:
```
pkg:npm/express@4.18.2
pkg:npm/lodash@4.17.21
pkg:npm/%40angular/core@17.0.0
pkg:npm/%40types/node@20.10.0
```

## PyPI

```
pkg:pypi/<name>@<version>
```

- Package names are case-insensitive and normalized (underscores -> hyphens)
- Use the normalized name (lowercase, hyphens)

Examples:
```
pkg:pypi/requests@2.31.0
pkg:pypi/django@5.0
pkg:pypi/scikit-learn@1.3.2
pkg:pypi/numpy@1.26.2
```

## NuGet

```
pkg:nuget/<name>@<version>
```

Examples:
```
pkg:nuget/Newtonsoft.Json@13.0.3
pkg:nuget/Microsoft.EntityFrameworkCore@8.0.0
pkg:nuget/Serilog@3.1.1
```

## Go

```
pkg:golang/<module-path>@<version>
```

- Module path includes the full import path
- Version includes the `v` prefix in Go but omit it in the PURL

Examples:
```
pkg:golang/github.com/gin-gonic/gin@1.9.1
pkg:golang/google.golang.org/grpc@1.60.0
pkg:golang/github.com/stretchr/testify@1.8.4
```

## RubyGems

```
pkg:gem/<name>@<version>
```

Examples:
```
pkg:gem/rails@7.1.2
pkg:gem/nokogiri@1.15.4
```

## Cargo (Rust)

```
pkg:cargo/<name>@<version>
```

Examples:
```
pkg:cargo/serde@1.0.193
pkg:cargo/tokio@1.35.0
```

## Cocoapods (Swift/Objective-C)

```
pkg:cocoapods/<name>@<version>
```

Examples:
```
pkg:cocoapods/Alamofire@5.8.1
pkg:cocoapods/SDWebImage@5.18.5
```

## Hex (Elixir/Erlang)

```
pkg:hex/<name>@<version>
```

Examples:
```
pkg:hex/phoenix@1.7.10
pkg:hex/ecto@3.11.1
```
