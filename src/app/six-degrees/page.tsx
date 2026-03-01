import Link from "next/link";
import type { Metadata } from "next";
import { getAllChains } from "@/lib/db";
import FeatureNav from "@/components/FeatureNav";
import SurpriseMeButton from "./SurpriseMeButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Six Degrees of Anywhere — TourGraph",
  description:
    "Every city is connected. Find the surprising thematic links between tours around the world.",
  openGraph: {
    title: "Six Degrees of Anywhere",
    description:
      "Every city is connected. Find the surprising thematic links between tours around the world.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Six Degrees of Anywhere",
    description:
      "Every city is connected. Find the surprising links.",
  },
};

export default function SixDegreesGalleryPage() {
  const chains = getAllChains();

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      <Link
        href="/"
        className="text-2xl font-bold tracking-tight mb-2 hover:text-accent transition-colors"
      >
        TourGraph
      </Link>

      <span className="text-xs font-medium tracking-widest uppercase text-accent mb-2">
        Six Degrees of Anywhere
      </span>

      <p className="text-sm text-text-muted text-center max-w-sm mb-8">
        Every city is connected through surprising thematic links.
        Pick a chain and follow the thread.
      </p>

      {chains.length === 0 ? (
        <p className="text-text-dim text-sm">
          Chains are being generated. Check back soon.
        </p>
      ) : (
        <>
          <div className="w-full max-w-md space-y-4 mb-8">
            {chains.map((chain) => {
              const themes = chain.chain
                .slice(0, -1)
                .map((link) => link.theme)
                .join(" · ");

              return (
                <Link
                  key={chain.id}
                  href={`/six-degrees/${chain.slug}`}
                  className="block rounded-2xl bg-surface p-5 hover:bg-surface-hover transition-colors"
                >
                  <h2 className="text-lg font-bold">
                    {chain.city_from} &rarr; {chain.city_to}
                  </h2>
                  <p className="text-sm italic text-text-muted mt-1 leading-snug">
                    &ldquo;{chain.summary}&rdquo;
                  </p>
                  <p className="text-xs text-text-dim mt-2">
                    Connected by: {themes}
                  </p>
                  <p className="text-xs text-text-dim mt-1">
                    {chain.chain.length} stops
                  </p>
                </Link>
              );
            })}
          </div>

          <SurpriseMeButton
            slugs={chains.map((c) => c.slug)}
          />
        </>
      )}

      <div className="mt-8">
        <FeatureNav current="six-degrees" />
      </div>
    </main>
  );
}
