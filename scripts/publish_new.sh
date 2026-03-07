#!/bin/bash
# Hashnode 발행 스크립트 (수정본)

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

# Python으로 JSON payload 생성
python3 << EOF
import json
import sys

# 변수 로드
title = """$TITLE"""
subtitle = """$SUBTITLE"""
slug = """$SLUG"""
tags_str = """$TAGS"""
body = """$BODY"""
pub_id = "$HASHNODE_PUB_ID"
draft_mode = "$DRAFT_MODE"

# 태그 파싱
tags = []
if tags_str:
    for tag in tags_str.split(','):
        tag = tag.strip()
        if tag:
            slug_tag = tag.lower().replace(' ', '-')
            tags.append({"slug": slug_tag, "name": tag})

# GraphQL 뮤테이션 구성
if draft_mode == "--draft":
    mutation = """
    mutation CreateDraft(\$input: CreateDraftInput!) {
        createDraft(input: \$input) {
            draft {
                id
                title
            }
        }
    }
    """
    
    variables = {
        "input": {
            "publicationId": pub_id,
            "title": title,
            "contentMarkdown": body,
            "tags": tags
        }
    }
else:
    mutation = """
    mutation PublishPost(\$input: PublishPostInput!) {
        publishPost(input: \$input) {
            post {
                id
                url
                title
            }
        }
    }
    """
    
    input_obj = {
        "publicationId": pub_id,
        "title": title,
        "contentMarkdown": body,
        "tags": tags
    }
    
    if slug:
        input_obj["slug"] = slug
    if subtitle:
        input_obj["subtitle"] = subtitle
    
    variables = {"input": input_obj}

# JSON 출력
payload = {
    "query": mutation,
    "variables": variables
}

print(json.dumps(payload))
EOF
