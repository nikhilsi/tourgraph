"use client";

import { useState } from "react";

export default function ShareButton({
  tourId,
  title,
  oneLiner,
}: {
  tourId: number;
  title: string;
  oneLiner: string;
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/roulette/${tourId}`
      : `/roulette/${tourId}`;

  const shareText = oneLiner ? `${title} — "${oneLiner}"` : title;

  async function handleShare() {
    // Try native Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `TourGraph: ${title}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or API failed — fall through to clipboard
      }
    }

    // Desktop fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API failed — nothing we can do
    }
  }

  return (
    <button
      onClick={handleShare}
      title="Share this with a friend"
      className="text-sm text-text-muted hover:text-text transition-colors px-3 py-1.5 rounded-lg border border-text-dim/30 hover:border-text-dim/60"
    >
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
