import Link from "next/link";

export default function TourNotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen py-8 px-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Tour Not Found</h1>
      <p className="text-text-muted mb-8">
        This tour may have been removed or the link is incorrect.
      </p>
      <Link
        href="/"
        className="py-3 px-8 rounded-xl bg-accent hover:bg-accent-hover text-black font-bold transition-colors"
      >
        Spin a New One
      </Link>
    </main>
  );
}
