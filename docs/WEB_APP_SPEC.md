# git2blog 웹 애플리케이션 기획서

## 1. 개요

### 1.1 목적

CLI 기반 Claude Code 워크플로우(GitHub 커밋 분석 → 블로그 글 생성 → Hashnode 발행)를 웹 애플리케이션으로 확장. 브라우저에서 글 생성, 편집, 멀티 플랫폼 동시 발행까지 한 번에 처리한다.

### 1.2 핵심 가치

- **자동화**: GitHub URL만 넣으면 AI가 커밋 분석 → 글 제안 → KO/EN 동시 생성
- **멀티 플랫폼**: Hashnode, DEV.to, Medium 등 여러 블로그에 한 번에 발행
- **플러그인 확장**: `BlogPlatform` 인터페이스 구현만으로 새 플랫폼 추가

---

## 2. 기술 스택

| Layer | 기술 | 선정 이유 |
|-------|------|----------|
| Framework | Next.js 15 (App Router) | 프론트+API Routes 한 프로세스, RSC 지원 |
| Styling | Tailwind CSS v4 | 빠른 UI 개발, CSS 변수 기반 디자인 토큰 |
| DB | SQLite + Drizzle ORM | 개인 도구에 적합, 별도 서버 불필요 |
| AI | Anthropic Claude API | SSE 스트리밍 글 생성 |
| Frontmatter | gray-matter | MD 파싱/직렬화 |
| Runtime | Node.js 18+ | better-sqlite3 네이티브 바인딩 |

---

## 3. 시스템 아키텍처

```
Browser (React)
    │
    ├── Dashboard (/)           ← Server Component, DB 직접 조회
    ├── Write (/write)          ← Client Component, 3단계 위자드
    ├── Editor (/edit/[id])     ← Client Component, 마크다운 편집
    └── Settings (/settings)    ← Client Component, 플랫폼 인증
            │
            ▼
    Next.js API Routes (/api/*)
    ├── /api/analyze       POST  GitHub 커밋 분석 + AI 제안
    ├── /api/generate      POST  AI 글 생성 (SSE 스트리밍)
    ├── /api/posts         GET   글 목록 / POST 글 생성
    ├── /api/posts/[id]    GET/PUT/DELETE 글 CRUD
    ├── /api/publish       POST  멀티 플랫폼 발행
    ├── /api/platforms     GET   플랫폼 목록 + 설정 상태
    ├── /api/platforms/[id] POST 인증 저장/검증
    └── /api/upload        POST  MD 파일 업로드
            │
            ▼
    ┌─────────────────┐    ┌──────────────────┐
    │ SQLite (WAL)    │    │ External APIs    │
    │ data/git2blog.db│    │ - GitHub API     │
    └─────────────────┘    │ - Claude API     │
                           │ - Hashnode GQL   │
                           │ - DEV.to REST    │
                           │ - Medium REST    │
                           └──────────────────┘
```

---

## 4. 데이터베이스 스키마

5개 테이블. SQLite + Drizzle ORM.

### posts

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동 증가 |
| slug | TEXT UNIQUE | URL 슬러그 |
| github_url | TEXT | 원본 GitHub URL (선택) |
| status | TEXT | 'draft' / 'published' |
| created_at | TEXT | 생성 시각 |
| updated_at | TEXT | 수정 시각 |

### post_versions

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동 증가 |
| post_id | INTEGER FK→posts | 부모 글 |
| language | TEXT | 'ko' / 'en' |
| title | TEXT | 제목 |
| subtitle | TEXT | 부제 (선택) |
| body | TEXT | 마크다운 본문 |
| tags | TEXT | JSON 배열 문자열 |
| cover_image | TEXT | 커버 이미지 URL (선택) |
| created_at | TEXT | 생성 시각 |
| updated_at | TEXT | 수정 시각 |

UNIQUE 제약: (post_id, language)

### publications

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동 증가 |
| post_version_id | INTEGER FK→post_versions | 발행된 버전 |
| platform_id | TEXT | 플랫폼 식별자 ('hashnode', 'devto', 'medium') |
| platform_post_id | TEXT | 플랫폼 측 글 ID |
| url | TEXT | 발행된 URL |
| is_draft | INTEGER | 초안 여부 |
| published_at | TEXT | 발행 시각 |

### platform_credentials

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동 증가 |
| platform_id | TEXT UNIQUE | 플랫폼 식별자 |
| credentials | TEXT | JSON (API 키 등) |
| is_active | INTEGER | 활성 여부 |
| created_at | TEXT | 등록 시각 |

### commit_cache

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동 증가 |
| github_url | TEXT | 리포 URL |
| commits | TEXT | JSON (커밋 목록) |
| fetched_at | TEXT | 수집 시각 |

---

## 5. API 엔드포인트

### POST /api/analyze

GitHub 커밋 분석 + AI 블로그 제목 제안.

- **Body**: `{ url: string }`
- **Response**: `{ commits, readme, repo, suggestions: [{ title_ko, title_en, summary, angle }] }`

### POST /api/generate

AI 블로그 글 생성 (SSE 스트리밍).

- **Body**: `{ suggestion, commits, readme, language: 'ko'|'en' }`
- **Response**: SSE stream (`data: { text }` 이벤트)

### GET /api/posts

전체 글 목록 + 버전 정보.

### POST /api/posts

새 글 생성.

- **Body**: `{ slug, githubUrl?, versions: [{ language, title, body, tags }] }`

### GET /api/posts/[id]

글 + 버전 + 발행 기록 조회.

### PUT /api/posts/[id]

버전 수정.

- **Body**: `{ versions: [{ language, title, subtitle?, body, tags }] }`

### DELETE /api/posts/[id]

글 삭제 (cascade로 버전, 발행 기록 함께 삭제).

### POST /api/publish

멀티 플랫폼 발행.

- **Body**: `{ postId, versionIds: number[], platformIds: string[], isDraft: boolean }`
- **Response**: `{ results: PublishResult[] }`

### GET /api/platforms

전체 플랫폼 목록 + 설정 상태.

### POST /api/platforms/[id]

인증 저장 또는 검증.

- **Body**: `{ credentials, action?: 'validate' }`

### POST /api/upload

MD 파일 업로드.

- **Body**: multipart/form-data (file + language)
- Frontmatter 자동 파싱.

---

## 6. 페이지 구성

### Dashboard (`/`)
- 통계 카드: 전체 글, 발행됨, 초안
- 최근 글 목록: 제목, KO/EN 뱃지, 플랫폼 뱃지, 상태
- Server Component (DB 직접 조회)

### Write (`/write`)
3단계 위자드:
1. **Mode 선택**: Auto Generate / Upload File
2. **Auto**: GitHub URL 입력 → 분석 → 제목 제안 목록
3. **Generate**: 선택한 제안으로 KO+EN 스트리밍 생성 → 완료 후 에디터로 이동

### Editor (`/edit/[id]`)
- 좌측: 마크다운 textarea
- 우측: 실시간 HTML 미리보기
- 상단: KO/EN 탭, 저장/발행 버튼
- Frontmatter 필드: title, slug, subtitle, tags 폼 편집
- Publish Modal: 플랫폼 선택, 초안 옵션, 결과 표시

### Settings (`/settings`)
- 플러그인 레지스트리에서 자동 감지된 플랫폼 목록
- 각 플랫폼의 인증 필드 (플러그인 config에서 자동 생성)
- "Save" + "Test Connection" 버튼
- 연결 상태 표시

### Upload (`/upload`)
- MD 파일 드래그앤드롭
- 언어 선택 (KO/EN)
- Frontmatter 자동 파싱 후 DB 저장

---

## 7. 플랫폼 플러그인 아키텍처

### 핵심 인터페이스

```typescript
interface BlogPlatform {
  config: PlatformConfig;
  isConfigured(credentials: Record<string, string>): boolean;
  validateCredentials(credentials: Record<string, string>): Promise<boolean>;
  publish(input: PublishInput, credentials: Record<string, string>): Promise<PublishResult>;
  update?(platformPostId: string, input: PublishInput, credentials: Record<string, string>): Promise<PublishResult>;
}
```

### 현재 등록된 플러그인

| ID | 플랫폼 | API 방식 | 인증 필드 |
|----|--------|----------|----------|
| hashnode | Hashnode | GraphQL | token, publicationId |
| devto | DEV.to | REST | apiKey |
| medium | Medium | REST | token |

### 플러그인 추가 방법

1. `src/lib/platforms/`에 새 파일 생성
2. `BlogPlatform` 인터페이스 구현
3. `registry.ts`에 `platforms.set("id", plugin)` 추가
4. Settings UI에 자동 반영
