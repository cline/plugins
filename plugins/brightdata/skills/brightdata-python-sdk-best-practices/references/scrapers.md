# Platform Scrapers & Search Methods

All methods below work with `BrightDataClient` (async) -- prefix calls with `await`. `SyncBrightDataClient` (sync) uses the same method names without `await`, but has limited platform coverage:

- Sync scraping supports: Amazon, LinkedIn, Instagram, Facebook, ChatGPT, Pinterest
- Sync search supports: Google, Bing, Yandex, Amazon, LinkedIn, Instagram, ChatGPT, Pinterest

For TikTok, YouTube, Reddit, Perplexity, and DigiKey, use the async client. For non-blocking execution, call the `_trigger()` variant (e.g., `products_trigger()`) which returns a `ScrapeJob` object -- see `advanced.md` for execution patterns.

Return types: scraper methods return `ScrapeResult` (with `.data`, `.status`, `.cost`, `.success`). Most search methods also return `ScrapeResult`. Some (Amazon, LinkedIn, Instagram, ChatGPT) return `SearchResult` (with `.data`, `.total_results`, `.query`).

---

## Amazon

### Scraping (`client.scrape.amazon`)
- `products(url, timeout=240)` -> ScrapeResult -- product details, price, ratings, specs
- `reviews(url, timeout=240)` -> ScrapeResult -- product reviews with rating, text, date
- `sellers(url, timeout=240)` -> ScrapeResult -- seller info, ratings, shipping details

### Search (`client.search.amazon`)
- `products(keyword, min_price=, max_price=, prime_eligible=, category=, condition=)` -> SearchResult

---

## LinkedIn

### Scraping (`client.scrape.linkedin`)
- `profiles(url, timeout=180)` -> ScrapeResult -- profile data, experience, education
- `companies(url, timeout=180)` -> ScrapeResult -- company info, size, industry
- `jobs(url, timeout=180)` -> ScrapeResult -- job posting details
- `posts(url, timeout=180)` -> ScrapeResult -- post content, engagement

### Search (`client.search.linkedin`)
- `profiles(firstName=, lastName=, ...)` -> SearchResult
- `jobs(keyword, location=, remote=, ...)` -> SearchResult
- `posts(profile_url, start_date=, end_date=, ...)` -> SearchResult

---

## Facebook

### Scraping (`client.scrape.facebook`)
- `posts_by_profile(url, num_of_posts=, start_date=, end_date=, timeout=240)` -> ScrapeResult
- `posts_by_group(url, num_of_posts=, start_date=, end_date=, timeout=240)` -> ScrapeResult
- `posts_by_url(url, timeout=240)` -> ScrapeResult -- single post by direct URL
- `comments(url, num_of_comments=, start_date=, end_date=, timeout=240)` -> ScrapeResult
- `reels(url, num_of_posts=, start_date=, end_date=, timeout=240)` -> ScrapeResult

---

## Instagram

### Scraping (`client.scrape.instagram`)
- `profiles(url, timeout=240)` -> ScrapeResult -- profile data, follower count, bio
- `posts(url, num_of_posts=, timeout=240)` -> ScrapeResult
- `comments(url, num_of_comments=, timeout=240)` -> ScrapeResult
- `reels(url, num_of_posts=, start_date=, end_date=, timeout=240)` -> ScrapeResult

### Search (`client.search.instagram`)
- `posts(url, num_of_posts=, post_type=, ...)` -> SearchResult
- `reels(url, num_of_posts=, start_date=, end_date=, ...)` -> SearchResult

---

## YouTube

### Scraping (`client.scrape.youtube`)
- `videos(url, country=, transcription_language=, timeout=240)` -> ScrapeResult -- video data, transcript
- `channels(url, timeout=240)` -> ScrapeResult -- channel info, subscriber count
- `comments(url, num_of_comments=, timeout=240)` -> ScrapeResult

### Search (`client.search.youtube`)
- `videos_by_keyword(keyword, num_of_posts=, ...)` -> ScrapeResult
- `videos_by_hashtag(hashtag, num_of_posts=, ...)` -> ScrapeResult
- `videos_by_channel(url, num_of_posts=, ...)` -> ScrapeResult
- `videos_by_explore(num_of_posts=, ...)` -> ScrapeResult
- `videos_by_search_filters(keyword, num_of_posts=, ...)` -> ScrapeResult
- `channels_by_keyword(keyword, ...)` -> ScrapeResult

---

## TikTok

### Scraping (`client.scrape.tiktok`)
- `profiles(url, country=, timeout=240)` -> ScrapeResult
- `posts(url, timeout=240)` -> ScrapeResult
- `comments(url, num_of_comments=, timeout=240)` -> ScrapeResult
- `posts_by_profile_fast(url, timeout=240)` -> ScrapeResult -- high-speed post collection from profile
- `posts_by_url_fast(url, timeout=240)` -> ScrapeResult -- high-speed post data from URL
- `posts_by_search_url_fast(url, timeout=240)` -> ScrapeResult -- high-speed posts from search URL

### Search (`client.search.tiktok`)
- `profiles(search_url, country=, ...)` -> SearchResult
- `posts_by_keyword(keyword, num_of_posts=, ...)` -> SearchResult
- `posts_by_profile(url, num_of_posts=, ...)` -> SearchResult
- `posts_by_url(url, ...)` -> SearchResult

---

## Reddit

### Scraping (`client.scrape.reddit`)
- `posts(url, timeout=240)` -> ScrapeResult -- post content, score, author
- `posts_by_keyword(keyword, sort_by=, timeout=240)` -> ScrapeResult
- `posts_by_subreddit(url, sort_by=, timeout=240)` -> ScrapeResult
- `comments(url, days_back=, timeout=240)` -> ScrapeResult

---

## ChatGPT

### Scraping (`client.scrape.chatgpt`)
- `prompt(prompt, country=, web_search=, additional_prompt=, timeout=120)` -> ScrapeResult -- single or batch prompts
  - Pass a string for single prompt, list of strings for batch
  - `web_search`: enable/disable web search in response

### Search (`client.search.chatgpt`)
- `prompt(prompt, country=, webSearch=)` -> SearchResult

---

## Perplexity

### Scraping (`client.scrape.perplexity`)
- `search(prompt, country=, timeout=180)` -> ScrapeResult -- AI search with citations

---

## Pinterest

### Scraping (`client.scrape.pinterest`)
- `posts(url, timeout=240)` -> ScrapeResult -- pin data, images, descriptions
- `profiles(url, timeout=240)` -> ScrapeResult -- profile data, boards, follower count

### Search (`client.search.pinterest`)
- `posts_by_keyword(keyword, videos_only=, ...)` -> ScrapeResult
- `posts_by_profile(url, num_of_posts=, ...)` -> ScrapeResult
- `profiles(keyword, ...)` -> ScrapeResult

---

## DigiKey

### Scraping (`client.scrape.digikey`)
- `products(url, timeout=240)` -> ScrapeResult -- electronic component data, specs, pricing
- `discover_by_category(url, timeout=240)` -> ScrapeResult -- browse components by category
