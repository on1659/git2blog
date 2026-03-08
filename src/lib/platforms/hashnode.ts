import type { BlogPlatform, PublishInput, PublishResult, CheckExistsResult } from "./types";

/**
 * Hashnode tag slug는 [a-z0-9-]{1,250}만 허용.
 * 한글 태그는 name에만 넣고, slug에서는 한글을 제거한다.
 * slug가 비면 name만 보내서 Hashnode가 자동 생성하게 한다.
 */
function formatTags(rawTags: string[]): { slug: string; name: string }[] {
  return rawTags
    .filter((t) => t.trim())
    .map((t) => {
      const slug = t
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return { slug, name: t };
    })
    .filter((t) => t.slug.length > 0);
}

export const hashnode: BlogPlatform = {
  config: {
    id: "hashnode",
    name: "Hashnode",
    icon: "H",
    url: "https://hashnode.com",
    credentialFields: [
      {
        key: "token",
        label: "API 토큰",
        type: "password",
        required: true,
        placeholder: "Hashnode API 토큰",
      },
      {
        key: "publicationId",
        label: "퍼블리케이션 ID",
        type: "text",
        required: true,
        placeholder: "퍼블리케이션 ID",
      },
    ],
  },

  isConfigured(creds) {
    return !!(creds.token && creds.publicationId);
  },

  async validateCredentials(creds) {
    try {
      const res = await fetch("https://gql.hashnode.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: creds.token,
        },
        body: JSON.stringify({
          query: `{ me { id username } }`,
        }),
      });
      const data = await res.json();
      return !!data?.data?.me?.id;
    } catch {
      return false;
    }
  },

  async publish(input: PublishInput, creds): Promise<PublishResult> {
    try {
      if (input.isDraft) {
        return await publishDraft(input, creds);
      }
      return await publishPost(input, creds);
    } catch (e: unknown) {
      return {
        success: false,
        platform: "hashnode",
        error: e instanceof Error ? e.message : "알 수 없는 오류",
      };
    }
  },

  async checkExists(platformPostId: string, creds): Promise<CheckExistsResult> {
    try {
      const query = `
        query GetPost($id: ObjectId!) {
          post(id: $id) {
            id
            title
            url
          }
        }
      `;
      const res = await fetch("https://gql.hashnode.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: creds.token,
        },
        body: JSON.stringify({ query, variables: { id: platformPostId } }),
      });
      const data = await res.json();
      const post = data.data?.post;
      if (post) {
        return { exists: true, url: post.url, title: post.title };
      }
      return { exists: false };
    } catch {
      return { exists: false };
    }
  },
};

async function publishPost(input: PublishInput, creds: Record<string, string>): Promise<PublishResult> {
  const mutation = `
    mutation PublishPost($input: PublishPostInput!) {
      publishPost(input: $input) {
        post {
          id
          slug
          url
        }
      }
    }
  `;

  const tags = formatTags(input.tags);

  const variables = {
    input: {
      title: input.title,
      subtitle: input.subtitle || undefined,
      contentMarkdown: input.body,
      publicationId: creds.publicationId,
      slug: input.slug,
      tags: tags.length > 0 ? tags : undefined,
      coverImageOptions: input.coverImage
        ? { coverImageURL: input.coverImage }
        : undefined,
    },
  };

  console.log("[hashnode] publishPost 요청:", { title: input.title, slug: input.slug, tagsCount: tags.length, bodyLen: input.body.length });

  const res = await fetch("https://gql.hashnode.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: creds.token,
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  console.log("[hashnode] publishPost HTTP:", res.status, res.statusText);
  const data = await res.json();
  console.log("[hashnode] publishPost 응답:", JSON.stringify(data).slice(0, 500));

  if (data.errors) {
    const detail = data.errors[0]?.extensions?.code
      ? `[${data.errors[0].extensions.code}] ${data.errors[0].message}`
      : data.errors[0]?.message;
    return {
      success: false,
      platform: "hashnode",
      error: detail || "발행 실패",
    };
  }

  const post = data.data?.publishPost?.post;
  return {
    success: true,
    platform: "hashnode",
    platformPostId: post?.id,
    url: post?.url,
  };
}

async function publishDraft(input: PublishInput, creds: Record<string, string>): Promise<PublishResult> {
  const mutation = `
    mutation CreateDraft($input: CreateDraftInput!) {
      createDraft(input: $input) {
        draft {
          id
          slug
        }
      }
    }
  `;

  const tags = formatTags(input.tags);

  const variables = {
    input: {
      title: input.title,
      subtitle: input.subtitle || undefined,
      contentMarkdown: input.body,
      publicationId: creds.publicationId,
      slug: input.slug,
      tags: tags.length > 0 ? tags : undefined,
      coverImageOptions: input.coverImage
        ? { coverImageURL: input.coverImage }
        : undefined,
    },
  };

  console.log("[hashnode] publishDraft 요청:", { title: input.title, slug: input.slug, tagsCount: tags.length, bodyLen: input.body.length });

  const res = await fetch("https://gql.hashnode.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: creds.token,
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  console.log("[hashnode] publishDraft HTTP:", res.status, res.statusText);
  const data = await res.json();
  console.log("[hashnode] publishDraft 응답:", JSON.stringify(data).slice(0, 500));

  if (data.errors) {
    const detail = data.errors[0]?.extensions?.code
      ? `[${data.errors[0].extensions.code}] ${data.errors[0].message}`
      : data.errors[0]?.message;
    return {
      success: false,
      platform: "hashnode",
      error: detail || "초안 저장 실패",
    };
  }

  const draft = data.data?.createDraft?.draft;
  return {
    success: true,
    platform: "hashnode",
    platformPostId: draft?.id,
    url: undefined,
  };
}
