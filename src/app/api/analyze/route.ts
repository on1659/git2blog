import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { platformCredentials } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function getServiceCredential(serviceId: string, key: string, envFallback?: string): Promise<string> {
  try {
    const result = await db
      .select()
      .from(platformCredentials)
      .where(eq(platformCredentials.platformId, serviceId));
    if (result.length > 0) {
      const creds = JSON.parse(result[0].credentials);
      if (creds[key]) return creds[key];
    }
  } catch { /* DB 오류 시 env fallback */ }
  return envFallback || "";
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Parse GitHub URL
    const match = url.match(
      /github\.com\/([^\/]+)\/([^\/\?#]+)/
    );
    if (!match) {
      return NextResponse.json(
        { error: "Invalid GitHub URL" },
        { status: 400 }
      );
    }

    const [, owner, repo] = match;
    const repoName = repo.replace(/\.git$/, "");

    // Fetch commits
    const githubToken = await getServiceCredential("github", "token", process.env.GITHUB_TOKEN);
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };
    if (githubToken) {
      headers.Authorization = `token ${githubToken}`;
    }

    const commitsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/commits?per_page=50`,
      { headers }
    );

    if (!commitsRes.ok) {
      return NextResponse.json(
        { error: `GitHub API error: ${commitsRes.status}` },
        { status: 502 }
      );
    }

    const commitsData = await commitsRes.json();
    const commits = commitsData.map(
      (c: {
        sha: string;
        commit: {
          message: string;
          author: { name: string; date: string };
        };
      }) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date,
      })
    );

    // Fetch README
    let readme = "";
    try {
      const readmeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/readme`,
        { headers }
      );
      if (readmeRes.ok) {
        const readmeData = await readmeRes.json();
        readme = Buffer.from(readmeData.content, "base64").toString("utf-8");
      }
    } catch {
      // README not found, that's ok
    }

    // Generate suggestions using Claude API
    const anthropicKey = await getServiceCredential("anthropic", "apiKey", process.env.ANTHROPIC_API_KEY);
    if (!anthropicKey) {
      // Return a simple suggestion without AI
      return NextResponse.json({
        commits,
        readme,
        repo: { owner, repo: repoName },
        suggestions: [
          {
            title_ko: `${repoName} 개발 과정 분석`,
            title_en: `Building ${repoName}: A Development Journey`,
            summary: `Analysis of ${commits.length} commits in ${repoName}`,
            angle: "development-journey",
          },
        ],
      });
    }

    const commitSummary = commits
      .slice(0, 30)
      .map((c: { message: string; date: string }) => `- ${c.message} (${c.date})`)
      .join("\n");

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Analyze these GitHub commits and suggest blog post topics.

Repository: ${owner}/${repoName}
README excerpt: ${readme.slice(0, 500)}

Recent commits:
${commitSummary}

Return a JSON array of 1-3 suggestions. Each suggestion should have:
- title_ko: Korean title (catchy, with numbers if possible)
- title_en: English title
- summary: One-line summary of the post angle
- angle: A keyword describing the angle (e.g. "cost-optimization", "debugging", "architecture")

Return ONLY the JSON array, no other text.`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      // Fallback suggestion
      return NextResponse.json({
        commits,
        readme,
        repo: { owner, repo: repoName },
        suggestions: [
          {
            title_ko: `${repoName} 개발기`,
            title_en: `Building ${repoName}`,
            summary: `Development journey of ${repoName} based on ${commits.length} commits`,
            angle: "development-journey",
          },
        ],
      });
    }

    const aiData = await aiRes.json();
    const aiText =
      aiData.content?.[0]?.text || "[]";

    let suggestions;
    try {
      // Extract JSON from the response
      const jsonMatch = aiText.match(/\[[\s\S]*\]/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      suggestions = [
        {
          title_ko: `${repoName} 개발기`,
          title_en: `Building ${repoName}`,
          summary: `Development journey based on ${commits.length} commits`,
          angle: "development-journey",
        },
      ];
    }

    return NextResponse.json({
      commits,
      readme,
      repo: { owner, repo: repoName },
      suggestions,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "내부 오류" },
      { status: 500 }
    );
  }
}
