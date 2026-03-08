# git2blog 디자인 시스템

이 문서는 git2blog 웹 앱 개발 시 일관된 디자인을 유지하기 위한 가이드라인이다.
모든 UI 구현은 이 문서의 규칙을 따른다.

**기술 스택**: Next.js 15 (App Router) + Tailwind CSS v4 + CSS 변수 기반 디자인 토큰

디자인 토큰은 `src/app/globals.css`의 `:root`에 CSS 변수로 정의하고,
JSX에서는 Tailwind 유틸리티 클래스 + `style={{ }}` 인라인으로 적용한다.

---

## 1. 디자인 철학

### 핵심 원칙
- **미니멀**: 불필요한 장식 제거, 여백을 충분히 활용
- **일관성**: 동일한 역할의 요소는 동일한 스타일
- **가독성**: 텍스트는 읽기 쉽게, 충분한 대비
- **반응형**: 모든 화면 크기에서 최적화

### 톤앤매너
- 개발자 도구 느낌 (GitHub, Vercel, Linear 참고)
- 차분하고 프로페셔널한 분위기
- 과한 색상 사용 지양

---

## 2. 색상 시스템

### 2.1 기본 팔레트

```
┌─────────────────────────────────────────────────────────────┐
│  DARK THEME                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Background                                                 │
│  ├─ bg-base      #0a0a0a   (페이지 배경)                   │
│  ├─ bg-surface   #141414   (카드, 패널 배경)               │
│  ├─ bg-elevated  #1f1f1f   (hover, 활성 상태)              │
│  └─ bg-overlay   #262626   (모달, 드롭다운)                │
│                                                             │
│  Border                                                     │
│  ├─ border-default  #262626   (기본 테두리)                │
│  ├─ border-subtle   #1f1f1f   (은은한 구분선)              │
│  └─ border-emphasis #333333   (강조 테두리)                │
│                                                             │
│  Text                                                       │
│  ├─ text-primary    #ffffff   (주요 텍스트)                │
│  ├─ text-secondary  #a3a3a3   (부가 텍스트)                │
│  ├─ text-tertiary   #737373   (비활성, placeholder)        │
│  └─ text-inverse    #0a0a0a   (밝은 배경용)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 브랜드 컬러 (Primary)

```
┌─────────────────────────────────────────────────────────────┐
│  PRIMARY (Blue)                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  primary-400   #60a5fa   (아이콘, 링크)                     │
│  primary-500   #3b82f6   (기본 버튼)     ← 메인             │
│  primary-600   #2563eb   (hover)                            │
│  primary-700   #1d4ed8   (active)                           │
│                                                             │
│  사용처: CTA 버튼, 링크, 활성 탭, 포커스 링                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 시맨틱 컬러

```
┌─────────────────────────────────────────────────────────────┐
│  SUCCESS (Green)                                            │
├─────────────────────────────────────────────────────────────┤
│  success-500   #22c55e   (성공, 발행완료)                   │
│  success-bg    #052e16   (배경용, 아주 어둡게)              │
├─────────────────────────────────────────────────────────────┤
│  WARNING (Yellow)                                           │
├─────────────────────────────────────────────────────────────┤
│  warning-500   #eab308   (경고, 초안)                       │
│  warning-bg    #422006   (배경용)                           │
├─────────────────────────────────────────────────────────────┤
│  ERROR (Red)                                                │
├─────────────────────────────────────────────────────────────┤
│  error-500     #ef4444   (에러, 실패)                       │
│  error-bg      #450a0a   (배경용)                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 CSS 변수 정의 (globals.css 실제 값)

`src/app/globals.css`에 정의된 실제 CSS 변수:

```css
:root {
  --bg-base: #0a0a0a;
  --bg-surface: #141414;
  --bg-elevated: #1f1f1f;

  --border-default: #262626;
  --border-subtle: #1f1f1f;

  --text-primary: #ffffff;
  --text-secondary: #a3a3a3;
  --text-tertiary: #737373;

  --primary: #3b82f6;
  --primary-hover: #2563eb;

  --success: #22c55e;
  --success-bg: #052e16;

  --warning: #eab308;
  --warning-bg: #422006;

  --error: #ef4444;
  --error-bg: #450a0a;
}
```

### 2.5 색상 사용 규칙

```
올바른 사용:
- 주요 액션: primary (#3b82f6)
- 성공 상태: success (#22c55e)
- 에러 표시: error (#ef4444)
- 배경: bg-base → bg-surface → bg-elevated (레벨별로)

금지:
- 무채색 외의 색상 과다 사용
- primary와 success 동시 강조
- 텍스트에 채도 높은 색상 직접 사용 (배경 필요)
```

---

## 3. 타이포그래피

### 3.1 폰트 패밀리

```css
/* 기본: 시스템 폰트 */
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             'Helvetica Neue', Arial, sans-serif;

/* 코드: 모노스페이스 */
--font-mono: 'SF Mono', 'Fira Code', 'Consolas', monospace;
```

### 3.2 폰트 스케일

```
┌──────────┬──────────┬──────────┬─────────────────────────┐
│  Name    │  Size    │  Weight  │  Usage                  │
├──────────┼──────────┼──────────┼─────────────────────────┤
│  xs      │  12px    │  400     │  캡션, 라벨             │
│  sm      │  14px    │  400     │  부가 설명              │
│  base    │  16px    │  400     │  본문                   │
│  lg      │  18px    │  400     │  부제목                 │
│  xl      │  20px    │  600     │  섹션 제목              │
│  2xl     │  24px    │  600     │  페이지 제목            │
│  3xl     │  30px    │  700     │  히어로 제목            │
└──────────┴──────────┴──────────┴─────────────────────────┘
```

### 3.3 행간 (Line Height)

```
- 제목 (xl 이상): 1.2 ~ 1.3
- 본문 (base ~ lg): 1.5 ~ 1.6
- 캡션 (sm 이하): 1.4
```

---

## 4. 간격 (Spacing)

### 4.1 간격 스케일

```
┌──────────┬──────────┬─────────────────────────────────┐
│  Token   │  Value   │  Usage                          │
├──────────┼──────────┼─────────────────────────────────┤
│  1       │  4px     │  최소 간격, 아이콘-텍스트       │
│  2       │  8px     │  요소 내부 간격                 │
│  3       │  12px    │  관련 요소 간 간격              │
│  4       │  16px    │  기본 간격                      │
│  5       │  20px    │  섹션 내 간격                   │
│  6       │  24px    │  카드 padding                   │
│  8       │  32px    │  섹션 간 간격                   │
│  10      │  40px    │  큰 섹션 간 간격                │
│  12      │  48px    │  페이지 섹션 간격               │
│  16      │  64px    │  주요 구분                      │
└──────────┴──────────┴─────────────────────────────────┘
```

### 4.2 레이아웃 간격 규칙

```
- 페이지 좌우 패딩: 24px (모바일) / 48px (데스크톱)
- 카드 내부 패딩: 24px
- 버튼 내부 패딩: 12px 16px (세로 가로)
- 입력필드 내부 패딩: 12px 16px
- 섹션 간 간격: 32px ~ 48px
```

---

## 5. 그림자 (Shadow)

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);   /* 카드 */
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);   /* 드롭다운 */
  --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.5); /* 모달 */
  --shadow-xl: 0 20px 50px rgba(0, 0, 0, 0.6); /* 전체 화면 오버레이 */
}
```

---

## 6. 테두리 (Border)

### 6.1 라운딩 (Border Radius)

```css
:root {
  --radius-sm: 4px;      /* 버튼, 입력필드 */
  --radius-md: 8px;      /* 카드 */
  --radius-lg: 12px;     /* 큰 카드, 모달 */
  --radius-xl: 16px;     /* 특별한 요소 */
  --radius-full: 9999px; /* 알약 형태 */
}
```

### 6.2 테두리 두께

```
- 기본: 1px
- 강조: 2px (포커스, 활성 상태)
```

---

## 7. 컴포넌트 스타일

### 7.1 버튼

```
PRIMARY BUTTON
- 배경: var(--primary) / hover: var(--primary-hover)
- 텍스트: white
- 패딩: 12px 16px, 라운딩: var(--radius-sm)

SECONDARY BUTTON
- 배경: transparent / hover: var(--bg-elevated)
- 테두리: 1px solid var(--border-default)
- 텍스트: var(--text-primary)

GHOST BUTTON
- 배경: transparent / hover: var(--bg-elevated)
- 테두리: 없음
- 텍스트: var(--text-secondary)
```

### 7.2 입력 필드 (Input)

```
- 배경: var(--bg-surface)
- 테두리: 1px solid var(--border-default)
- Focus: 2px solid var(--primary)
- 텍스트: var(--text-primary)
- placeholder: var(--text-tertiary)
- 패딩: 12px 16px, 라운딩: var(--radius-sm)
```

### 7.3 카드 (Card)

```
- 배경: var(--bg-surface)
- 테두리: 1px solid var(--border-subtle)
- 라운딩: var(--radius-md)
- Hover (클릭 가능): border → var(--border-default)
```

### 7.4 태그/뱃지 (Badge)

```
- 패딩: 4px 8px, 라운딩: var(--radius-full), 폰트: 12px

종류:
- Success: bg success-bg, text success
- Warning: bg warning-bg, text warning
- Error: bg error-bg, text error
- Neutral: bg bg-elevated, text text-secondary
```

### 7.5 모달 (Modal)

```
Overlay: rgba(0, 0, 0, 0.8), z-index: 50
Content: bg-surface, border-default, radius-lg, shadow-lg, padding 24px, max-width 480px
```

---

## 8. 애니메이션

```css
:root {
  --transition-fast: 150ms ease;  /* 버튼 hover */
  --transition-base: 200ms ease;  /* 카드 hover */
  --transition-slow: 300ms ease;  /* 모달 열기/닫기 */
}
```

---

## 9. 레이아웃

```css
.container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.container-narrow { max-width: 640px; margin: 0 auto; }
```

### 반응형 브레이크포인트

```css
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

---

## 10. 상태 스타일

### 로딩 (Spinner)

```css
.spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--border-default);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

### 에러 상태

```css
.error-state {
  background: var(--error-bg);
  border: 1px solid var(--error);
  border-radius: var(--radius-md);
  padding: 16px;
  color: var(--error);
}
```

---

## 11. Tailwind CSS v4 + CSS 변수 적용

Tailwind CSS v4에서는 `tailwind.config.js` 없이 CSS 변수를 직접 사용한다.
`globals.css`에서 `@import "tailwindcss";`로 로드하고, `:root`에 디자인 토큰을 정의한다.

### 11.1 globals.css 구조

```css
@import "tailwindcss";

:root {
  --bg-base: #0a0a0a;
  --bg-surface: #141414;
  --bg-elevated: #1f1f1f;
  --border-default: #262626;
  --text-primary: #ffffff;
  --text-secondary: #a3a3a3;
  --text-tertiary: #737373;
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --success: #22c55e;
  --success-bg: #052e16;
  --warning: #eab308;
  --warning-bg: #422006;
  --error: #ef4444;
  --error-bg: #450a0a;
}
```

### 11.2 JSX에서의 사용 패턴

Tailwind 유틸리티 클래스로 레이아웃/간격/폰트를 처리하고,
`style={{ }}` 인라인으로 CSS 변수 기반 색상을 적용한다.

```tsx
{/* 버튼 Primary */}
<button
  className="w-full rounded-lg py-3 font-medium text-white transition disabled:opacity-50"
  style={{ backgroundColor: "var(--primary)" }}
>
  발행하기
</button>

{/* 입력 필드 */}
<input
  className="mb-4 w-full rounded-lg px-4 py-3 text-base outline-none transition"
  style={{
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
  }}
/>

{/* 카드 */}
<div
  className="rounded-lg p-6"
  style={{
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
  }}
>
  카드 내용
</div>

{/* 뱃지 */}
<span
  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
  style={{
    backgroundColor: "var(--success-bg)",
    color: "var(--success)",
  }}
>
  Published
</span>
```

### 11.3 Prose 스타일 (마크다운 미리보기)

`globals.css`에 `.prose` 클래스로 마크다운 렌더링 스타일을 정의한다:

```css
.prose h1 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; }
.prose h2 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
.prose p { margin: 0.5rem 0; line-height: 1.8; }
.prose code { background: var(--bg-elevated); padding: 0.1rem 0.3rem; border-radius: 3px; }
.prose pre { background: var(--bg-surface); padding: 1rem; border-radius: 0.5rem; }
.prose blockquote { border-left: 3px solid var(--primary); padding-left: 1rem; color: var(--text-secondary); }
```

---

## 12. 체크리스트

UI 구현 시 이 체크리스트를 확인한다:

### 색상
- [ ] CSS 변수를 사용했는가? (하드코딩 금지)
- [ ] 배경 레벨이 올바른가? (base → surface → elevated)
- [ ] 텍스트 대비가 충분한가?

### 간격
- [ ] Tailwind 간격 토큰을 사용했는가?
- [ ] 일관된 간격을 유지했는가?

### 컴포넌트
- [ ] 모든 상태 (기본, hover, active, disabled)를 정의했는가?
- [ ] 포커스 상태가 있는가?

### 반응형
- [ ] 모바일에서도 사용 가능한가?
- [ ] 브레이크포인트에서 레이아웃이 깨지지 않는가?
