#!/usr/bin/env python3
"""Hashnode 발행 스크립트 (Python 버전)"""

import os
import sys
import json
import re
import urllib.request
import urllib.error

def load_env():
    """.env 파일 로드"""
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if not os.path.exists(env_path):
        print("❌ .env 파일이 없습니다.")
        sys.exit(1)
    
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value
    
    token = os.environ.get('HASHNODE_TOKEN')
    pub_id = os.environ.get('HASHNODE_PUB_ID')
    
    if not token or not pub_id:
        print("❌ .env에 HASHNODE_TOKEN, HASHNODE_PUB_ID를 설정하세요.")
        sys.exit(1)
    
    return token, pub_id

def parse_frontmatter(content):
    """frontmatter 파싱"""
    match = re.match(r'^---\n(.*?)\n---\n(.*)$', content, re.DOTALL)
    if not match:
        return None, content
    
    fm_str, body = match.groups()
    frontmatter = {}
    
    for line in fm_str.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            value = value.strip()
            # [tag1, tag2] 형식 파싱
            if value.startswith('[') and value.endswith(']'):
                value = [t.strip() for t in value[1:-1].split(',')]
            frontmatter[key.strip()] = value
    
    return frontmatter, body

def publish_post(md_file, token, pub_id, draft=False):
    """Hashnode에 포스트 발행"""
    if not os.path.exists(md_file):
        print(f"❌ 파일을 찾을 수 없습니다: {md_file}")
        return None
    
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    frontmatter, body = parse_frontmatter(content)
    
    if not frontmatter or 'title' not in frontmatter:
        print("❌ frontmatter에 title이 없습니다.")
        return None
    
    title = frontmatter.get('title')
    subtitle = frontmatter.get('subtitle', '')
    slug = frontmatter.get('slug', '')
    tags = frontmatter.get('tags', [])
    
    print(f"📝 제목: {title}")
    print(f"   슬러그: {slug}")
    print(f"   태그: {tags}")
    
    # 한글 태그를 영문 slug로 변환
    tag_slug_map = {
        'ai': 'ai',
        '사이드프로젝트': 'side-project',
        '네이버api': 'naver-api',
        '가격비교': 'price-comparison',
        'svelte': 'svelte',
        'express': 'express',
        'spa': 'spa',
        'side-project': 'side-project',
        'naver-api': 'naver-api',
        'price-comparison': 'price-comparison',
        'gamedev': 'gamedev',
        'local-llm': 'local-llm',
        'nextjs': 'nextjs',
        'railway': 'railway',
        'unrealengine': 'unrealengine',
        'rag': 'rag',
    }
    
    # 태그 포맷팅
    tags_json = []
    for tag in tags:
        tag_lower = tag.lower().replace(' ', '-').replace('/', '-')
        tag_slug = tag_slug_map.get(tag_lower, tag_lower)
        # 한글이 포함되어 있으면 영문 변환 시도
        if any('\u3131' <= c <= '\u318e' or '\uac00' <= c <= '\ud7a3' for c in tag_slug):
            # 한글 태그는 그냥 name만 사용, slug는 자동 생성되도록 빈 문자열
            tags_json.append({"name": tag})
        else:
            tags_json.append({"slug": tag_slug, "name": tag})
    
    if draft:
        print("📋 초안 모드로 저장합니다...")
        mutation = """
        mutation CreateDraft($input: CreateDraftInput!) {
            createDraft(input: $input) {
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
                "tags": tags_json
            }
        }
    else:
        print("🚀 발행합니다...")
        mutation = """
        mutation PublishPost($input: PublishPostInput!) {
            publishPost(input: $input) {
                post {
                    id
                    url
                    title
                }
            }
        }
        """
        input_data = {
            "publicationId": pub_id,
            "title": title,
            "contentMarkdown": body,
            "tags": tags_json
        }
        if slug:
            input_data["slug"] = slug
        if subtitle:
            input_data["subtitle"] = subtitle
        variables = {"input": input_data}
    
    # API 호출
    url = "https://gql.hashnode.com"
    data = json.dumps({"query": mutation, "variables": variables}).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers={
        'Content-Type': 'application/json',
        'Authorization': token
    })
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if 'errors' in result:
                print(f"\n❌ 발행 실패:")
                print(json.dumps(result['errors'], indent=2, ensure_ascii=False))
                return None
            
            if draft:
                draft_data = result['data']['createDraft']['draft']
                print(f"\n✅ 초안 저장 완료!")
                print(f"   제목: {draft_data['title']}")
                print(f"   Draft ID: {draft_data['id']}")
            else:
                post_data = result['data']['publishPost']['post']
                print(f"\n✅ 발행 완료!")
                print(f"   {post_data['url']}")
                return post_data['url']
            
    except urllib.error.HTTPError as e:
        print(f"\n❌ HTTP 에러: {e.code}")
        print(e.read().decode('utf-8'))
        return None

def main():
    if len(sys.argv) < 2:
        print("사용법: python publish.py <마크다운파일> [--draft]")
        sys.exit(1)
    
    md_file = sys.argv[1]
    draft = '--draft' in sys.argv
    
    token, pub_id = load_env()
    publish_post(md_file, token, pub_id, draft)

if __name__ == '__main__':
    main()