# git2blog 기획서

## 개요
GitHub 커밋을 분석하여 기술 블로그 포스트를 자동 생성하고, 네이버 블로그/Tistory에 발행하는 웹 애플리케이션

## 핵심 기능

### 1. 대시보드
- 포스트 통계 (총 포스트, 발행완료, 초안)
- 최근 포스트 목록
- 상태별 필터링

### 2. 글 작성
#### 자동 생성 모드
- GitHub 저장소 URL 입력
- 커밋 분석 → 주제 추천
- Claude API로 포스트 생성

#### 파일 업로드 모드
- MD 파일 드래그앤드롭
- 한국어/영어 버전 관리

### 3. 에디터
- 마크다운 편집
- 실시간 프리뷰
- 한국어/영어 탭 전환
- 저장/발행

### 4. 발행
- 발행 대상 선택 (네이버/Tistory/둘 다)
- 언어 선택 (한국어/영어/둘 다)

## 기술 스택
- Frontend: Svelte 5 + SvelteKit
- Styling: TailwindCSS 4
- Backend: Express 5
- API: Claude API, 네이버 블로그 API, Tistory API

## 페이지 구조
```
/               → 대시보드
/write          → 새 글 작성
/edit/:id       → 포스트 편집
```

## 파일 구조
```
posts/
├── blog_01_ko_*.md  # 한국어 포스트
├── blog_01_en_*.md  # 영어 포스트
└── ...