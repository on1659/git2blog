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

# 언어 감지: en 파일이면 영어 publication + DEV.to 발행
IS_EN=false
if echo "$MD_FILE" | grep -q "_en_"; then
  IS_EN=true
fi

# Hashnode Publication ID 결정 (영어면 EN용, 없으면 기본)
ACTIVE_PUB_ID="$HASHNODE_PUB_ID"
if [ "$IS_EN" = true ] && [ -n "$HASHNODE_EN_PUB_ID" ]; then
  ACTIVE_PUB_ID="$HASHNODE_EN_PUB_ID"
  echo "🌐 영어 Publication으로 발행합니다."
fi

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
      publicationId: \"$ACTIVE_PUB_ID\",
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
  INPUT_FIELDS="\"publicationId\": \"$ACTIVE_PUB_ID\""
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
    echo "✅ [Hashnode] 초안 저장 완료!"
    echo "   제목: $DRAFT_TITLE"
    echo "   Draft ID: $DRAFT_ID"
  else
    POST_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['publishPost']['post']['url'])")
    echo ""
    echo "✅ [Hashnode] 발행 완료!"
    echo "   $POST_URL"
  fi
else
  echo ""
  echo "❌ [Hashnode] 발행 실패:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
fi

# ── Radar Blog (이더.dev) 발행 (한국어 파일만) ──

if [ "$IS_EN" = true ]; then
  echo ""
  echo "ℹ️  영어 파일은 Radar Blog 건너뜀 (ko 발행 시 자동 합산)"
fi

# en 파일 자동 탐색 (ko 파일인 경우만)
EN_TITLE=""
EN_BODY_ESCAPED='""'
if echo "$MD_FILE" | grep -q "_ko_"; then
  MD_DIR=$(dirname "$MD_FILE")
  EN_PATTERN=$(echo "$(basename "$MD_FILE")" | sed 's/_ko_[^.]*\.md/_en_*.md/')
  EN_FILE=$(ls "$MD_DIR"/$EN_PATTERN 2>/dev/null | head -1)

  if [ -n "$EN_FILE" ] && [ -f "$EN_FILE" ]; then
    echo "🌐 영어 버전 발견: $EN_FILE"
    EN_CONTENT=$(cat "$EN_FILE")
    EN_FM=$(echo "$EN_CONTENT" | sed -n '/^---$/,/^---$/p' | sed '1d;$d')
    EN_TITLE=$(echo "$EN_FM" | grep "^title:" | sed "s/^title:[[:space:]]*//" )
    EN_BODY=$(echo "$EN_CONTENT" | sed '1,/^---$/d' | sed '1,/^---$/d')
    EN_BODY_ESCAPED=$(echo "$EN_BODY" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')
  fi
fi

if [ "$IS_EN" != true ] && [ -n "$RADAR_BLOG_API_KEY" ]; then
  echo ""
  echo "📡 Radar Blog에도 발행합니다..."

  # 카테고리 결정: 파일명에 commit이 들어있으면 commits, 아니면 articles
  RADAR_CATEGORY="articles"
  if echo "$MD_FILE" | grep -qi "commit"; then
    RADAR_CATEGORY="commits"
  fi

  # published 여부: draft 모드면 false, 아니면 true
  RADAR_PUBLISHED=true
  if [ "$DRAFT_MODE" = "--draft" ]; then
    RADAR_PUBLISHED=false
  fi

  # 태그 JSON 배열 (문자열 배열)
  RADAR_TAGS_JSON="[]"
  if [ -n "$TAGS" ]; then
    RADAR_TAGS_JSON=$(echo "$TAGS" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | while read tag; do
      echo "\"$tag\""
    done | paste -sd',' - | sed 's/^/[/;s/$/]/')
  fi

  # JSON body 구성 (한영 합산)
  RADAR_BODY=$(python3 -c "
import json, sys

body = {
    'title': '''$TITLE''',
    'content': $BODY_ESCAPED,
    'category': '$RADAR_CATEGORY',
    'published': $RADAR_PUBLISHED
}

slug = '''$SLUG'''
if slug:
    body['slug'] = slug

subtitle = '''$SUBTITLE'''
if subtitle:
    body['subtitle'] = subtitle

tags = $RADAR_TAGS_JSON
if tags:
    body['tags'] = tags

titleEn = '''$EN_TITLE'''
if titleEn:
    body['titleEn'] = titleEn

contentEn = $EN_BODY_ESCAPED
if contentEn:
    body['contentEn'] = contentEn

print(json.dumps(body))
")

  RADAR_RESPONSE=$(curl -s -X POST https://radar-blog.up.railway.app/api/v1/posts \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $RADAR_BLOG_API_KEY" \
    -d "$RADAR_BODY")

  if echo "$RADAR_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('success')" 2>/dev/null; then
    RADAR_SLUG=$(echo "$RADAR_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['slug'])")
    echo "✅ [Radar Blog] 발행 완료!"
    echo "   https://radar-blog.up.railway.app/posts/$RADAR_SLUG"
  else
    echo "❌ [Radar Blog] 발행 실패:"
    echo "$RADAR_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RADAR_RESPONSE"
  fi
elif [ "$IS_EN" != true ]; then
  echo ""
  echo "⚠️  RADAR_BLOG_API_KEY가 .env에 없어서 Radar Blog 발행을 건너뜁니다."
fi

# ── DEV.to 발행 (영어 파일만) ──

if [ "$IS_EN" = true ]; then
  if [ -n "$DEVTO_TOKEN" ]; then
    echo ""
    echo "📡 DEV.to에도 발행합니다..."

    DEVTO_PUBLISHED=true
    if [ "$DRAFT_MODE" = "--draft" ]; then
      DEVTO_PUBLISHED=false
    fi

    python3 - "$MD_FILE" "$DEVTO_PUBLISHED" "$DEVTO_TOKEN" << 'DEVTO_PY'
import json, sys, re, os
import urllib.request, urllib.error
from pathlib import Path

md_path = Path(sys.argv[1])
published = sys.argv[2].lower() == 'true'
token = sys.argv[3]
content = md_path.read_text(encoding='utf-8')

parts = content.split('---', 2)
if len(parts) < 3:
    print('❌ frontmatter 형식이 올바르지 않습니다.')
    sys.exit(1)

fm_raw = parts[1]
body = parts[2].lstrip('\n')

fm = {}
for line in fm_raw.splitlines():
    if ':' in line:
        k, v = line.split(':', 1)
        fm[k.strip()] = v.strip()

title = fm.get('title', '').strip()
if not title:
    print('❌ frontmatter에 title이 없습니다.')
    sys.exit(1)

subtitle = fm.get('subtitle', '').strip()
description = subtitle[:200] if subtitle else ''

tags_raw = fm.get('tags', '')
tags = []
if tags_raw:
    for t in tags_raw.split(','):
        t = t.strip()
        if not t:
            continue
        slug = re.sub(r'[^a-z0-9]', '', t.lower())
        slug = slug[:20]
        if slug:
            tags.append(slug)
if len(tags) > 4:
    tags = tags[:4]

payload = {
    'article': {
        'title': title,
        'published': published,
        'body_markdown': body,
        'tags': tags,
    }
}
if description:
    payload['article']['description'] = description

req = urllib.request.Request(
    'https://dev.to/api/articles',
    data=json.dumps(payload).encode('utf-8'),
    headers={
        'Content-Type': 'application/json',
        'api-key': token
    },
    method='POST'
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        status = '초안 저장' if not published else '발행'
        print(f'✅ [DEV.to] {status} 완료!')
        print(f'   {data.get("url", data.get("id", ""))}')
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', errors='ignore')
    print(f'❌ [DEV.to] 발행 실패:')
    print(body)
DEVTO_PY
  else
    echo ""
    echo "⚠️  DEVTO_TOKEN이 .env에 없어서 DEV.to 발행을 건너뜁니다."
  fi
fi
