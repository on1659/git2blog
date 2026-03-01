---
title: Building a Price Comparison Service with Naver Shopping API
subtitle: A web service for real-time vape liquid price comparison
slug: vapecompare-naver-shopping-api
tags: [AI, side-project, naver-api, price-comparison, Svelte]
---

Vape liquid prices vary wildly depending on where you buy. Same product, 8,000 won here, 12,000 won there.

I thought it would be nice to compare them at a glance.

So I built vapecompare.

---

The idea was simple. Use Naver Shopping API. They have the most seller data in Korea.

But when I actually started building, there was more to do than I expected.

API registration was straightforward. Naver Developer Center. Client ID, secret, environment variables. 25,000 free calls per day. Enough for a personal project.

```typescript
// Naver Shopping API call
const response = await fetch(
  `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=50`,
  {
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
    },
  }
);
```

First response came back. 50 search results.

I rendered them to the screen. Something felt off.

---

Non-liquids were mixed in.

Devices, coils, cases, pouches. Everything was in the search results. I searched for "mango" and got mango liquid, mango scented candles, even mango juice.

Naver Shopping API provides category information. Category1, Category2, Category3, Category4.

I filtered to only keep items with "액상" (liquid) in the category name.

```typescript
// Before: show all results
const products = data.items;

// After: filter to liquid category only
const products = data.items.filter(item => 
  item.category3Name?.includes('액상') || 
  item.category4Name?.includes('액상')
);
```

Now only liquids show up. But there's another problem.

---

Same product, multiple entries.

"Mango 30ml" appears 5 times from different sellers. Seller C version, Seller D version, Seller E version. Same product, separate results.

Users probably want to see each product once. With different prices listed.

I deduplicated by productId. Naver's unique identifier.

```typescript
// Before: includes duplicates
const unique = products;

// After: dedupe by productId + normalized title
const seen = new Set();
const unique = products.filter(p => {
  const key = `${p.productId}-${normalizeTitle(p.title)}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
```

But productId alone wasn't enough. Same product, different productId. Some sellers register products differently.

So I added title normalization.

```typescript
function normalizeTitle(title: string): string {
  return title
    .replace(/<[^>]*>/g, '')  // Remove HTML tags
    .replace(/\s+/g, ' ')      // Collapse whitespace
    .trim()
    .toLowerCase();
}
```

Now "Mango 30ml" and "Mango  30ml" are recognized as the same product. No more treating different whitespace as different products.

---

Got this far and tested.

Search "mango" and only liquids appear. No duplicates. Sorted by lowest price.

But I was worried about API call volume. Same query, multiple calls. User searches "mango", then searches "mango" again 5 minutes later. Two API calls for the same thing.

Added caching. 10 minute TTL.

```typescript
const cache = new Map<string, { data: any; expiry: number }>();

async function searchWithCache(query: string) {
  const cached = cache.get(query);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  
  const data = await searchNaver(query);
  cache.set(query, { data, expiry: Date.now() + 10 * 60 * 1000 });
  return data;
}
```

Same query doesn't hit the API for 10 minutes. Reduced server load, faster response times.

Stored cache in a Map. Didn't need Redis. Single server, not many users. Can migrate to Redis later if traffic grows.

---

Handled search typos too.

Someone might type "망구" instead of "망고" (mango). Or search "mango" in English. Or "망고액상" versus "망고 액상".

Added auto-correction logic.

```typescript
function normalizeSearchTerm(term: string): string {
  let normalized = term.trim();
  
  // English to Korean conversion (mango → 망고)
  const engToKor: Record<string, string> = {
    'mango': '망고', 'apple': '애플', 'grape': '포도',
    // ... more mappings
  };
  normalized = engToKor[normalized.toLowerCase()] || normalized;
  
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
}
```

Not perfect. But at least searching "mango" shows "망고" results.

Later I can use a Korean-English conversion library for cleaner results. MVP is enough for now.

---

Data ready. Next: UI.

I thought about how to display it. Simple list? Cards?

Referenced Danawa. The original price comparison site.

Danawa shows prices prominently. Seller name, shipping cost, coupon availability. Click to go to the shop.

Built something similar.

```svelte
<div class="product-card">
  <img src={product.image} alt={product.title} />
  <div class="info">
    <h3>{product.title}</h3>
    <p class="price">{product.lprice.toLocaleString()}원</p>
    <p class="shop">{product.mallName}</p>
  </div>
  <a href={product.link} target="_blank">See lowest price</a>
</div>
```

Another problem here. Naver Shopping API links go to Naver Shopping pages. Not directly to the actual shop.

Inconvenient for users. They want to go straight to the shop.

So I linked to Naver Shopping search instead. Send users to the search results page. Let them pick the seller there.

```typescript
const naverSearchUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(product.title)}`;
```

Not perfect, but Naver API constraints. They want to keep traffic on their site.

---

Now it's a decent price comparison service.

Type a liquid name, see prices sorted lowest first. Click to go to Naver Shopping search.

Similar UX to Danawa or Enuri. But specialized for vape liquids.

Vape liquids are different from typical shopping categories. Many brands, various sizes, different nicotine strengths. General price comparison sites don't distinguish these.

That's why a specialized service was needed.

---

Deployed to Vercel. Frontend in Svelte, backend in Express.

Put frontend and backend in the same repo. API routes at `/api`, frontend everywhere else.

```json
// vercel.json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

One domain handles both frontend and API.

---

To summarize the process.

Fetch data from Naver Shopping API, filter to liquids only, remove duplicates, add caching, handle typos, build UI, deploy.

Each step had its struggles. API responses had weird stuff mixed in, rewrote filtering logic three times. Deduplication needed title normalization when productId alone wasn't enough. Forgot TTL on caching at first, memory kept growing.

But this struggle is the fun of development.

Next post: how I built the UI with Svelte + Express 5. SPA routing, category tabs, back button handling.

> APIs are tools. What matters is how you show the data.