# git2blog 개발 가이드

## 프로젝트 설정

### 환경 변수 (.env)
```
CLAUDE_API_KEY=sk-ant-...
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
TISTORY_CLIENT_ID=
TISTORY_CLIENT_SECRET=
```

### 설치
```bash
npm create svelte@latest web
cd web
npm install
npm install -D tailwindcss @tailwindcss/vite
```

## 디렉토리 구조
```
git2blog/
├── web/                    # SvelteKit 앱
│   ├── src/
│   │   ├── routes/
│   │   │   ├── +page.svelte      # 대시보드
│   │   │   ├── write/+page.svelte
│   │   │   └── edit/[id]/+page.svelte
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   └── api/
│   │   └── app.html
│   └── static/
├── posts/                  # 마크다운 포스트
├── scripts/
│   └── publish.py          # 발행 스크립트
└── docs/
```

## API 엔드포인트

### POST /api/analyze
GitHub 저장소 분석
```json
{ "url": "https://github.com/owner/repo" }
```

### POST /api/generate
포스트 생성
```json
{ "topic": "주제", "commits": [...] }
```

### POST /api/publish
블로그 발행
```json
{ "postId": 1, "targets": ["naver", "tistory"] }
```

## 포스트 파일명 규칙
```
blog_{번호}_{언어}_{프로젝트명}-{주제}.md

예: blog_01_ko_vapecompare-naver-api.md
```

## 프론트엔드 컴포넌트

### 공통
- Button
- Input
- Card
- Badge
- Modal
- Toast

### 페이지별
- Dashboard: StatsCard, PostList
- Write: ModeSelect, UploadBox, SuggestionList
- Edit: Editor, Preview, TabGroup