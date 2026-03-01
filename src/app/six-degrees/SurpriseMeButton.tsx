"use client";

import { useRouter } from "next/navigation";

export default function SurpriseMeButton({ slugs }: { slugs: string[] }) {
  const router = useRouter();

  function handleClick() {
    const random = slugs[Math.floor(Math.random() * slugs.length)];
    router.push(`/six-degrees/${random}`);
  }

  return (
    <button
      onClick={handleClick}
      className="py-3 px-8 rounded-xl bg-accent hover:bg-accent-hover text-black font-bold transition-colors"
    >
      Surprise Me
    </button>
  );
}
