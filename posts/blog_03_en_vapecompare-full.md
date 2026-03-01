---
title: Building a Price Comparison Service with Naver Shopping API and Svelte
subtitle: Developing vapecompare, a vape liquid price comparison service
slug: vapecompare-naver-api-svelte
tags: [AI, side-project, naver-api, Svelte, Express]
---

Vape liquid prices vary wildly depending on where you buy. Same product, 8,000 won here, 12,000 won there.

I thought it would be nice to compare them at a glance.

So I built vapecompare.

---

The idea was simple. Use Naver Shopping API. They have the most seller data in Korea.

But when I actually started building, there was more to do than I expected. API integration, data filtering, deduplication, caching, and UI.

Let me break it down.

---

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

Naver Shopping API provides category information. I filtered to only keep items with "액상" (liquid) in the category name.

```typescript
// Filter to liquid category only
const products = data.items.filter(item => 
  item.category3Name?.includes('액상') || 
  item.category4Name?.includes('액상')
);
```

Now only liquids show up. But there's another problem.

---

Same product, multiple entries.

"Mango 30ml" appears 5 times from different sellers. Users probably want to see each product once.

I deduplicated by productId. But productId alone wasn't enough. Same product, different productId sometimes.

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

Now "Mango 30ml" and "Mango  30ml" are recognized as the same product.

---

API call volume was a concern. Added caching. 10 minute TTL.

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

---

Data ready. Next: UI.

Started with React. Next.js, to be precise. But deployment revealed a problem. Vercel had conflicts between API routes and frontend routes.

Switched to Svelte. Good decision.

Svelte is different. React and Vue create virtual DOMs at runtime and diff them. Svelte generates actual DOM manipulation code at build time.

Smaller bundles. No runtime overhead.

```svelte
<script>
  let count = 0;
</script>

<button on:click={() => count++}>
  Clicked {count} times
</button>
```

That's it. The smaller the project, the more Svelte shines. vapecompare is a small project. Perfect fit.

---

Used Express 5. Beta, but usable.

Biggest difference from Express 4 is async/await error handling.

```typescript
// Express 5 automatically passes async errors to next()
app.get('/api/search', async (req, res) => {
  const result = await search(req.query.q);
  res.json(result);
});
```

No more try-catch hell.

But Express 5 changed the wildcard route syntax. Must use `/*` instead of `*`. Wasted 30 minutes on this.

---

SPA routing was the challenge.

Building an SPA with Svelte means client-side routing. But refreshing gives a 404.

Solution was simple. Redirect all requests to index.html.

```typescript
// SPA fallback
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
```

---

Built category tabs. Vape products fall into two categories: liquids and devices/coils.

```svelte
<script>
  let activeTab = 'liquid';
</script>

<div class="tabs">
  <button class:active={activeTab === 'liquid'} on:click={() => activeTab = 'liquid'}>
    Liquids
  </button>
  <button class:active={activeTab === 'device'} on:click={() => activeTab = 'device'}>
    Devices/Coils
  </button>
</div>
```

Svelte's `class:` directive is convenient. Conditional class in one line.

---

Handled search auto-correction too.

User types "mango", searches for "망고" (Korean). But user might not know why results changed.

So I show the corrected term.

```svelte
{#if correctedQuery && correctedQuery !== originalQuery}
  <p class="correction">
    Searching "{correctedQuery}" instead of "{originalQuery}"
  </p>
{/if}
```

---

Added loading state. During API calls, show skeleton UI.

```svelte
{#if loading}
  <div class="skeleton">
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  </div>
{:else}
  {#each products as product}
    <ProductCard {product} />
  {/each}
{/if}
```

CSS animation makes cards shimmer left to right.

---

Responsive design too. Needs to work on mobile.

```css
@media (max-width: 600px) {
  .product-card {
    grid-template-columns: 80px 1fr;
  }
  
  .product-card a {
    grid-column: span 2;
  }
}
```

On mobile, buy button spans full width.

---

Deployed to Vercel. Frontend in Svelte, backend in Express.

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

Fetch data from Naver Shopping API, filter to liquids only, remove duplicates, add caching. Build UI with Svelte, API server with Express 5, deploy to Vercel.

Each step had its struggles. API responses had weird stuff mixed in, rewrote filtering logic three times. Express 5 wildcard syntax changed, wasted 30 minutes. SPA routing 404 issue solved.

But this struggle is the fun of development.

Glad I switched to Svelte. Clean code, good performance, easy deployment.

> APIs are tools. What matters is how you show the data.