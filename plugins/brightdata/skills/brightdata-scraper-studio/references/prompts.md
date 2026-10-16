# Writing descriptions for `scraper create`

The description you pass to `bdata scraper create <url> "<description>"` is the only signal the AI Flow has about what to extract. It is not a search query -- it is a spec. Treat it like one.

## The minimal contract

Every good description answers three questions:

1. What fields? Name each one explicitly.
2. From where on the page? Disambiguate when a value could appear in multiple places.
3. What conditions / shape? Handle variants (sale price vs regular price, missing fields, repeating items).

## Strong vs. weak -- side by side

### Product page

Weak (avoid):
```
"scrape this product page"
```

The AI has to guess every field. Output will be inconsistent across runs.

Stronger:
```
"Extract product details from this page."
```

Slightly better, still too vague. Which details? In what shape?

Strong:
```
"Extract the following fields from this product page:
 - title: the main product title near the top of the page
 - price: the current price shown to the buyer (number + currency)
 - original_price: the strike-through price, if present; otherwise null
 - currency: ISO 4217 code (e.g. USD, EUR)
 - image_url: the main product image, not the thumbnail gallery
 - availability: in_stock / out_of_stock / preorder
 - rating: average customer rating (number, 0-5)
 - review_count: total number of reviews"
```

Each field is named, located, and typed. The AI Flow has a clear target for every selector.

### Listing / search results page

Weak:
```
"scrape all products"
```

Strong:
```
"Extract the list of product cards from this search results page.
 For each card, capture:
 - title
 - price
 - image_url
 - product_url (absolute URL)
 - rating (if shown)
 Skip sponsored / ad cards. Return an array, one object per card.
 Stop at the end of the current page -- do not follow pagination."
```

The "skip ads", "absolute URL", and "stop at end of page" rules are the kind of guardrails the AI Flow needs.

### Article / blog post

Strong:
```
"Extract the article body from this page:
 - headline
 - subheadline (if present)
 - author_name
 - published_date (ISO 8601)
 - body_text (full article text as plain text, paragraphs joined by \n\n)
 - tags (array of strings)
 - hero_image_url
 Exclude: navigation, footer, related-articles widgets, comments."
```

## Patterns that consistently improve output

### Pattern 1 -- name the location when ambiguous

A price can appear in a recommendations sidebar, in a "frequently bought together" bundle, and on the main product. Always name *which* one.

```
"price: the main product price near the title, not the prices in
 the recommendations sidebar or the bundle widget"
```

### Pattern 2 -- handle the missing-field case explicitly

```
"original_price: the strike-through original price if a sale is
 active; null if no sale is shown"
```

Otherwise the AI Flow might omit the field, return an empty string, or hallucinate one.

### Pattern 3 -- name the shape for lists

```
"reviews: array of objects, each with:
 - author_name
 - rating (number 0-5)
 - body_text
 - published_date (ISO 8601)
 Include all reviews visible on the page."
```

### Pattern 4 -- exclude noise

For long pages with lots of nav / footer / ads, list what to skip:

```
"Exclude: site navigation, footer, cookie banner,
 related-products widget, recently-viewed widget,
 sponsored content blocks."
```

### Pattern 5 -- pin the data type

Numbers, dates, booleans, and URLs are the four types most often returned as strings by default. Pin them:

```
"price: number (not string), in USD"
"published_date: ISO 8601 (e.g. 2026-05-13T10:00:00Z)"
"in_stock: boolean"
"product_url: absolute URL (resolve relative paths)"
```

## Description anti-patterns

| Don't | Why |
|---|---|
| `"scrape this page"` | No fields named. AI has to invent the schema. |
| `"give me everything"` | Output is unpredictable and useless for downstream code. |
| `"extract data"` | Same. |
| `"like the Amazon scraper"` | The AI Flow doesn't know about other scrapers. Spell out the fields. |
| `"return CSV"` | Output format is controlled by the run-time flags (`--json`, `-o`), not the description. The scraper always emits structured data. |
| Multi-paragraph essays | The AI Flow performs better on structured field lists than on prose. |

## Iterating on a description

1. Run `create` with your first description. Save the output (`--pretty -o create.json`).
2. `run` the resulting `collector_id` against the same URL.
3. Inspect the data. Note what's missing, miscategorised, or duplicated.
4. Do not re-run `create` immediately -- open the existing collector in the web UI (`https://brightdata.com/cp/scrapers/{collector_id}`) and refine the selectors there.
5. If the structure is fundamentally wrong, then rebuild: `create` with a sharper description (use a new `--name` to keep the old one for comparison).
