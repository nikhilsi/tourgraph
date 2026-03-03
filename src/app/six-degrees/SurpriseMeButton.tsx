"use client";

import { useRouter } from "next/navigation";

export default function SurpriseMeButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.refresh()}
      className="py-3 px-8 rounded-xl bg-accent hover:bg-accent-hover text-black font-bold transition-colors"
    >
      Surprise Me
    </button>
  );
}
