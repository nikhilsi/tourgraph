// ============================================================
// Claude API Client — One-liner generation
// ============================================================

import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";
const MAX_ONE_LINER_LENGTH = 120;

const globalForClaude = globalThis as typeof globalThis & {
  __claudeClient?: Anthropic;
};

function getClient(): Anthropic {
  if (globalForClaude.__claudeClient) return globalForClaude.__claudeClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required");
  }
  globalForClaude.__claudeClient = new Anthropic({ apiKey });
  return globalForClaude.__claudeClient;
}

const SYSTEM_PROMPT = `You write witty, warm, one-line descriptions of tours and experiences.
Your tone is wonder-filled and playful — never snarky or mean.
The goal is to make someone smile and want to share this with a friend.
Keep it under ${MAX_ONE_LINER_LENGTH} characters. No hashtags, no emojis.`;

export async function generateOneLiner(tour: {
  title: string;
  destinationName: string;
  country: string;
  rating: number | null;
  reviewCount: number | null;
  fromPrice: number | null;
  durationMinutes: number | null;
  description: string | null;
}): Promise<string | null> {
  try {
    const duration = tour.durationMinutes
      ? `${Math.round(tour.durationMinutes / 60 * 10) / 10} hours`
      : "unknown";

    const userPrompt = `Tour: ${tour.title}
Location: ${tour.destinationName}, ${tour.country}
Rating: ${tour.rating ?? "N/A"} stars (${tour.reviewCount ?? 0} reviews)
Price: $${tour.fromPrice ?? "N/A"}
Duration: ${duration}
Description: ${(tour.description ?? "").slice(0, 200)}

Write one witty line about this tour.`;

    const response = await getClient().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 100,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : null;
    if (!text) return null;

    // Clean up: remove surrounding quotes if present
    let oneLiner = text.trim();
    if (
      (oneLiner.startsWith('"') && oneLiner.endsWith('"')) ||
      (oneLiner.startsWith("'") && oneLiner.endsWith("'"))
    ) {
      oneLiner = oneLiner.slice(1, -1);
    }

    if (oneLiner.length > MAX_ONE_LINER_LENGTH) {
      oneLiner = oneLiner.slice(0, MAX_ONE_LINER_LENGTH - 3) + "...";
    }

    return oneLiner;
  } catch (error) {
    console.error(`  ⚠ Claude API error for "${tour.title}":`, error);
    return null;
  }
}
