# git2blog 개발 가이드

## 환경 요구사항

- Node.js 18+
- npm

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local

# 개발 서버
npm run dev
```

`http://localhost:3000`에서 접속.

---

## 환경변수

`.env.local` 파일에 설정한다.

| 변수 | 용도 | 필수 여부 |
|------|------|----------|
| `ANTHROPIC_API_KEY` | Claude API로 블로그 글 생성 | AI 자동 생성 사용 시 |
| `GITHUB_TOKEN` | GitHub API rate limit 확보, private 리포 접근 | 선택 |
| `HASHNODE_TOKEN` | Hashnode 발행 | Hashnode 사용 시 |
| `HASHNODE_PUB_ID` | Hashnode Publication ID | Hashnode 사용 시 |

플랫폼 인증 정보는 Settings 페이지에서 DB에 저장할 수도 있다. `.env.local`의 값은 fallback으로 사용.

---

## 데이터베이스

### SQLite + Drizzle ORM

DB 파일: `data/git2blog.db` (자동 생성)

앱 시작 시 `src/lib/db/index.ts`에서 테이블을 `CREATE TABLE IF NOT EXISTS`로 자동 생성한다. 별도 마이그레이션 실행 불필요.

### WAL 모드

SQLite는 WAL(Write-Ahead Logging) 모드로 동작해 읽기/쓰기 동시성이 개선된다.

```sql
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;
```

### globalThis 싱글톤 패턴

Next.js는 개발 모드에서 모듈을 반복 로드한다. SQLite 연결이 중복 생성되면 `SQLITE_BUSY` 에러가 발생하므로, `globalThis`에 연결을 캐싱한다.

```typescript
const globalForDb = globalThis as unknown as {
  __db?: ReturnType<typeof drizzle>;
  __sqlite?: InstanceType<typeof Database>;
};

function createDb() {
  if (globalForDb.__db) return globalForDb.__db;
  // ... SQLite 연결 생성
  globalForDb.__db = drizzle(sqlite, { schema });
  return globalForDb.__db;
}

export const db = createDb();
```

### Drizzle 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run db:generate` | 스키마 변경 시 마이그레이션 SQL 생성 |
| `npm run db:migrate` | 마이그레이션 실행 |
| `npm run db:studio` | Drizzle Studio (브라우저 DB 탐색기) |

---

## 플랫폼 플러그인 개발

### 인터페이스

`src/lib/platforms/types.ts`에 정의된 `BlogPlatform` 인터페이스를 구현한다.

```typescript
interface BlogPlatform {
  config: PlatformConfig;
  isConfigured(credentials: Record<string, string>): boolean;
  validateCredentials(credentials: Record<string, string>): Promise<boolean>;
  publish(input: PublishInput, credentials: Record<string, string>): Promise<PublishResult>;
  update?(platformPostId: string, input: PublishInput, credentials: Record<string, string>): Promise<PublishResult>;
}
```

`PlatformConfig`의 `credentialFields` 배열이 Settings UI의 입력 폼을 자동으로 생성한다.

### 새 플러그인 추가 예시

1. `src/lib/platforms/wordpress.ts` 생성:

```typescript
import type { BlogPlatform } from "./types";

export const wordpress: BlogPlatform = {
  config: {
    id: "wordpress",
    name: "WordPress",
    icon: "W",
    url: "https://wordpress.org",
    credentialFields: [
      { key: "siteUrl", label: "Site URL", type: "url", required: true, placeholder: "https://yourblog.wordpress.com" },
      { key: "username", label: "Username", type: "text", required: true },
      { key: "password", label: "Application Password", type: "password", required: true },
    ],
  },

  isConfigured(creds) {
    return !!(creds.siteUrl && creds.username && creds.password);
  },

  async validateCredentials(creds) {
    const res = await fetch(`${creds.siteUrl}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: "Basic " + btoa(`${creds.username}:${creds.password}`) },
    });
    return res.ok;
  },

  async publish(input, creds) {
    // WordPress REST API로 글 발행
    // ...
  },
};
```

2. `src/lib/platforms/registry.ts`에 등록:

```typescript
import { wordpress } from "./wordpress";
platforms.set("wordpress", wordpress);
```

3. Settings 페이지에 자동으로 WordPress가 표시된다.

### 현재 등록된 플러그인

| 파일 | 플랫폼 | API |
|------|--------|-----|
| `hashnode.ts` | Hashnode | GraphQL (PublishPost / CreateDraft 뮤테이션) |
| `devto.ts` | DEV.to | REST (POST/PUT /api/articles) |
| `medium.ts` | Medium | REST (POST /v1/users/{id}/posts) |

---

## API Routes 개발

### 구조

`src/app/api/` 디렉토리에 Next.js Route Handlers로 구현.

```typescript
// src/app/api/example/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ data: "hello" });
}

export async function POST(request: Request) {
  const body = await request.json();
  // ...
  return NextResponse.json({ success: true });
}
```

### SSE 스트리밍

AI 글 생성(`/api/generate`)은 SSE로 스트리밍한다:

```typescript
const stream = new ReadableStream({
  async start(controller) {
    // Claude API 호출, chunk마다:
    controller.enqueue(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    // 완료 시:
    controller.enqueue("data: [DONE]\n\n");
    controller.close();
  },
});

return new Response(stream, {
  headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
});
```

---

## 빌드 및 배포

### 빌드

```bash
npm run build
npm run start
```

빌드 시 dev 서버가 실행 중이면 SQLite 락 충돌이 발생할 수 있다. 빌드 전에 dev 서버를 종료할 것.

### 배포

SQLite는 파일 기반 DB이므로 서버리스 환경(Vercel 등)에서는 사용할 수 없다.

권장 배포 방식:
- **VPS + PM2**: `pm2 start npm -- start`
- **Docker**: Node.js 18+ 이미지, `data/` 볼륨 마운트

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

`data/` 디렉토리를 Docker 볼륨으로 마운트해야 DB가 유지된다:

```bash
docker run -v $(pwd)/data:/app/data -p 3000:3000 git2blog
```

---

## 프로젝트 관련 문서

- [기획서](WEB_APP_SPEC.md) — 시스템 아키텍처, DB 스키마, API 명세
- [디자인 시스템](DESIGN_SYSTEM.md) — 색상, 타이포그래피, 컴포넌트 가이드
