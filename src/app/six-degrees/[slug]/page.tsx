import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getChainBySlug, getToursByIds } from "@/lib/db";
import ShareButton from "@/components/ShareButton";
import FeatureNav from "@/components/FeatureNav";
import Logo from "@/components/Logo";
import ChainTimeline from "@/components/ChainTimeline";

interface Props {
  params: Promise<{ slug: string }>;
}

const getCachedChain = cache((slug: string) => getChainBySlug(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const chain = getCachedChain(slug);
  if (!chain) return { title: "Chain Not Found" };

  const description = chain.summary;
  const title = `${chain.city_from} to ${chain.city_to} — Six Degrees`;
  const ogImage = `/api/og/six-degrees/${slug}`;

  return {
    title: `${title} — TourGraph`,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ChainDetailPage({ params }: Props) {
  const { slug } = await params;
  const chain = getCachedChain(slug);
  if (!chain) notFound();

  // Look up tour data for each stop (single batch query)
  const tourIds = chain.chain.map((link) => link.tour_id).filter((id): id is number => id != null);
  const tourMap = getToursByIds(tourIds);
  const tourData = chain.chain.map((link) => link.tour_id ? tourMap.get(link.tour_id) : undefined);

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      {/* Brand */}
      <Logo className="mb-2" />

      <Link
        href="/six-degrees"
        className="text-xs font-medium tracking-widest uppercase text-accent mb-4 hover:underline"
      >
        Six Degrees of Anywhere
      </Link>

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
      <div className="flex flex-col items-center gap-3 mt-8">
        <div className="flex items-center gap-3">
          <Link
            href="/six-degrees"
            className="py-3 px-6 rounded-xl border border-accent text-accent hover:bg-accent hover:text-black font-bold transition-colors"
          >
            Explore Another
          </Link>
          <ShareButton
            tourId={chain.id}
            title={`${chain.city_from} to ${chain.city_to}`}
            oneLiner={chain.summary}
          />
        </div>
        <Link
          href="/"
          title="Discover a random tour from anywhere in the world"
          className="text-sm text-text-muted hover:text-accent transition-colors"
        >
          Spin Your Own &rarr;
        </Link>
      </div>

      <div className="mt-8">
        <FeatureNav current="six-degrees" />
      </div>
    </main>
  );
}
