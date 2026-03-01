import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Superlative Not Found</h1>
      <p className="text-text-muted mb-6">
        We couldn&apos;t find that superlative. It may not exist yet.
      </p>
      <Link
        href="/worlds-most"
        className="py-3 px-6 rounded-xl bg-accent hover:bg-accent-hover text-black font-bold transition-colors"
      >
        See All Superlatives
      </Link>
    </main>
  );
}
