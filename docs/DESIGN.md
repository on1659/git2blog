# git2blog 디자인 시스템

**기술 스택**: Next.js 15 (App Router) + Tailwind CSS v4 + CSS 변수 기반 디자인 토큰

디자인 토큰은 `src/app/globals.css`의 `:root`에 CSS 변수로 정의하고,
JSX에서는 Tailwind 유틸리티 클래스 + `style={{ }}` 인라인으로 적용한다.

---

## 1. 디자인 철학

개발자 도구 느낌 (GitHub, Vercel, Linear 참고). 차분하고 프로페셔널하게. 과한 색상 지양.

- **미니멀**: 불필요한 장식 제거, 여백을 충분히 활용
- **일관성**: 동일한 역할의 요소는 동일한 스타일
- **가독성**: 텍스트는 읽기 쉽게, 충분한 대비
- **반응형**: 모든 화면 크기에서 최적화

---

## 2. 색상 시스템

### globals.css 정의

```css
:root {
  /* 배경 */
  --bg-base: #0a0a0a;       /* 페이지 배경 */
  --bg-surface: #141414;    /* 카드, 패널 배경 */
  --bg-elevated: #1f1f1f;   /* hover, 활성 상태 */
  --bg-overlay: #262626;    /* 모달, 드롭다운 */

  /* 테두리 */
  --border-default: #262626;
  --border-subtle: #1f1f1f;
  --border-emphasis: #333333;

  /* 텍스트 */
  --text-primary: #ffffff;
  --text-secondary: #a3a3a3;
  --text-tertiary: #737373;  /* 비활성, placeholder */
  --text-inverse: #0a0a0a;   /* 밝은 배경용 */

  /* 브랜드 */
  --primary: #3b82f6;
  --primary-hover: #2563eb;

  /* 시맨틱 */
  --success: #22c55e;
  --success-bg: #052e16;
  --warning: #eab308;
  --warning-bg: #422006;
  --error: #ef4444;
  --error-bg: #450a0a;
}
```

### 라이트 테마 (예정)

다크 테마가 기본. 라이트 테마는 구조만 잡아두고 색상값은 나중에 채운다.

```css
.theme-light {
  --bg-base: /* TODO */;
  --bg-surface: /* TODO */;
  --bg-elevated: /* TODO */;
  --bg-overlay: /* TODO */;

  --border-default: /* TODO */;
  --border-subtle: /* TODO */;
  --border-emphasis: /* TODO */;

  --text-primary: /* TODO */;
  --text-secondary: /* TODO */;
  --text-tertiary: /* TODO */;
  --text-inverse: /* TODO */;

  --primary: #3b82f6;          /* 브랜드 컬러는 동일 */
  --primary-hover: #2563eb;

  --success: #16a34a;          /* 밝은 배경에서 대비 확보를 위해 톤 조정 */
  --success-bg: /* TODO */;
  --warning: #ca8a04;
  --warning-bg: /* TODO */;
  --error: #dc2626;
  --error-bg: /* TODO */;
}

/* 시스템 감지 자동 전환 */
@media (prefers-color-scheme: light) {
  :root:not(.theme-dark) {
    /* .theme-light 변수 복사 */
  }
}
```

전환 방식: `<html>` 태그에 `.theme-dark` / `.theme-light` 클래스 토글. 클래스가 없으면 시스템 설정을 따른다.

### 색상 사용 규칙

```
배경 레벨: bg-base → bg-surface → bg-elevated (깊어질수록 밝게)
주요 액션: --primary (#3b82f6)
성공 상태: --success (#22c55e)
에러 표시: --error (#ef4444)

금지:
- 무채색 외의 색상 과다 사용
- primary와 success 동시 강조
- 텍스트에 채도 높은 색상 직접 사용 (배경 필요)
```

---

## 3. 타이포그래피

### 폰트 패밀리

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono: 'SF Mono', 'Fira Code', 'Consolas', monospace;
```

### 폰트 스케일

| 용도 | 크기 | Weight |
|------|------|--------|
| 설명, 캡션 | 12px | 400 |
| 부가 설명, 본문 | 14px | 400 |
| 카드 제목 | 16px | 400 |
| 부제목, 섹션 제목 | 18px | 400~600 |
| 페이지 제목 | 24px | 600 |
| 히어로 제목 | 30px | 700 |

### 행간

- 제목 (xl 이상): 1.2 ~ 1.3
- 본문 (base ~ lg): 1.5 ~ 1.6
- 캡션 (sm 이하): 1.4

---

## 4. 간격

### 기본 단위 (Tailwind 기준)

| Token | Value | 주요 용도 |
|-------|-------|----------|
| 1 | 4px | 최소 간격, 아이콘-텍스트 |
| 2 | 8px | 요소 내부 간격 |
| 3 | 12px | 관련 요소 간 간격 |
| 4 | 16px | 기본 간격 |
| 5 | 20px | 섹션 내 간격 |
| 6 | 24px | 카드 padding |
| 8 | 32px | 섹션 간 간격 |
| 12 | 48px | 페이지 섹션 간격 |

### 레이아웃 규칙

```
페이지 좌우 패딩: 24px (모바일) / 48px (데스크톱)
카드 내부 패딩: 16-24px
버튼 내부 패딩: 10-12px 16px (세로 가로)
입력필드 내부 패딩: 12px 16px
섹션 간 간격: 24-32px
```

---

## 5. 그림자 / 테두리

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);   /* 카드 */
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);   /* 드롭다운 */
--shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.5); /* 모달 */

--radius-sm: 4px;      /* 버튼, 입력필드 */
--radius-md: 8px;      /* 카드 */
--radius-lg: 12px;     /* 큰 카드, 모달 */
--radius-full: 9999px; /* 알약 형태 */
```

---

## 6. 컴포넌트 스타일

### 버튼

```css
/* 공통 */
padding: 10-12px 16px;
border-radius: var(--radius-sm);
font-size: 14px;
font-weight: 500;

/* Primary - 블루 배경 */
background: var(--primary);
color: white;

/* Secondary - 투명 배경 + 테두리 */
background: transparent;
border: 1px solid var(--border-default);
color: var(--text-primary);

/* Ghost - 테두리 없음 */
background: transparent;
color: var(--text-secondary);
```

### 카드

```css
background: var(--bg-surface);
border: 1px solid var(--border-subtle);
border-radius: var(--radius-md);
padding: 16-20px;

/* hover (클릭 가능한 경우) */
border-color: var(--border-default);
```

### 입력 필드

```css
background: var(--bg-surface);
border: 1px solid var(--border-default);
border-radius: var(--radius-sm);
padding: 12px 16px;
color: var(--text-primary);

/* focus */
border: 2px solid var(--primary);
outline: none;
```

### 뱃지

```css
padding: 4px 10px;
border-radius: var(--radius-full);
font-size: 12px;

/* 종류 */
.badge-success { background: var(--success-bg); color: var(--success); }
.badge-warning { background: var(--warning-bg); color: var(--warning); }
.badge-error   { background: var(--error-bg);   color: var(--error);   }
.badge-neutral { background: var(--bg-elevated); color: var(--text-secondary); }
```

### 모달

```css
/* Overlay */
background: rgba(0, 0, 0, 0.8);
z-index: 50;

/* Content */
background: var(--bg-surface);
border: 1px solid var(--border-default);
border-radius: var(--radius-lg);
box-shadow: var(--shadow-lg);
padding: 24px;
max-width: 480px;
```

---

## 7. 애니메이션

```css
--transition-fast: 150ms ease;  /* 버튼 hover */
--transition-base: 200ms ease;  /* 카드 hover */
--transition-slow: 300ms ease;  /* 모달 열기/닫기 */
```

---

## 8. 레이아웃

```css
.container        { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.container-narrow { max-width: 640px; margin: 0 auto; }
```

### 반응형 브레이크포인트

```css
/* Mobile First 접근 — 기본 스타일이 모바일, 위로 확장 */
@media (min-width: 768px)  { /* md — 태블릿 */ }
@media (min-width: 1024px) { /* lg — 데스크톱 */ }
```

### 페이지별 반응형 동작

```
┌──────────────────────────────────────────────────────────────┐
│  Dashboard (/)                                               │
├──────────┬───────────────┬───────────────────────────────────┤
│ Mobile   │ Tablet        │ Desktop                           │
├──────────┼───────────────┼───────────────────────────────────┤
│ 통계 1열 │ 통계 2열      │ 통계 3~4열                        │
│ 글 목록  │ 글 목록       │ 글 목록 (넓은 카드)               │
│ 풀 width │ 좌우 패딩 32  │ max-width 1200, 좌우 패딩 48      │
└──────────┴───────────────┴───────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Write (/write) — 3단계 위자드                               │
├──────────┬───────────────┬───────────────────────────────────┤
│ Mobile   │ Tablet        │ Desktop                           │
├──────────┼───────────────┼───────────────────────────────────┤
│ 모드 1열 │ 모드 2열      │ 모드 2열                          │
│ URL 풀폭 │ URL 중앙 640  │ URL 중앙 640                      │
│ 제안 1열 │ 제안 2열      │ 제안 2열                          │
└──────────┴───────────────┴───────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Editor (/edit/[id])                                         │
├──────────┬───────────────┬───────────────────────────────────┤
│ Mobile   │ Tablet        │ Desktop                           │
├──────────┼───────────────┼───────────────────────────────────┤
│ 편집 탭  │ 편집/프리뷰   │ 편집/프리뷰 좌우 분할 (50:50)     │
│ 프리뷰탭 │ 좌우 분할     │ max-width 1200                    │
│ (전환)   │ (50:50)       │                                   │
└──────────┴───────────────┴───────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Settings (/settings)                                        │
├──────────┬───────────────┬───────────────────────────────────┤
│ Mobile   │ Tablet        │ Desktop                           │
├──────────┼───────────────┼───────────────────────────────────┤
│ 플랫폼   │ 플랫폼 카드   │ 플랫폼 카드 2열                   │
│ 카드 1열 │ 1~2열         │ 중앙 정렬 max-width 800           │
└──────────┴───────────────┴───────────────────────────────────┘
```

### 그리드 시스템

```css
/* 통계 카드 그리드 */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr;          /* 모바일: 1열 */
  gap: 16px;
}

@media (min-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }  /* 태블릿: 2열 */
}

@media (min-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(4, 1fr); }  /* 데스크톱: 4열 */
}

/* 에디터 분할 */
.editor-layout {
  display: flex;
  flex-direction: column;              /* 모바일: 세로 (탭 전환) */
}

@media (min-width: 768px) {
  .editor-layout {
    flex-direction: row;               /* 태블릿+: 좌우 분할 */
  }
  .editor-layout > * { flex: 1; }
}
```

---

## 9. 네비게이션

상단 고정 네비바. GitHub/Vercel 스타일.

```css
.navbar {
  position: sticky;
  top: 0;
  z-index: 40;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--bg-base);
  border-bottom: 1px solid var(--border-subtle);
  backdrop-filter: blur(8px);
  background: rgba(10, 10, 10, 0.85);
}
```

### 구조

```
┌─────────────────────────────────────────────────────┐
│  [Logo]   Dashboard   Write   Settings    [+ New]   │
└─────────────────────────────────────────────────────┘
  좌측: 로고 + 메뉴 링크
  우측: 액션 버튼
```

### 메뉴 링크

```css
.nav-link {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
  transition: var(--transition-fast);
}

.nav-link:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.nav-link.active {
  color: var(--text-primary);
  background: var(--bg-elevated);
}
```

### 모바일 (<768px)

로고 + 햄버거 아이콘. 메뉴는 드롭다운으로 펼침.

```css
.nav-menu {
  display: flex;
  gap: 4px;
}

@media (max-width: 767px) {
  .nav-menu {
    display: none;                    /* 기본 숨김 */
    position: absolute;
    top: 56px;
    left: 0;
    right: 0;
    flex-direction: column;
    padding: 8px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-default);
  }

  .nav-menu.open {
    display: flex;                    /* 햄버거 클릭 시 표시 */
  }

  .hamburger {
    display: flex;                    /* 모바일에서만 표시 */
  }
}

@media (min-width: 768px) {
  .hamburger { display: none; }      /* 태블릿+에서 숨김 */
}
```

---

## 10. 모바일 터치 & 접근성

### 최소 터치 영역

모든 인터랙티브 요소는 최소 **44x44px** 터치 영역을 보장한다 (Apple HIG 기준).
시각적 크기가 작아도 padding이나 `min-height`로 영역을 확보한다.

```css
/* 버튼 — 모바일에서 최소 높이 보장 */
@media (max-width: 767px) {
  button, a.btn, .nav-link {
    min-height: 44px;
    min-width: 44px;
  }
}
```

### 터치 타겟 간 간격

인접한 터치 타겟 사이에 최소 **8px** 간격. 오탭 방지.

```css
/* 인접 버튼 그룹 */
.button-group {
  display: flex;
  gap: 8px;
}
```

### 포커스 표시

키보드 네비게이션을 위한 포커스 링. 마우스 사용 시에는 숨김.

```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

:focus:not(:focus-visible) {
  outline: none;
}
```

---

## 11. 반응형 타이포그래피

모바일에서 큰 제목은 줄여서 화면에 맞춘다. `clamp()`로 뷰포트에 따라 유동적으로 변한다.

```css
:root {
  --text-hero:   clamp(24px, 5vw, 30px);    /* 히어로: 24~30px */
  --text-title:  clamp(20px, 4vw, 24px);    /* 페이지 제목: 20~24px */
  --text-section: clamp(16px, 3vw, 18px);   /* 섹션 제목: 16~18px */
  --text-body:   clamp(14px, 2.5vw, 16px);  /* 본문: 14~16px */
}
```

| 용도 | Mobile | Desktop |
|------|--------|---------|
| 히어로 제목 | 24px | 30px |
| 페이지 제목 | 20px | 24px |
| 섹션 제목 | 16px | 18px |
| 본문 | 14px | 16px |
| 캡션 | 12px | 12px |

---

## 12. 상태 스타일

```css
/* 로딩 */
.spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--border-default);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 에러 */
.error-state {
  background: var(--error-bg);
  border: 1px solid var(--error);
  border-radius: var(--radius-md);
  padding: 16px;
  color: var(--error);
}
```

---

## 13. 반응형 컴포넌트 변형

### 모달 → 바텀시트 (모바일)

데스크톱에서는 중앙 모달, 모바일에서는 하단에서 올라오는 바텀시트로 전환.

```css
.modal-content {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 24px;
  max-width: 480px;
  margin: auto;
}

@media (max-width: 767px) {
  .modal-content {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    max-width: 100%;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    max-height: 85vh;
    overflow-y: auto;
    animation: slideUp 300ms ease;
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
}
```

### 리스트 → 카드 (모바일)

데스크톱에서 테이블/리스트 형태, 모바일에서 카드형으로 전환.

```css
/* 데스크톱: 테이블 행 */
.post-item {
  display: grid;
  grid-template-columns: 1fr 100px 120px 80px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
}

/* 모바일: 카드 */
@media (max-width: 767px) {
  .post-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 16px;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    margin-bottom: 8px;
  }
}
```

### 에디터 탭 전환 (모바일)

데스크톱에서 편집/프리뷰 동시 표시, 모바일에서 탭으로 전환.

```css
.editor-tabs {
  display: none;  /* 데스크톱에서 탭 숨김 */
}

@media (max-width: 767px) {
  .editor-tabs {
    display: flex;
    border-bottom: 1px solid var(--border-default);
  }

  .editor-tab {
    flex: 1;
    padding: 12px;
    text-align: center;
    font-size: 14px;
    color: var(--text-secondary);
    min-height: 44px;
  }

  .editor-tab.active {
    color: var(--text-primary);
    border-bottom: 2px solid var(--primary);
  }

  .editor-pane { display: none; }
  .editor-pane.active { display: block; }
}
```

---

## 14. Tailwind CSS v4 + CSS 변수 적용 패턴

```css
/* globals.css */
@import "tailwindcss";

:root {
  /* 위 색상 변수 전체 */
}
```

JSX에서 Tailwind로 레이아웃/간격/폰트를 처리하고, `style={{ }}`로 CSS 변수 색상을 적용한다:

```tsx
{/* 버튼 Primary */}
<button
  className="w-full rounded-lg py-3 font-medium text-white transition disabled:opacity-50"
  style={{ backgroundColor: "var(--primary)" }}
>
  발행하기
</button>

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
  style={{ backgroundColor: "var(--success-bg)", color: "var(--success)" }}
>
  Published
</span>
```

### Prose 스타일 (마크다운 미리보기)

```css
.prose h1 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; }
.prose h2 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
.prose p  { margin: 0.5rem 0; line-height: 1.8; }
.prose code       { background: var(--bg-elevated); padding: 0.1rem 0.3rem; border-radius: 3px; }
.prose pre        { background: var(--bg-surface); padding: 1rem; border-radius: 0.5rem; }
.prose blockquote { border-left: 3px solid var(--primary); padding-left: 1rem; color: var(--text-secondary); }
```

---

## 15. 구현 체크리스트

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
- [ ] 768px, 1024px 브레이크포인트에서 레이아웃이 깨지지 않는가?
- [ ] 모바일 터치 타겟 최소 44x44px 확보했는가?
- [ ] 모달이 모바일에서 바텀시트로 전환되는가?
- [ ] 에디터 좌우 분할이 모바일에서 탭 전환으로 바뀌는가?

### 네비게이션
- [ ] 상단 네비바가 sticky로 고정되는가?
- [ ] 모바일에서 햄버거 메뉴가 동작하는가?
- [ ] 현재 페이지에 active 스타일이 적용되는가?

### 접근성
- [ ] :focus-visible 포커스 링이 있는가?
- [ ] 인접 터치 타겟 간 8px 이상 간격이 있는가?
