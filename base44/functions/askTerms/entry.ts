import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TERMS_URL = "https://pricing.pilatesinpinkstudio.com/terms";

// In-memory cache (per warm instance). Refresh hourly.
let cachedTerms = null;
let cachedAt = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function fetchTermsText() {
  const now = Date.now();
  if (cachedTerms && now - cachedAt < CACHE_TTL_MS) {
    return cachedTerms;
  }

  // Use Jina Reader to get JS-rendered markdown content of the terms page.
  // The Squarespace site is client-side rendered, so plain fetch returns an empty shell.
  const readerUrl = `https://r.jina.ai/${TERMS_URL}`;
  const res = await fetch(readerUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PilatesInPinkBot/1.0)",
      "Accept": "text/plain"
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch terms page via reader: ${res.status}`);
  }

  const text = (await res.text()).trim();

  if (text.length < 500) {
    throw new Error(`Terms content too short (${text.length} chars) — page may have failed to render.`);
  }

  cachedTerms = text;
  cachedAt = now;
  return text;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { question, history } = await req.json();
    if (!question || typeof question !== "string") {
      return Response.json({ error: "Missing 'question'" }, { status: 400 });
    }

    const termsText = await fetchTermsText();

    const prompt = `You are a knowledgeable, friendly assistant helping front-desk staff at "Pilates in Pink" studio quickly find and explain studio policies.

Your ONLY source of truth is the following Terms & Etiquette content (fetched live from ${TERMS_URL}):

=== TERMS CONTENT START ===
${termsText}
=== TERMS CONTENT END ===

RULES:
- Base your answer STRICTLY on the terms content above.
- Quote the exact relevant phrasing using a markdown blockquote when possible.
- Be concise and direct - front desk staff need quick answers while clients are waiting.
- If the answer isn't covered in the terms content, say plainly: "That isn't covered in our Terms page."
- Do NOT make up policies. Do NOT reference anything outside the terms content.
- Format with markdown: bold key terms, bullet lists where appropriate, blockquotes for direct citations.

Recent conversation:
${history || "(none)"}

Front-desk staff is asking: "${question}"

Answer their question now, citing the relevant section of the terms.

IMPORTANT: After your answer, add a line break, then "---", then on the next line include the exact markdown snippet or section heading from the terms that you quoted (e.g., "### Cancellation Policy" or "#### Value Memberships"). This is critical for source attribution.`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt });
    const fullAnswer = typeof response === "string" ? response : (response?.response || response?.text || "");
    
    // Extract markdown section from answer if present (format: "answer\n\n---\n\nsource markdown")
    const parts = fullAnswer.split(/\n\n---\n\n/);
    const answer = parts[0] || fullAnswer;
    const source_markdown = parts[1] || null;

    return Response.json({
      answer,
      source_markdown,
      cached: Date.now() - cachedAt < CACHE_TTL_MS,
      terms_length: termsText.length
    });
  } catch (error) {
    console.error("[askTerms] error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});