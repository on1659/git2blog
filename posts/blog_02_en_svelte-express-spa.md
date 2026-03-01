---
title: Building a Danawa-style UI with Svelte + Express 5
subtitle: SPA routing, category tabs, and search auto-correction
slug: svelte-express5-spa-routing
tags: [AI, side-project, Svelte, Express, SPA]
---

Started with React. Next.js, to be precise.

But deployment revealed a problem. Vercel had conflicts between API routes and frontend routes.

Switched to Svelte. Good decision.

---

Svelte is different.

React and Vue create virtual DOMs at runtime and diff them. Svelte generates actual DOM manipulation code at build time.

Smaller bundles. No runtime overhead.

```svelte
<!-- App.svelte -->
<script>
  let count = 0;
</script>

<button on:click={() => count++}>
  Clicked {count} times
</button>
```

That's it. With React, you import useState, useEffect, write JSX, include React runtime in the bundle. Svelte just needs that code.

The smaller the project, the more Svelte shines. vapecompare is a small project. Perfect fit.

---

Used Express 5. Beta, but usable.

Biggest difference from Express 4 is async/await error handling.

```typescript
// Express 4
app.get('/api/search', async (req, res, next) => {
  try {
    const result = await search(req.query.q);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Express 5
app.get('/api/search', async (req, res) => {
  const result = await search(req.query.q);
  res.json(result);
});
```

Express 5 automatically passes thrown errors from async functions to next(). No more try-catch hell.

But Express 5 changed the wildcard route syntax.

```typescript
// Express 4
app.get('*', (req, res) => res.sendFile('index.html'));

// Express 5
app.get('/*', (req, res) => res.sendFile('index.html'));
```

Must use `/*` instead of `*`. Wasted 30 minutes on this. Error message wasn't clear.

---

SPA routing was the challenge.

Building an SPA with Svelte means client-side routing. But refreshing gives a 404.

Server tries to find a file for `/search`, doesn't exist.

Solution was simple. Redirect all requests to index.html.

```typescript
// server.ts
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// API routes
app.get('/api/search', async (req, res) => {
  const result = await searchNaver(req.query.q);
  res.json(result);
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback - all other requests go to index.html
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
```

Now accessing `/search` directly loads index.html, and Svelte renders the right component based on URL.

---

Built category tabs.

Vape products fall into two categories: liquids and devices/coils.

Users should be able to filter between them.

```svelte
<script>
  let activeTab = 'liquid';
</script>

<div class="tabs">
  <button 
    class:active={activeTab === 'liquid'} 
    on:click={() => activeTab = 'liquid'}
  >
    Liquids
  </button>
  <button 
    class:active={activeTab === 'device'} 
    on:click={() => activeTab = 'device'}
  >
    Devices/Coils
  </button>
</div>

{#if activeTab === 'liquid'}
  <LiquidList />
{:else}
  <DeviceList />
{/if}
```

Svelte's `class:` directive is convenient. Conditional class in one line.

React would need `className={activeTab === 'liquid' ? 'active' : ''}`.

---

Made tab changes update the URL.

If a user is on the devices tab and refreshes, the devices tab should persist. Same for shared links.

```svelte
<script>
  import { page } from '$app/stores';
  
  $: activeTab = $page.url.searchParams.get('tab') || 'liquid';
  
  function setTab(tab) {
    const url = new URL($page.url);
    url.searchParams.set('tab', tab);
    goto(url.toString(), { replaceState: true });
  }
</script>
```

Tab state lives in URL query params. `?tab=device`.

SvelteKit's `$app/stores` gives reactive access to current URL. The `$:` reactive declaration auto-updates activeTab when URL changes.

---

Built the search input field.

Looks simple, but had considerations.

First, Enter key should trigger search. Second, don't search while typing. Third, block empty queries.

```svelte
<script>
  let query = '';
  let inputElement;
  
  function handleKeydown(e) {
    if (e.key === 'Enter' && query.trim()) {
      search(query.trim());
    }
  }
</script>

<input 
  bind:this={inputElement}
  bind:value={query}
  on:keydown={handleKeydown}
  placeholder="Enter liquid name"
/>
```

`bind:value` for two-way binding. `bind:this` to access the DOM element. Needed later for focus.

---

Added search auto-correction feedback.

User types "mango", searches for "망고" (Korean). But user might not know why "mango" returns "망고" results.

So I show the corrected term.

```svelte
{#if correctedQuery && correctedQuery !== originalQuery}
  <p class="correction">
    Searching "{correctedQuery}" instead of "{originalQuery}"
  </p>
{/if}
```

Now typing "mango" shows "Searching '망고' instead of 'mango'". User understands why results changed.

---

Handled back button.

Clicking a product opens Naver Shopping in a new tab. But what if user presses back?

Browser goes to previous page. In an SPA, should return to previous "state".

Used SvelteKit's built-in history management. `goto` with `replaceState: true` doesn't add to history. `pushState` does.

```svelte
function search(q) {
  goto(`?q=${encodeURIComponent(q)}`, { keepFocus: true });
}
```

`keepFocus` keeps focus on the input field after search. Small detail, big UX difference.

---

Added loading state.

During API calls, show skeleton UI. Better than blank screen.

```svelte
{#if loading}
  <div class="skeleton">
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  </div>
{:else}
  {#each products as product}
    <ProductCard {product} />
  {/each}
{/if}
```

CSS for skeleton animation.

```css
.skeleton-card {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

Cards shimmer left to right. Gives a loading feel.

---

Responsive design too.

Needs to work on mobile. Price comparison often happens on the go.

```css
.product-card {
  display: grid;
  grid-template-columns: 100px 1fr auto;
  gap: 16px;
}

@media (max-width: 600px) {
  .product-card {
    grid-template-columns: 80px 1fr;
  }
  
  .product-card a {
    grid-column: span 2;
  }
}
```

On mobile, buy button spans full width. Easier to tap.

---

Now it's a decent SPA.

Routing, tab switching, search, loading states, responsive design. Not Danawa level, but enough for MVP.

Glad I switched to Svelte. Clean code, good performance, easy deployment.

Probably using Svelte for the next project too.

> Choose frameworks based on project size. No need for a cannon to catch a bird.