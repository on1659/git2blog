---
title: Svelte + Express 5로 다나와 스타일 UI 구현하기
subtitle: SPA 라우팅, 카테고리 탭, 검색어 자동보정까지
slug: svelte-express5-spa-routing
tags: [AI, 사이드프로젝트, Svelte, Express, SPA]
---

처음엔 React로 시작했다. 아니, 정확히는 Next.js였다.

근데 배포하니까 문제가 있었다. Vercel에서 API 라우트랑 프론트엔드 라우트가 충돌했다.

그래서 Svelte로 갈아탔다. 결론부터 말하면 잘한 선택이었다.

---

Svelte는 다르다.

React나 Vue는 런타임에 가상 DOM을 만들고 비교한다. Svelte는 빌드 타임에 실제 DOM 조작 코드를 생성한다.

번들 크기가 작다. 런타임 오버헤드가 없다.

```svelte
<!-- App.svelte -->
<script>
  let count = 0;
</script>

<button on:click={() => count++}>
  Clicked {count} times
</button>
```

이게 전부다. React면 useState, useEffect import하고, JSX 쓰고, 번들에 React 런타임이 포함된다. Svelte는 저 코드만 있으면 된다.

프로젝트 규모가 작을수록 Svelte가 빛난다. vapecompare는 작은 프로젝트다. 딱 맞았다.

---

Express 5를 썼다. 아직 베타지만 쓸 만하다.

Express 4와 가장 큰 차이는 async/await 에러 처리다.

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

Express 5는 async 함수에서 throw된 에러를 자동으로 next로 넘긴다. try-catch 지옥에서 벗어났다.

근데 Express 5에서 와일드카드 라우트 문법이 바뀌었다.

```typescript
// Express 4
app.get('*', (req, res) => res.sendFile('index.html'));

// Express 5
app.get('/*', (req, res) => res.sendFile('index.html'));
```

`*` 대신 `/*`를 써야 한다. 이거 때문에 30분 날렸다. 에러 메시지가 명확하지 않았다.

---

SPA 라우팅이 문제였다.

Svelte로 SPA를 만들면 클라이언트 사이드 라우팅을 써야 한다. 근데 새로고침을 하면 404가 뜬다.

서버가 `/search` 경로에 해당하는 파일을 찾으려고 하는데, 없으니까.

해결책은 간단했다. 모든 요청을 index.html로 리다이렉트하는 거다.

```typescript
// server.ts
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// API 라우트
app.get('/api/search', async (req, res) => {
  const result = await searchNaver(req.query.q);
  res.json(result);
});

// 정적 파일
app.use(express.static(path.join(__dirname, 'public')));

// SPA 폴백 - 모든 다른 요청은 index.html로
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
```

이제 `/search`로 직접 접속해도 index.html이 로드되고, Svelte가 URL을 보고 올바른 컴포넌트를 렌더링한다.

---

카테고리 탭을 만들었다.

전자담배 관련 제품은 크게 두 가지다. 액상이랑 기기/코일.

사용자가 둘을 구분해서 볼 수 있으면 좋겠다고 생각했다.

```svelte
<script>
  let activeTab = 'liquid';
</script>

<div class="tabs">
  <button 
    class:active={activeTab === 'liquid'} 
    on:click={() => activeTab = 'liquid'}
  >
    액상
  </button>
  <button 
    class:active={activeTab === 'device'} 
    on:click={() => activeTab = 'device'}
  >
    기기/코일
  </button>
</div>

{#if activeTab === 'liquid'}
  <LiquidList />
{:else}
  <DeviceList />
{/if}
```

Svelte의 `class:` 디렉티브가 편하다. 조건부 클래스 적용이 한 줄이다.

React면 `className={activeTab === 'liquid' ? 'active' : ''}` 이렇게 써야 한다.

---

탭 전환 시 URL도 바뀌게 했다.

사용자가 기기 탭을 보고 있는 상태에서 새로고침을 하면 기기 탭이 유지돼야 한다. 공유 링크를 보냈을 때도 마찬가지다.

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

URL 쿼리 파라미터로 탭 상태를 관리한다. `?tab=device` 이런 식이다.

SvelteKit의 `$app/stores`를 쓰면 현재 URL에 반응형으로 접근할 수 있다. `$:` 반응형 선언으로 activeTab이 URL 변화에 따라 자동 업데이트된다.

---

검색어 입력 필드를 만들었다.

단순한 입력 필드 같지만, 고민할 게 있었다.

첫째, 엔터키로 검색해야 한다. 둘째, 입력 중에는 검색을 하면 안 된다. 셋째, 빈 문자열일 때는 검색을 막아야 한다.

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
  placeholder="액상 이름을 입력하세요"
/>
```

`bind:value`로 입력값을 양방향 바인딩했다. `bind:this`로 DOM 요소에 접근할 수 있다. 나중에 포커스를 줄 때 필요하다.

---

검색어 자동보정 피드백을 추가했다.

사용자가 "mango"라고 치면 "망고"로 검색된다. 근데 사용자는 왜 "mango"를 쳤는데 "망고" 결과가 나오는지 모를 수 있다.

그래서 보정된 검색어를 화면에 표시했다.

```svelte
{#if correctedQuery && correctedQuery !== originalQuery}
  <p class="correction">
    "{originalQuery}" → "{correctedQuery}"로 검색합니다
  </p>
{/if}
```

이제 사용자가 "mango"를 치면 "'mango' → '망고'로 검색합니다"라고 뜬다. 왜 결과가 바뀌었는지 알 수 있다.

---

뒤로가기 처리도 했다.

검색 결과에서 제품을 클릭하면 네이버 쇼핑이 새 탭에서 열린다. 근데 사용자가 뒤로가기를 누르면?

브라우저는 이전 페이지로 돌아간다. 근데 SPA에서는 이전 "상태"로 돌아가야 한다.

SvelteKit의 내장 히스토리 관리를 썼다. `goto` 함수에 `replaceState: true` 옵션을 주면 히스토리에 쌓이지 않는다. `pushState`를 쓰면 히스토리에 쌓인다.

```svelte
function search(q) {
  goto(`?q=${encodeURIComponent(q)}`, { keepFocus: true });
}
```

`keepFocus` 옵션을 주면 검색 후에도 입력 필드에 포커스가 유지된다. 작은 디테일인데 사용성에 큰 차이를 만든다.

---

로딩 상태 표시도 추가했다.

API 호출 중에는 스켈레톤 UI를 보여준다. 빈 화면보다 낫다.

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

CSS로 스켈레톤 애니메이션을 줬다.

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

이렇게 하면 카드가 왼쪽에서 오른쪽으로 반짝이는 효과가 난다. 로딩 중이라는 느낌을 준다.

---

반응형 디자인도 신경 썼다.

모바일에서도 쓸 수 있어야 한다. 가격비교는 이동 중에 많이 하니까.

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

모바일에서는 구매 버튼이 전체 너비로 펼쳐진다. 클릭하기 편하게.

---

여기까지 하고 보니까 그럴싸한 SPA가 됐다.

라우팅, 탭 전환, 검색, 로딩 상태, 반응형 디자인. 다나와 수준은 아니지만, MVP로는 충분하다.

Svelte로 바꾸길 잘했다는 생각이 든다. 코드가 간결하고, 성능도 좋고, 배포도 쉬웠다.

다음 프로젝트도 Svelte를 쓸 것 같다.

> 프레임워크 선택은 프로젝트 규모에 맞춰라. 대포로 새를 잡을 필요 없다.