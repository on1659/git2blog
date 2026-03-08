# git2blog 디자인 시스템

## 색상

### 배경
```css
--bg: #0a0a0a;        /* 기본 배경 */
--surface: #141414;   /* 카드 배경 */
--border: #262626;    /* 테두리 */
```

### 텍스트
```css
--text: #ffffff;      /* 주요 텍스트 */
--text2: #a3a3a3;     /* 부가 텍스트 */
--text3: #737373;     /* 설명 텍스트 */
```

### 포인트
```css
--primary: #3b82f6;   /* 블루 */
--success: #22c55e;   /* 초록 */
--warning: #eab308;   /* 노랑 */
--error: #ef4444;     /* 빨강 */
```

## 타이포그래피

### 폰트
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### 크기
| 용도 | 크기 |
|------|------|
| 페이지 제목 | 24px |
| 섹션 제목 | 18px |
| 카드 제목 | 16px |
| 본문 | 14px |
| 설명 | 12px |

## 여백

### 기본 단위
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
```

### 적용 예시
- 카드 패딩: 16-20px
- 섹션 간격: 24-32px
- 버튼 패딩: 10px 16px

## 컴포넌트

### 버튼
```css
/* 기본 */
padding: 10px 16px;
border-radius: 6px;
font-size: 14px;
font-weight: 500;

/* 종류 */
.btn-primary  /* 블루 배경 */
.btn-ghost    /* 투명 배경 */
.btn-success  /* 초록 배경 */
```

### 카드
```css
background: var(--surface);
border: 1px solid var(--border);
border-radius: 8px;
padding: 16-20px;
```

### 뱃지
```css
padding: 4px 10px;
border-radius: 999px;
font-size: 12px;

.badge.success  /* 초록 */
.badge.warning  /* 노랑 */
```

### 입력필드
```css
padding: 12px 16px;
background: var(--surface);
border: 1px solid var(--border);
border-radius: 6px;

/* 포커스 */
border-color: var(--primary);
```

## 반응형

### 브레이크포인트
```css
@media (max-width: 768px) { /* 모바일 */ }
```

### 모바일 적용
- 통계: 1열
- 모드 선택: 1열
- 에디터 프리뷰: 숨김