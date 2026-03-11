import Link from "next/link";

export default function ChainNotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-2xl font-bold mb-4">Chain Not Found</h1>
      <p className="text-text-muted mb-6">
        This chain doesn&apos;t exist or hasn&apos;t been generated yet.
      </p>
      <Link
        href="/six-degrees"
        className="py-3 px-6 rounded-xl bg-accent hover:bg-accent-hover text-black font-bold transition-colors"
      >
        Browse All Chains
      </Link>
    </main>
  );
}
