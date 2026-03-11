import Link from "next/link";
import type { Metadata } from "next";
import { getRandomChain, getTourDetail } from "@/lib/api";
import type { RouletteTour } from "@/lib/api";
import ShareButton from "@/components/ShareButton";
import FeatureNav from "@/components/FeatureNav";
import Logo from "@/components/Logo";
import ChainTimeline from "@/components/ChainTimeline";
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

export default async function SixDegreesGalleryPage() {
  const chain = await getRandomChain();

  if (!chain) {
    return (
      <main className="flex flex-col items-center min-h-screen py-8 px-4">
        <Logo className="mb-2" />
        <span className="text-xs font-medium tracking-widest uppercase text-accent mb-2">
          Six Degrees of Anywhere
        </span>
        <p className="text-text-dim text-sm mt-8">
          Chains are being generated. Check back soon.
        </p>
        <div className="mt-8">
          <FeatureNav current="six-degrees" />
        </div>
      </main>
    );
  }

  const tourIds = chain.chain.map((link) => link.tour_id).filter((id): id is number => id != null);
  const tourDetails = await Promise.all(tourIds.map((id) => getTourDetail(id)));
  const tourMap = new Map<number, RouletteTour>();
  for (const detail of tourDetails) {
    if (detail) tourMap.set(detail.id, detail);
  }
  const tourData = chain.chain.map((link) => link.tour_id ? tourMap.get(link.tour_id) : undefined);

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      <Logo className="mb-2" />

      <span className="text-xs font-medium tracking-widest uppercase text-accent mb-2">
        Six Degrees of Anywhere
      </span>

      <p className="text-sm text-text-muted text-center max-w-sm mb-8">
        Every city is connected through surprising thematic links.
      </p>

      {/* Chain header */}
      <div className="text-center mb-8 max-w-md">
        <h1 className="text-2xl font-bold">
          {chain.city_from} &rarr; {chain.city_to}
        </h1>
        <p className="text-sm italic text-text-muted mt-2 leading-snug">
          &ldquo;{chain.summary}&rdquo;
        </p>
      </div>

      {/* Timeline */}
      <ChainTimeline chain={chain.chain} tourData={tourData} />

      {/* Actions */}
      <div className="flex items-center gap-3 mt-8">
        <SurpriseMeButton />
        <ShareButton
          title={`${chain.city_from} to ${chain.city_to}`}
          oneLiner={chain.summary}
          url={`/six-degrees/${chain.slug}`}
        />
      </div>

      <div className="mt-8">
        <FeatureNav current="six-degrees" />
      </div>
    </main>
  );
}
