#!/bin/bash
# Hashnode 발행 스크립트
# 사용법:
#   ./scripts/publish.sh posts/blog_01_ko_example.md          # 바로 발행
#   ./scripts/publish.sh posts/blog_01_ko_example.md --draft   # 초안 저장

set -e

# .env 로드
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env 파일이 없습니다. .env.example을 참고해서 만드세요."
  exit 1
fi

source "$ENV_FILE"

if [ -z "$HASHNODE_TOKEN" ] || [ -z "$HASHNODE_PUB_ID" ]; then
  echo "❌ .env에 HASHNODE_TOKEN, HASHNODE_PUB_ID를 설정하세요."
  exit 1
fi

# 인자 확인
MD_FILE="$1"
DRAFT_MODE="$2"

if [ -z "$MD_FILE" ]; then
  echo "사용법: ./scripts/publish.sh <마크다운파일> [--draft]"
  exit 1
fi

if [ ! -f "$MD_FILE" ]; then
  echo "❌ 파일을 찾을 수 없습니다: $MD_FILE"
  exit 1
fi

# frontmatter 파싱
CONTENT=$(cat "$MD_FILE")

# frontmatter 추출 (--- 사이)
FRONTMATTER=$(echo "$CONTENT" | sed -n '/^---$/,/^---$/p' | sed '1d;$d')
BODY=$(echo "$CONTENT" | sed '1,/^---$/d' | sed '1,/^---$/d')

# frontmatter에서 값 추출
get_fm_value() {
  echo "$FRONTMATTER" | grep "^$1:" | sed "s/^$1:[[:space:]]*//" | sed 's/^\[//;s/\]$//'
}

TITLE=$(get_fm_value "title")
SUBTITLE=$(get_fm_value "subtitle")
SLUG=$(get_fm_value "slug")
TAGS=$(get_fm_value "tags")

if [ -z "$TITLE" ]; then
  echo "❌ frontmatter에 title이 없습니다."
  exit 1
fi

echo "📝 제목: $TITLE"
echo "   슬러그: $SLUG"
echo "   태그: $TAGS"

# 태그 JSON 배열 생성
TAGS_JSON="[]"
if [ -n "$TAGS" ]; then
  TAGS_JSON=$(echo "$TAGS" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | while read tag; do
    slug=$(echo "$tag" | tr '[:upper:]' '[:lower:]' | sed 's/[[:space:]]/-/g')
    echo "{\"slug\":\"$slug\",\"name\":\"$tag\"}"
  done | paste -sd',' - | sed 's/^/[/;s/$/]/')
fi

# body에서 JSON 이스케이프
BODY_ESCAPED=$(echo "$BODY" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')

# GraphQL 뮤테이션 구성
if [ "$DRAFT_MODE" = "--draft" ]; then
  echo "📋 초안 모드로 저장합니다..."
  MUTATION="mutation {
    createDraft(input: {
      publicationId: \"$HASHNODE_PUB_ID\",
      title: $(echo "$TITLE" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read().strip()))'),
      contentMarkdown: $BODY_ESCAPED,
      tags: $TAGS_JSON
    }) {
      draft { id title }
    }
  }"
else
  echo "🚀 발행합니다..."

  # input 구성
  INPUT_FIELDS="\"publicationId\": \"$HASHNODE_PUB_ID\""
  INPUT_FIELDS="$INPUT_FIELDS, \"title\": $(echo "$TITLE" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read().strip()))')"
  INPUT_FIELDS="$INPUT_FIELDS, \"contentMarkdown\": $BODY_ESCAPED"
  INPUT_FIELDS="$INPUT_FIELDS, \"tags\": $TAGS_JSON"

  if [ -n "$SLUG" ]; then
    INPUT_FIELDS="$INPUT_FIELDS, \"slug\": \"$SLUG\""
  fi
  if [ -n "$SUBTITLE" ]; then
    INPUT_FIELDS="$INPUT_FIELDS, \"subtitle\": $(echo "$SUBTITLE" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read().strip()))')"
  fi

  MUTATION="mutation { publishPost(input: { $INPUT_FIELDS }) { post { id url title } } }"
fi

# API 호출
RESPONSE=$(curl -s -X POST https://gql.hashnode.com \
  -H "Content-Type: application/json" \
  -H "Authorization: $HASHNODE_TOKEN" \
  -d "$(python3 -c "import json; print(json.dumps({'query': '''$MUTATION'''}))")")

# 결과 확인
if echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'errors' not in d" 2>/dev/null; then
  if [ "$DRAFT_MODE" = "--draft" ]; then
    DRAFT_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['createDraft']['draft']['id'])")
    DRAFT_TITLE=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['createDraft']['draft']['title'])")
    echo ""
    echo "✅ 초안 저장 완료!"
    echo "   제목: $DRAFT_TITLE"
    echo "   Draft ID: $DRAFT_ID"
  else
    POST_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['publishPost']['post']['url'])")
    echo ""
    echo "✅ 발행 완료!"
    echo "   $POST_URL"
  fi
else
  echo ""
  echo "❌ 발행 실패:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
fi
