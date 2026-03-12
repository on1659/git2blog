# git2blog

GitHub 리포 → 커밋 분석 → 블로그 글 생성 → Hashnode + Radar Blog 발행.
이 프로젝트는 CLI 도구가 아니라, Claude Code 워크플로우다.

## 프로젝트 구조

```
CLAUDE.md              ← 이 파일 (스킬 + 워크플로우)
.env                   ← API 키 (gitignore)
scripts/publish.sh     ← Hashnode + Radar Blog 발행 스크립트
posts/                 ← 생성된 글 보관
```

## 환경변수

.env 파일에 아래 값이 필요하다:

```
HASHNODE_TOKEN=xxxxxxxx
HASHNODE_PUB_ID=xxxxxxxx
GITHUB_TOKEN=ghp_xxxxx    # 선택: private 리포 또는 rate limit 확보
RADAR_BLOG_API_KEY=xxxxx  # 이더.dev 블로그 API 키
```

## 워크플로우

사용자가 GitHub URL을 주면 아래 순서로 진행한다.

### 1단계: 커밋 로그 수집

```bash
curl -s -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/{owner}/{repo}/commits?per_page=50"
```

GitHub Token이 .env에 있으면 헤더에 추가한다:
```bash
-H "Authorization: token $GITHUB_TOKEN"
```

수집 대상: 커밋 메시지, 날짜, author, sha. README.md도 가져온다.

### 2단계: 제목 + 요약 제안

커밋 로그를 분석해서 블로그 글 제목 + 한줄 요약을 제안한다.
여러 편이 나올 수 있으면 복수 제안.
**사용자 승인 없이 본문을 바로 쓰지 않는다.**

### 3단계: 글 작성

승인 후 아래 blog-writing 스킬 규칙을 따라 글을 작성한다.
한국어 → `posts/blog_XX_ko_[주제].md`
영어 → `posts/blog_XX_en_[주제].md`

### 4단계: 발행

사용자가 "발행해줘"라고 하면 scripts/publish.sh를 실행한다.
Hashnode + Radar Blog(이더.dev) 두 곳에 동시 발행된다.

```bash
./scripts/publish.sh posts/blog_XX_ko_[주제].md          # 바로 발행 (양쪽 모두)
./scripts/publish.sh posts/blog_XX_ko_[주제].md --draft   # 초안 저장 (양쪽 모두)
```

RADAR_BLOG_API_KEY가 .env에 없으면 Radar Blog 발행은 건너뛴다.
또는 직접 curl로 Hashnode GraphQL API나 Radar Blog REST API를 호출해도 된다.

### Publication ID 조회 (최초 1회)

```bash
source .env
curl -s -X POST https://gql.hashnode.com \
  -H "Content-Type: application/json" \
  -H "Authorization: $HASHNODE_TOKEN" \
  -d '{"query":"{ publication(host: \"radar92.hashnode.dev\") { id title } }"}'
```

---
---

# Blog Writing Skill

---
name: blog-writing
description: Use this skill whenever the user asks to write a blog post, create blog content, or mentions '블로그', 'blog', 'post', or 'article'. Also trigger when the user drops raw materials (conversation logs, notes, screenshots) and wants them turned into blog posts. This skill defines the writing style, structure, tone, and bilingual (Korean/English) publishing rules for a solo developer's AI build log. Always use this skill for any blog-related writing task, even if the user doesn't explicitly say 'use the blog skill'.
---

# Blog Writing Skill

이 스킬은 블로그 글 작성 시 따라야 할 스타일, 구조, 규칙을 정의한다.
소재(대화 내용, 메모, 스크린샷 등)를 받으면 이 가이드에 맞춰 블로그 글을 생성한다.

> **주의:** 이 스킬 문서 자체는 가이드 정리용으로 표, 구분선 등을 사용한다. 실제 블로그 출력물에는 이 문서의 포맷팅을 따르지 않는다. 블로그 출력물은 아래 규칙을 따른다.

---

## 블로그 정체성

- **저자:** 이더 (KimYoungtae) — 게임 프로그래머 출신, AI × 사이드프로젝트를 동시에 굴리는 1인 개발자
- **본업:** Unreal Engine 5 C++ 게임 프로그래머 (멀티플레이어, Slate UI, iOS/Android 크로스플랫폼)
- **사이드:** AI 공부 + AI로 실제 작동하는 프로덕트 만들기 + 수익화 실험
- **블로그 목적:** 삽질 기록 + 기술 브랜딩 + 같은 길 걷는 사람한테 도움 되기
- **블로그 이름:** Radar (radar92.hashnode.dev)
- **플랫폼:** Hashnode (한영 블로그 2개, GitHub 연동 자동 발행)

---

## 문체 규칙

### 톤
- **대화체.** 친구한테 설명하듯이. "~합니다"가 아니라 "~다" 체.
- **가볍지만 내용은 탄탄하게.** 논문이 아니라 일기. 근데 배울 게 있는 일기.
- **솔직하게.** 삽질, 실수, 모르는 것을 숨기지 않는다.
- **게임 개발자 시각을 자연스럽게 녹인다.** UE5, 서버 아키텍처, 성능 최적화 감각이 AI 프로젝트에도 베어 나온다.
- **영어 버전도 같은 톤.** 격식 없이, 직접적으로. 학술적이지 않게.

### 금지
- ❌ "~하겠습니다", "~인 것 같습니다" 같은 존댓말
- ❌ 이모지 남용 (최소한으로, 제목에도 안 씀)
- ❌ "이 글에서는 ~에 대해 알아보겠습니다" 같은 교과서 도입부
- ❌ 불릿 포인트, 넘버링 리스트 **절대 금지** (코드 블록 안의 나열도 최소화)
- ❌ "하나, 둘, 셋" 같은 넘버링 서술도 금지 (문단 흐름으로 자연스럽게)
- ❌ 결론에서 "정리하자면" "요약하면" 등 상투적 표현
- ❌ 뻔한 AI 블로그 톤 ("AI의 발전은 눈부시게~")

### 권장
- ✅ 첫 문장에서 바로 핵심을 던진다
- ✅ 경험 기반. "나는 이렇게 했다"
- ✅ 구체적 숫자 포함 ($0.001, 88%, 28명 등)
- ✅ Before/After 대비 (❌ 잘못된 방식 vs ✅ 올바른 방식)
- ✅ 코드 블록으로 시각적 이해 도움
- ✅ 한줄 정리(인용구)로 마무리
- ✅ 다음 글 링크로 시리즈 연결
- ✅ 삽질 포인트 명시 ("여기서 3시간 날렸다")

### 가독성 규칙 (여백과 호흡)

글이 빽빽하면 안 읽힌다. 여백이 곧 가독성이다.

- **문단은 3~4줄 이내.** 5줄 넘어가면 반드시 나눈다.
- **문단 사이에 빈 줄 1개.** 항상.
- **핵심 문장은 홀로 한 줄에.** 앞뒤를 비워서 강조한다:

```
이건 사업이 아니라 기부다.
```

- **코드 블록 앞뒤에 빈 줄.** 코드가 본문에 달라붙으면 읽기 어렵다.
- **섹션(##) 앞에는 빈 줄 2개** 느낌으로 충분히 띄운다.
- **한 문장이 너무 길면 쪼갠다.** 쉼표 3개 이상이면 2문장으로 나눈다.
- **짧은 문장과 긴 문장을 섞는다.** 리듬감.
- **나열이 필요하면 문장 속에 녹인다.** "A, B, C 세 가지를 바꿨다" 식으로. 절대 불릿/넘버 리스트로 꺼내지 않는다.
- **"하나, 둘, 셋" 넘버링 서술도 금지.** 문단을 자연스럽게 이어서 쓴다. 각 항목을 별도 섹션(##)으로 나누거나, 문단 흐름 속에 녹인다.

나쁜 예:
```
사주 앱을 만들면서 처음 비용을 계산했을 때 숫자를 보고 멈췄다. 무료 분석 1건에 $0.085이고 하루 1,000명이 오면 월 $2,550이 되는데 무료인데 돈이 나가는 구조라 유료 전환율이 3%여도 유료 매출로 무료 비용을 못 메운다.
```

좋은 예:
```
사주 앱을 만들면서 처음 비용을 계산했을 때 숫자를 보고 멈췄다.

무료 분석 1건에 $0.085. 하루 1,000명이 오면 월 $2,550. 무료인데 돈이 나간다.

이건 사업이 아니라 기부다.
```

---

## 시각적 몰입 요소

글마다 최소 1개 이상 포함한다. 소재에 맞는 요소를 아래 기준으로 선택한다.

**코드 변경이 있으면 → Before/After 코드**

```typescript
// Before
const result = await callSonnet(prompt); // $0.085/건

// After
const result = tier === 'free'
  ? formatWithAlgorithm(engineResult) // $0
  : await callSonnet(prompt);         // $0.02/건
```

**비용, 성능, 수치 비교가 있으면 → 숫자 강조 패턴**

짧은 문장 + 큰 숫자 대비로 임팩트:

```
$4,500 vs $238.
같은 일. 같은 결과. 19배 차이.
```

**디버깅, 시행착오, 대화 기반 스토리면 → 대화체 장면 재현**

실제 상황을 대화처럼 보여줘서 몰입감을 준다:

```
나: "사주 분석해줘"
Claude: (자신있게 틀린 답을 내놓음)
나: "...간지가 틀렸는데?"
```

**기술 선택/비교가 있으면 → "왜 A를 골랐는지" 서술**

다른 선택지와 비교하면서 자연스럽게 설명한다. 코드 블록을 두 개 나란히 놓고 차이를 보여준다:

```
bash 버전을 먼저 만들었다. sed 4줄 + grep + 파이프라인.
되긴 되는데 읽을 수가 없다.

Python 버전은 한 줄이다.
match = re.match(r'^---\n(.*?)\n---\n(.*)$', content, re.DOTALL)
```

비교 대상이 있으면 임팩트가 훨씬 강하다.

※ Hashnode는 Mermaid 다이어그램을 지원한다. 복잡한 흐름도는 Mermaid로, 간단한 건 ASCII로.

---

## 깊이 규칙 (섹션별 밀도)

글이 짧으면 "그래서 뭐?" 가 된다. 각 섹션이 두텁게 채워져야 읽는 사람이 실제로 써먹을 수 있다.

**모든 섹션에 "왜"를 넣는다.** "이렇게 했다"만으로는 부족하다. 왜 이 방법을 선택했는지, 다른 방법은 왜 안 됐는지까지 써야 글이 깊어진다. "bash로 먼저 짰다 → 왜? → 읽을 수가 없어서 Python으로 다시 짰다" 이런 흐름.

**하나의 주제를 여러 각도에서 파고든다.** "frontmatter를 파싱했다"로 끝내지 않는다. 어떻게 파싱했는지, 뭐가 문제였는지, 어떤 코드로 해결했는지, 그 코드가 왜 그 형태인지까지 풀어낸다. 표면만 훑는 게 아니라 한 꺼풀씩 벗긴다.

**실전 코드를 아끼지 않는다.** 짧은 코드 블록을 여러 번 보여주는 게 긴 설명보다 낫다. 한 섹션에 코드 블록 2~3개가 있어도 된다. 코드 사이사이에 "이 코드가 왜 이렇게 생겼는지"를 짧게 설명한다.

**비교와 대조로 입체감을 만든다.** "A를 쓴다"보다 "A를 쓰는 이유, B는 왜 안 되는지"가 훨씬 읽힌다. 기술 선택이 있으면 반드시 다른 선택지와 비교한다.

나쁜 예:

```
Python으로 frontmatter를 파싱했다.
```

좋은 예:

```
bash 버전을 먼저 만들었다. sed로 --- 사이를 잘라내는 게 
생각보다 까다롭다.

FRONTMATTER=$(echo "$CONTENT" | sed -n '/^---$/,/^---$/p' | sed '1d;$d')

되긴 되는데, 읽을 수가 없다.

그래서 Python 버전을 만들었다. 한 줄이다.

match = re.match(r'^---\n(.*?)\n---\n(.*)$', content, re.DOTALL)

bash에서 sed 4줄 쓰던 걸 Python에서 1줄로 끝냈다.
```

두 번째 예시가 훨씬 길다. 하지만 읽는 사람 입장에서는 **실제로 써먹을 수 있는 정보**가 담겨 있다. 이게 깊이다.

---

## Hashnode 트렌디 기법

Hashnode에서 눈에 띄고, 북마크/리액션을 받는 패턴들.

### 제목에 숫자 + 결과를 넣는다

```
❌ LLM API 비용 최적화에 대하여
✅ LLM API 비용을 88% 줄인 3가지 방법
```

숫자가 있으면 클릭률이 올라간다. "방법", "이유", "실수" 같은 단어가 호기심을 만든다.

### 첫 3줄이 전부다

Hashnode 피드에서 글 카드에 description이 보인다. 첫 3줄이 흥미롭지 않으면 클릭 안 한다. 도입부 없이 바로 핵심 문장이나 충격적인 숫자로 시작한다.

```
❌ 안녕하세요, 오늘은 사주 앱 개발 과정을 공유하려고 합니다.
✅ 무료 분석 1건에 $0.085. 하루 1,000명이면 월 $2,550. 무료인데 돈이 나간다.
```

### 커버 이미지를 넣는다

Hashnode 피드에서 커버 이미지가 있는 글이 눈에 훨씬 잘 띈다. frontmatter에:

```yaml
cover: https://cdn.hashnode.com/res/hashnode/image/upload/xxxxx.png
```

없으면 생략해도 되지만, 있으면 클릭률이 올라간다. 간단한 텍스트 기반 이미지(Canva, figma)도 충분하다.

### 구분선(---)으로 섹션을 나눈다

Hashnode에서 `---`는 수평선으로 렌더링된다. 큰 주제 전환 시 헤딩 대신 구분선을 쓰면 시각적 호흡이 생긴다.

```markdown
첫 번째 이야기 끝.

---

두 번째 이야기 시작.
```

### 볼드와 이탤릭을 전략적으로 쓴다

문단에서 핵심 1~2단어만 볼드. 남발하면 효과가 사라진다.

```markdown
무료 분석은 사실 **LLM이 별로 필요 없다.** 엔진이 이미 계산을 끝냈다.
```

### 접이식(Details)으로 긴 코드를 숨긴다

Hashnode는 `<details>` 태그를 지원한다. 긴 코드나 부가 정보는 접어둔다:

```markdown
<details>
<summary>전체 JSON 스키마 보기</summary>

여기에 긴 코드 블록

</details>
```

글이 짧아 보여서 읽기 부담이 줄어든다.

### 강한 문장으로 끝낸다

Hashnode에서 "여러분은 어떻게 생각하시나요?"는 식상하다. 대신 강한 주장으로 끝내면 댓글이 달린다.

```
❌ 여러분은 AI 앱에서 비용을 어떻게 줄이시나요?
✅ > "모든 질문에 교수를 부르지 마라."
```

동의하든 반박하든, 강한 문장이 반응을 만든다.

---

## 글 구조

고정 구조 없음. **글마다 내용에 맞게 유연하게 쓴다.**

다만, 아래 요소들은 가능하면 포함한다:

| 요소 | 설명 | 필수 여부 |
|------|------|----------|
| 첫 문장 핵심 | 바로 들어간다. 도입 없이. | 필수 |
| 문제/배경 | 왜 이 주제가 나왔는지 | 권장 |
| 삽질/깨달음 | 뭐가 안 됐고, 뭘 알게 됐는지 | 권장 |
| 구체적 내용 | 숫자, 코드, 대화 재현 | 권장 |
| 한줄 정리 | > 인용구 형태 | 필수 |

글 마지막은 인용구로 끝낸다. 그 뒤에 아무것도 붙이지 않는다.

### 섹션 깊이 기준

각 `##` 섹션은 최소 3~5개 문단 + 코드 블록 1개 이상으로 구성한다. "왜 이렇게 했는지"와 "다른 방법은 왜 안 됐는지"를 반드시 포함한다. 하나의 섹션이 짧으면(2문단 이하) 다른 섹션과 합치거나, 실전 예시를 더 넣어서 두텁게 만든다.

섹션 수는 최소 4개 이상. 글 전체가 5000~8000자가 되려면 얇은 섹션 10개보다 두꺼운 섹션 4~6개가 낫다.

---

## Frontmatter 및 메타데이터

### 템플릿 (Hashnode)

```yaml
---
title: [제목]
subtitle: [부제]
slug: [url-slug]
tags: [태그, 쉼표, 구분]
cover: [URL]  # 선택
---
```

- `slug` — 한영 동일하게 사용 (예: `rag-server-typo-correction`)
- `tags` — 최대 5개 권장

### 태그 예시

한국어: `AI, 사이드프로젝트, 로컬LLM, 게임개발, UE5, RAG, 자동매매, Next.js, Railway배포`

영어: `AI, side-project, local-llm, gamedev, rag, nextjs, railway, unrealengine`

---

## 분량

- 편당 **5000~8000자** (한국어 기준)
- 읽는 데 **10~15분**
- 하나의 글에 **하나의 핵심 메시지만**
- 짧은 글보다 **깊은 글**. 각 섹션이 실전 예시와 코드로 두텁게 채워져야 한다.

---

## 한영 동시 작성 규칙

한국어 1편 + 영어 1편 = 한 세트. 영어는 직역이 아니라 **같은 내용을 영어 독자 관점에서 다시 쓴다.**

### 영어 버전 핵심 원칙

**한국 특화 개념은 반드시 풀어 설명한다.** 한국어에서 한 단어로 끝나는 개념이 영어 독자에게는 낯설다. 첫 등장 시 짧은 설명을 붙인다.

```
❌ I used manseryeok to calculate the base chart.
✅ I used manseryeok — the traditional Korean astronomical calendar — to calculate the base chart.
```

```
❌ The saju result was wrong.
✅ The saju (Korean four-pillar fortune) result was wrong.
```

```
❌ Ohaeng balance was off.
✅ The ohaeng (five elements: wood, fire, earth, metal, water) balance was off.
```

이런 설명은 첫 등장 1회만. 이후에는 용어를 그대로 쓴다.

**영어 톤도 캐주얼.** 학술적이지 않고, 블로그답게 쓴다.

```
❌ This paper presents an architectural approach to cost optimization in LLM-based applications.
✅ I burned $2,550/month on free users before I figured this out.
```

```
❌ It can be observed that the computational overhead is significant.
✅ The API bill was brutal.
```

### 파일명 규칙

`blog_XX_ko_[주제].md`, `blog_XX_en_[주제].md` — `posts/` 폴더에 위치.

---

## 소재 → 블로그 변환 프로세스

사용자가 아래 형태로 소재를 던질 수 있다: 대화 내용 통째로, 메모/노트, 스크린샷, 또는 "이 주제로 써줘".

**GitHub 커밋 로그를 직접 확인한다** — 소재에 GitHub URL이 포함돼 있으면 `[URL]/commits` 또는 GitHub API를 통해 커밋 로그를 직접 fetch해서 분석에 활용한다. URL이 없으면 소재만으로 작성한다.

커밋 로그가 **있을 때**:
- 삽질/시행착오 중심으로 구성. 커밋 순서에서 막혔던 지점, 돌아간 지점을 스토리로 녹인다.
- 기술 변경사항은 Before/After로. 커밋 메시지에서 변경 맥락을 추출해 활용한다.
- "여기서 N시간 날렸다" 같은 삽질 포인트를 커밋 흐름에서 찾아낸다.

커밋 로그가 **없을 때**:
- 소재만으로 자유롭게 작성. 가장 임팩트 있는 포인트 중심으로 잡는다.

**먼저 제안한다** — 몇 편이 나오는지 제목 + 한줄 요약 리스트로 보여준다. 기존 글과 중복되는 내용이 있으면 함께 알린다.

**승인을 받는다** — 사용자가 편수, 제목, 방향을 확인한 뒤 작성에 들어간다. 승인 없이 바로 쓰지 않는다.

**한영 동시 작성** — 승인 후 Hashnode frontmatter 포함 완성 md 파일로 한국어/영어 세트를 제공한다.

---

## 시리즈 관리

**Series 1: AI × 사이드프로젝트 개발기** (현재 진행)

예시 흐름: 게임 개발자가 AI 사이드를 시작한 이유 → 로컬 LLM으로 게임 위키 RAG 서버 만들기 → 당근마켓 다중 지역 검색기 → A→B 경로 최적화 → 업비트 자동매매 봇 → 팰월드 서버 관리 패널 → Socket.IO 실시간 팀 배정

**예정 시리즈:** Series 2 (트레이딩 봇 심화), Series 3 (AI 게임 생성 플랫폼)

새 시리즈 시작 시 이 문서에 추가한다.

---

## 문체 샘플

새 글도 이 톤과 여백을 유지한다.

### 한국어 샘플
```
사주 앱을 만들면서 가장 먼저 배운 건, AI한테 뭘 시킬지가 아니라 뭘 안 시킬지였다.

"1990년 3월 15일생 사주 알려줘."

이렇게 LLM한테 바로 던졌다. 답변은 그럴듯하게 나온다.

근데 문제가 있다. 간지가 틀린다.
```

### 영어 샘플
```
The first lesson I learned building a fortune-telling app:
it's not about what you ask AI to do — it's about what you don't.

"Tell me the fortune for someone born March 15, 1990."

I threw this straight at an LLM. The response looked great.

But there was a problem. The base calculations were wrong.
```

I threw this straight at an LLM. The response looked great.

But there was a problem. The base calculations were wrong.
```
