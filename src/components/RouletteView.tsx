"use client";

import { useState, useEffect, useCallback } from "react";
import type { RouletteTour } from "@/lib/types";
import TourCard from "./TourCard";
import TourCardSkeleton from "./TourCardSkeleton";

export default function RouletteView() {
  const [hand, setHand] = useState<RouletteTour[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [seenIds, setSeenIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHand = useCallback(
    async (exclude: number[] = []) => {
      setLoading(true);
      setError(null);
      try {
        const params = exclude.length
          ? `?exclude=${exclude.join(",")}`
          : "";
        const res = await fetch(`/api/roulette/hand${params}`);
        if (!res.ok) throw new Error("Failed to fetch tours");
        const data = await res.json();
        if (data.hand.length === 0) {
          setError("No tours available yet. Check back soon!");
          return;
        }
        setHand(data.hand);
        setCurrentIndex(0);
      } catch {
        setError("Something went wrong. Try again?");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial fetch
  useEffect(() => {
    fetchHand();
  }, [fetchHand]);

  function handleSpin() {
    if (hand.length === 0) return;

    const currentTour = hand[currentIndex];
    const newSeenIds = [...seenIds, currentTour.id];
    setSeenIds(newSeenIds);

    const nextIndex = currentIndex + 1;
    if (nextIndex < hand.length) {
      // Still have cards in hand
      setCurrentIndex(nextIndex);
    } else {
      // Hand exhausted — fetch a new one
      fetchHand(newSeenIds);
    }
  }

  const currentTour = hand[currentIndex];

  return (
    <div className="flex flex-col items-center gap-6 w-full px-4">
      {/* Tour Card */}
      <div className="w-full max-w-md min-h-[400px]">
        {loading ? (
          <TourCardSkeleton />
        ) : error ? (
          <div className="w-full max-w-md mx-auto rounded-2xl bg-surface p-8 text-center">
            <p className="text-text-muted mb-4">{error}</p>
            <button
              onClick={() => fetchHand()}
              className="text-accent hover:text-accent-hover transition-colors"
            >
              Try again
            </button>
          </div>
        ) : currentTour ? (
          <TourCard tour={currentTour} />
        ) : null}
      </div>

      {/* Spin Button */}
      {!loading && !error && (
        <button
          onClick={handleSpin}
          className="w-full max-w-md py-4 px-8 rounded-xl bg-accent hover:bg-accent-hover text-black font-bold text-lg transition-colors active:scale-[0.98]"
        >
          Show Me Another
        </button>
      )}
    </div>
  );
}
