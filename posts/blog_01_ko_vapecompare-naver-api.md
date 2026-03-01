---
title: 네이버 쇼핑 API로 가격비교 서비스 만들기
subtitle: 전자담배 액상 가격을 실시간으로 비교하는 웹 서비스 개발기
slug: vapecompare-naver-shopping-api
tags: [AI, 사이드프로젝트, 네이버API, 가격비교, Svelte]
---

전자담배 액상 가격이 판매처마다 다르다. 같은 제품이 어디서는 8,000원, 어디서는 12,000원.

이걸 한눈에 비교할 수 있으면 좋겠다고 생각했다.

그래서 만들었다. vapecompare.

---

시작은 단순했다. 네이버 쇼핑 API를 쓰면 된다고 생각했다. 한국에서 가장 많은 판매처 데이터를 가진 곳이니까.

근데 막상 해보니까 할 게 많았다.

API 신청은 네이버 개발자 센터에서 했다. 클라이언트 ID, 시크릿 받아서 환경변수에 넣었다. 하루 25,000건 무료. 개인 프로젝트론 충분하다.

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

네이버 쇼핑 API는 카테고리 정보를 준다. 카테고리1, 카테고리2, 카테고리3, 카테고리4까지 있다.

이중에서 카테고리명에 "액상"이 포함된 것만 남겼다.

```typescript
// Before: 모든 결과 표시
const products = data.items;

// After: 액상 카테고리만 필터링
const products = data.items.filter(item => 
  item.category3Name?.includes('액상') || 
  item.category4Name?.includes('액상')
);
```

이제 액상만 나온다. 근데 또 문제가 있다.

---

같은 제품이 여러 개다.

"망고 30ml"가 판매처별로 5개씩 검색 결과에 뜬다. C사 버전, D사 버전, E사 버전. 전부 같은 제품인데 검색 결과엔 각각 나온다.

사용자 입장에선 같은 제품을 한 번만 보고 싶을 거다. 가격만 다르게 표시되면 된다.

productId로 중복을 제거했다. 네이버에서 주는 고유 ID다.

```typescript
// Before: 중복 포함
const unique = products;

// After: productId + 제목 정규화로 중복 제거
const seen = new Set();
const unique = products.filter(p => {
  const key = `${p.productId}-${normalizeTitle(p.title)}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
```

근데 productId만으로는 부족했다. 같은 제품인데 productId가 다른 경우가 있었다. 판매처마다 등록을 다르게 해놓은 경우가 있다.

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

이제 "망고 30ml"와 "망고  30ml"를 같은 제품으로 인식한다. 공백이 몇 개냐에 따라 다른 제품이 되는 걸 방지했다.

---

여기까지 하고 테스트해봤다.

검색창에 "망고"를 치니까 액상만 딱 나온다. 중복도 없다. 가격이 싼 순서대로 정렬돼 있다.

근데 API 호출이 많아질 것 같았다. 같은 검색어를 여러 번 호출하면 낭비다. 사용자가 "망고"를 검색하고, 5분 뒤에 또 "망고"를 검색하면 API를 두 번 치는 거다.

캐싱을 추가했다. 10분 TTL.

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

캐시를 Map에 저장했다. Redis 같은 걸 쓸 필요는 없었다. 싱글 서버에 사용자가 많지 않으니까. 나중에 트래픽이 늘어나면 Redis로 옮기면 된다.

---

검색어 오타도 처리했다.

"망고"를 "망구"라고 치는 사람이 있을 수 있다. 아니면 "mango"라고 영어로 쓸 수도 있다. "망고액상"이라고 칠 수도 있고 "망고 액상"이라고 칠 수도 있다.

자동 보정 로직을 넣었다.

```typescript
function normalizeSearchTerm(term: string): string {
  let normalized = term.trim();
  
  // 영어 → 한글 변환 (mango → 망고)
  const engToKor: Record<string, string> = {
    'mango': '망고', 'apple': '애플', 'grape': '포도',
    // ... 더 많은 매핑
  };
  normalized = engToKor[normalized.toLowerCase()] || normalized;
  
  // 공백 정리
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
}
```

완벽하진 않다. 근데 적어도 "망구"로 검색해도 "망고" 결과를 보여주진 못하고, "mango"로 검색하면 "망고" 결과를 보여준다.

나중에 한영 변환 라이브러리를 쓰면 더 깔끔해질 거다. 지금은 MVP니까 이 정도로 충분하다.

---

이제 데이터는 준비됐다. 다음은 UI다.

어떻게 보여줄까 고민했다. 그냥 리스트로 보여줄까, 아니면 카드 형태로 보여줄까.

다나와를 참고했다. 가격비교 사이트의 원조니까.

다나와는 가격을 크게 보여준다. 판매처 이름, 배송비, 쿠폰 여부도 함께. 클릭하면 해당 쇼핑몰로 이동한다.

비슷하게 만들었다.

```svelte
<div class="product-card">
  <img src={product.image} alt={product.title} />
  <div class="info">
    <h3>{product.title}</h3>
    <p class="price">{product.lprice.toLocaleString()}원</p>
    <p class="shop">{product.mallName}</p>
  </div>
  <a href={product.link} target="_blank">최저가 보러가기</a>
</div>
```

여기서 또 문제가 있었다. 네이버 쇼핑 API가 주는 링크는 네이버 쇼핑 페이지다. 실제 쇼핑몰로 바로 가는 게 아니라.

사용자 입장에선 불편하다. 클릭하면 바로 쇼핑몰로 가고 싶을 거다.

그래서 구매 링크를 네이버 쇼핑 검색으로 연결했다. 검색 결과 페이지로 보내는 거다. 거기서 사용자가 판매처를 선택하게.

```typescript
const naverSearchUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(product.title)}`;
```

완벽하진 않지만, 네이버 API 제약상 어쩔 수 없다. 네이버 입장에선 트래픽을 자기들 사이트로 유도하고 싶을 거니까.

---

여기까지 하니까 그럴싸한 가격비교 서비스가 됐다.

검색창에 액상 이름을 치면, 판매처별 가격이 싼 순서대로 나온다. 클릭하면 네이버 쇼핑 검색 페이지로 이동한다.

다나와나 에누리 같은 가격비교 사이트와 비슷한 UX. 근데 전자담배 액상에 특화됐다.

전자담배 액상은 일반적인 쇼핑 카테고리와 다르다. 브랜드도 많고, 용량도 다양하고, 니코틴 농도도 다르다. 일반적인 가격비교 사이트에선 이런 걸 구분해서 보여주지 않는다.

그래서 특화 서비스가 필요했다.

---

배포는 Vercel로 했다. 프론트엔드는 Svelte, 백엔드는 Express.

프론트엔드와 백엔드를 같은 저장소에 넣고 Vercel에 올렸다. API 라우트는 `/api`로, 프론트엔드는 그 외 경로로.

```json
// vercel.json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

이렇게 하니까 하나의 도메인에서 프론트와 API를 다 돌릴 수 있다.

---

정리하자면 이런 과정이었다.

네이버 쇼핑 API로 데이터를 가져오고, 액상만 필터링하고, 중복을 제거하고, 캐싱을 하고, 오타를 보정하고, UI를 만들고, 배포했다.

각 단계마다 삽질이 있었다. API 응답에 이상한 게 섞여 있어서 필터링 로직을 세 번 고쳤다. 중복 제거도 productId만으로는 안 돼서 제목 정규화를 추가했다. 캐싱도 처음엔 TTL을 안 넣었다가 메모리가 계속 늘어나서 추가했다.

근데 이런 삽질이 개발의 맛 아니겠나.

다음 글에선 이걸 Svelte + Express 5로 어떻게 UI에 올렸는지 쓴다. SPA 라우팅, 카테고리 탭, 뒤로가기 처리까지.

> API는 도구다. 어떤 데이터를 어떻게 보여주느냐가 서비스의 핵심이다.