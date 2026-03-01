---
title: 네이버 쇼핑 API와 Svelte로 가격비교 서비스 만들기
subtitle: 전자담배 액상 가격비교 서비스 vapecompare 개발기
slug: vapecompare-naver-api-svelte
tags: [AI, 사이드프로젝트, 네이버API, Svelte, Express]
---

전자담배 액상 가격이 판매처마다 다르다. 같은 제품이 어디서는 8,000원, 어디서는 12,000원.

이걸 한눈에 비교할 수 있으면 좋겠다고 생각했다.

그래서 만들었다. vapecompare.

---

시작은 단순했다. 네이버 쇼핑 API를 쓰면 된다고 생각했다. 한국에서 가장 많은 판매처 데이터를 가진 곳이니까.

근데 막상 해보니까 할 게 많았다. API 연동, 데이터 필터링, 중복 제거, 캐싱, 그리고 UI까지.

하나씩 정리해본다.

---

네이버 쇼핑 API 신청은 네이버 개발자 센터에서 했다. 클라이언트 ID, 시크릿 받아서 환경변수에 넣었다. 하루 25,000건 무료. 개인 프로젝트론 충분하다.

```typescript
// 네이버 쇼핑 API 호출
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

첫 응답이 왔다. 50개의 검색 결과.

화면에 뿌려봤다. 근데 뭔가 이상하다.

---

액상이 아닌 것도 섞여 있다.

기기, 코일, 케이스, 파우치까지 전부 검색 결과에 포함됐다. "망고"라고 검색했는데 망고 액상뿐 아니라 망고 향 캔들, 망고 주스까지 나온다.

네이버 쇼핑 API는 카테고리 정보를 준다. 이중에서 카테고리명에 "액상"이 포함된 것만 남겼다.

```typescript
// 액상 카테고리만 필터링
const products = data.items.filter(item => 
  item.category3Name?.includes('액상') || 
  item.category4Name?.includes('액상')
);
```

이제 액상만 나온다. 근데 또 문제가 있다.

---

같은 제품이 여러 개다.

"망고 30ml"가 판매처별로 5개씩 검색 결과에 뜬다. 사용자 입장에선 같은 제품을 한 번만 보고 싶을 거다.

productId로 중복을 제거했다. 근데 productId만으로는 부족했다. 같은 제품인데 productId가 다른 경우가 있었다.

그래서 제목 정규화도 추가했다.

```typescript
function normalizeTitle(title: string): string {
  return title
    .replace(/<[^>]*>/g, '')  // HTML 태그 제거
    .replace(/\s+/g, ' ')      // 연속 공백 제거
    .trim()
    .toLowerCase();
}
```

이제 "망고 30ml"와 "망고  30ml"를 같은 제품으로 인식한다.

---

API 호출이 많아질 것 같았다. 캐싱을 추가했다. 10분 TTL.

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

같은 검색어는 10분 동안 API를 안 친다. 서버 부하도 줄고, 응답 속도도 빨라졌다.

---

이제 데이터는 준비됐다. 다음은 UI다.

처음엔 React로 시작했다. Next.js였다. 근데 배포하니까 문제가 있었다. Vercel에서 API 라우트랑 프론트엔드 라우트가 충돌했다.

그래서 Svelte로 갈아탔다. 결론부터 말하면 잘한 선택이었다.

Svelte는 다르다. React나 Vue는 런타임에 가상 DOM을 만들고 비교한다. Svelte는 빌드 타임에 실제 DOM 조작 코드를 생성한다.

번들 크기가 작다. 런타임 오버헤드가 없다.

```svelte
<script>
  let count = 0;
</script>

<button on:click={() => count++}>
  Clicked {count} times
</button>
```

이게 전부다. 프로젝트 규모가 작을수록 Svelte가 빛난다. vapecompare는 작은 프로젝트다. 딱 맞았다.

---

Express 5를 썼다. 아직 베타지만 쓸 만하다.

Express 4와 가장 큰 차이는 async/await 에러 처리다.

```typescript
// Express 5는 async 에러를 자동으로 next로 넘긴다
app.get('/api/search', async (req, res) => {
  const result = await search(req.query.q);
  res.json(result);
});
```

try-catch 지옥에서 벗어났다.

근데 Express 5에서 와일드카드 라우트 문법이 바뀌었다. `*` 대신 `/*`를 써야 한다. 이거 때문에 30분 날렸다.

---

SPA 라우팅이 문제였다.

Svelte로 SPA를 만들면 클라이언트 사이드 라우팅을 써야 한다. 근데 새로고침을 하면 404가 뜬다.

해결책은 간단했다. 모든 요청을 index.html로 리다이렉트하는 거다.

```typescript
// SPA 폴백
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
```

---

카테고리 탭을 만들었다. 전자담배 관련 제품은 크게 액상이랑 기기/코일 두 가지다.

```svelte
<script>
  let activeTab = 'liquid';
</script>

<div class="tabs">
  <button class:active={activeTab === 'liquid'} on:click={() => activeTab = 'liquid'}>
    액상
  </button>
  <button class:active={activeTab === 'device'} on:click={() => activeTab = 'device'}>
    기기/코일
  </button>
</div>
```

Svelte의 `class:` 디렉티브가 편하다. 조건부 클래스 적용이 한 줄이다.

---

검색어 자동보정도 처리했다.

"mango"라고 치면 "망고"로 검색된다. 근데 사용자는 왜 "mango"를 쳤는데 "망고" 결과가 나오는지 모를 수 있다.

그래서 보정된 검색어를 화면에 표시했다.

```svelte
{#if correctedQuery && correctedQuery !== originalQuery}
  <p class="correction">
    "{originalQuery}" → "{correctedQuery}"로 검색합니다
  </p>
{/if}
```

---

로딩 상태 표시도 추가했다. API 호출 중에는 스켈레톤 UI를 보여준다.

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

CSS로 스켈레톤 애니메이션을 줬다. 카드가 왼쪽에서 오른쪽으로 반짝이는 효과다.

---

반응형 디자인도 신경 썼다. 모바일에서도 쓸 수 있어야 한다.

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

모바일에서는 구매 버튼이 전체 너비로 펼쳐진다.

---

배포는 Vercel로 했다. 프론트엔드는 Svelte, 백엔드는 Express.

```json
// vercel.json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

하나의 도메인에서 프론트와 API를 다 돌린다.

---

정리하자면 이런 과정이었다.

네이버 쇼핑 API로 데이터를 가져오고, 액상만 필터링하고, 중복을 제거하고, 캐싱을 했다. 그리고 Svelte로 UI를 만들고, Express 5로 API 서버를 구성하고, Vercel에 배포했다.

각 단계마다 삽질이 있었다. API 응답에 이상한 게 섞여 있어서 필터링 로직을 세 번 고쳤다. Express 5 와일드카드 문법이 바뀌어서 30분 날렸다. SPA 라우팅 404 문제도 해결했다.

근데 이런 삽질이 개발의 맛 아니겠나.

Svelte로 바꾸길 잘했다는 생각이 든다. 코드가 간결하고, 성능도 좋고, 배포도 쉬웠다.

> API는 도구다. 어떤 데이터를 어떻게 보여주느냐가 서비스의 핵심이다.