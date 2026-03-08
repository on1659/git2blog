export async function POST(request: Request) {
  try {
    const { suggestion, commits, readme, language } = await request.json();

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const commitSummary = (commits || [])
      .slice(0, 30)
      .map((c: { message: string; date: string }) => `- ${c.message} (${c.date})`)
      .join("\n");

    const langPrompt =
      language === "ko"
        ? `Write in Korean. Use casual tone (반말, ~다 체). No emojis. No bullet points or numbered lists.`
        : `Write in English. Casual tone, not academic. No emojis. No bullet points or numbered lists.`;

    const prompt = `You are a blog writer for a solo developer's AI build log.

${langPrompt}

Write a blog post about: ${suggestion.title_ko || suggestion.title_en}
Angle: ${suggestion.summary}

Based on these commits:
${commitSummary}

README excerpt:
${(readme || "").slice(0, 500)}

Rules:
- Start with a hook, no introductions
- 5000-8000 characters
- Include code blocks where relevant
- End with a blockquote (> quote)
- Sections with ## headings, at least 4 sections
- Each section should be 3-5 paragraphs with code
- No bullet points or numbered lists
- Include frontmatter: title, subtitle, slug, tags

Write the full blog post now.`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      return new Response(
        JSON.stringify({ error: `Claude API error: ${aiRes.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = aiRes.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === "content_block_delta") {
                    const text = parsed.delta?.text || "";
                    if (text) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ text })}\n\n`
                        )
                      );
                    }
                  }
                } catch {
                  // skip malformed
                }
              }
            }
          }
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e: unknown) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "내부 오류",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
