# Dataset Categories

The SDK provides access to 310+ pre-built datasets with historical and bulk data. Datasets return filtered snapshots -- not live data. Use `client.datasets.list()` at runtime to discover all available datasets and their attribute names.

Note: The datasets API is only available through the async client (`BrightDataClient`). `SyncBrightDataClient` does not currently support datasets.

---

## Categories

### E-commerce
Product listings, pricing, reviews, seller info from major platforms.
Includes: Amazon products, Amazon reviews, Amazon sellers, Amazon best sellers, eBay products, Walmart products, Etsy products, Best Buy products, Zalando products, Sephora products, Zara products, Target products, Shein products, and more.

### Social Media
Profiles, posts, comments, engagement data from social networks.
Includes: LinkedIn profiles, LinkedIn posts, Instagram profiles, Instagram posts, TikTok profiles, TikTok posts, Reddit posts, Facebook pages/posts, X/Twitter posts, YouTube videos, Pinterest posts, and more.

### Business & Company Data
Company information, employee data, funding, and enrichment.
Includes: Crunchbase companies, ZoomInfo companies, companies enriched, employees enriched, and more.

### Jobs & Careers
Job listings, salary data, company reviews.
Includes: LinkedIn job listings, Indeed jobs, Glassdoor jobs, Glassdoor reviews, Glassdoor companies, and more.

### Reviews & Ratings
Consumer reviews from various platforms.
Includes: Google Maps reviews, Yelp reviews, Trustpilot reviews, G2 reviews, Tripadvisor reviews, and more.

### Real Estate
Property listings, price history, rental data.
Includes: Zillow properties, Zillow price history, Airbnb properties, Booking listings, and regional platforms (Otodom Poland, etc.).

### Travel & Hospitality
Hotel listings, flight data, travel reviews.
Includes: Booking.com listings, Tripadvisor hotels, Airbnb properties, and more.

### Automotive
Vehicle listings and dealer information.
Includes: AutoTrader listings, Cars.com, and regional automotive platforms.

### Food & Delivery
Restaurant listings, menus, delivery platform data.
Includes: DoorDash, Uber Eats, Grubhub listings, and more.

### News & Media
News articles, press releases, media monitoring data.

### Finance
Stock data, financial reports, crypto market data.

### Education
University data, course listings, academic information.

---

## Working with Datasets

### 1. Discover available datasets
```
datasets = client.datasets.list()
```
Returns a list of all available datasets with their IDs and names.

### 2. Get dataset metadata
```
metadata = client.datasets.<name>.get_metadata()
```
Returns field schema -- use this to discover what fields you can filter on (field name, type, description).

### 3. Get a quick sample
```
snapshot_id = client.datasets.<name>.sample(records_limit=10)
data = client.datasets.<name>.download(snapshot_id)
```
Returns sample records without any filter. Useful for understanding the data shape.

### 4. Create a filtered snapshot
```
snapshot_id = client.datasets.<name>(
    filter={"name": "field_name", "operator": "=", "value": "target_value"},
    records_limit=1000
)
```
Supported filter operators: `=`, `!=`, `>`, `<`, `>=`, `<=`, `is_not_null`, `contains`, `and`, `or`.

### 5. Check snapshot status
```
status = client.datasets.<name>.get_status(snapshot_id)
```
Returns: `SnapshotStatus` with `.status` field: "scheduled", "building", "ready", or "failed". Also includes `.dataset_size` (records), `.file_size` (bytes), `.cost`.

### 6. Download snapshot data
```
data = client.datasets.<name>.download(
    snapshot_id,
    format="jsonl",      # default "jsonl". Also supports "json" and "csv"
    timeout=300,          # max wait in seconds (default 300)
    poll_interval=5       # seconds between status checks (default 5)
)
```
Blocks until the snapshot is ready, then returns `List[Dict]` of records. Snapshots can take up to 5 minutes to build for large datasets.

---

## Tips

- Dataset attribute names are snake_case: `amazon_products`, `linkedin_profiles`, `zillow_properties`
- Always call `get_metadata()` first to understand available filter fields before creating a snapshot
- Use `records_limit` to control cost -- start small, increase as needed
- Datasets return historical/bulk data, NOT live data. For real-time needs, use platform scrapers
- Download format "jsonl" is most efficient for large datasets
