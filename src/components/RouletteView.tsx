"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { RouletteTour } from "@/lib/types";
import TourCard from "./TourCard";
import TourCardSkeleton from "./TourCardSkeleton";

const MAX_SEEN_IDS = 200; // C2: Prevent URL length bomb + SQLite variable limit

export default function RouletteView() {
  const [hand, setHand] = useState<RouletteTour[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [seenIds, setSeenIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null); // H11

  const fetchHand = useCallback(
    async (exclude: number[] = []) => {
      // H11: Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const params = exclude.length
          ? `?exclude=${exclude.join(",")}`
          : "";
        const res = await fetch(`/api/roulette/hand${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch tours");
        const data = await res.json();

        // M5: Validate response shape before accessing
        if (!data.hand || !Array.isArray(data.hand) || data.hand.length === 0) {
          setError("No tours available yet. Check back soon!");
          return;
        }
        setHand(data.hand);
        setCurrentIndex(0);
      } catch (e) {
        // H11: Don't set error state if we aborted intentionally
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.error("Roulette hand fetch failed:", e);
        setError("Something went wrong. Try again?");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial fetch + cleanup on unmount
  useEffect(() => {
    fetchHand();
    return () => abortRef.current?.abort(); // H11: cleanup
  }, [fetchHand]);

  function handleSpin() {
    // Guard against rapid clicks during fetch
    if (loading || hand.length === 0) return;

    const currentTour = hand[currentIndex];
    // C2: Cap seenIds to prevent unbounded growth
    const newSeenIds = [...seenIds, currentTour.id].slice(-MAX_SEEN_IDS);
    setSeenIds(newSeenIds);

    const nextIndex = currentIndex + 1;
    if (nextIndex < hand.length) {
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
