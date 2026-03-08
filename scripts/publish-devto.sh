#!/bin/bash
# dev.to 발행 스크립트
# 사용법:
#   ./scripts/publish-devto.sh posts/blog_01_en_example.md          # 발행
#   ./scripts/publish-devto.sh posts/blog_01_en_example.md --draft   # draft 저장

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env 파일이 없습니다. .env.example 참고해서 만드세요."
  exit 1
fi

source "$ENV_FILE"

if [ -z "$DEVTO_TOKEN" ]; then
  echo "❌ .env에 DEVTO_TOKEN을 설정하세요."
  exit 1
fi

MD_FILE="$1"
MODE="$2"

if [ -z "$MD_FILE" ]; then
  echo "사용법: ./scripts/publish-devto.sh <마크다운파일> [--draft]"
  exit 1
fi

if [ ! -f "$MD_FILE" ]; then
  echo "❌ 파일을 찾을 수 없습니다: $MD_FILE"
  exit 1
fi

PUBLISHED=true
if [ "$MODE" = "--draft" ]; then
  PUBLISHED=false
fi

python3 - "$MD_FILE" "$PUBLISHED" << 'PY'
import json, sys, re
from pathlib import Path
import urllib.request

md_path = Path(sys.argv[1])
published = sys.argv[2].lower() == 'true'
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
        slug = re.sub(r'[^a-z0-9_\- ]+', '', t.lower()).replace(' ', '-')
        slug = slug[:20].strip('-_')
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
        'api-key': __import__('os').environ.get('DEVTO_TOKEN', '')
    },
    method='POST'
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print('✅ dev.to 발행 완료!')
        print(data.get('url') or data.get('path') or data.get('id'))
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', errors='ignore')
    print('❌ dev.to 발행 실패:')
    print(body)
    sys.exit(1)
PY