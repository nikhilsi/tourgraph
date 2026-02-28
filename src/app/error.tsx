"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
      <p className="text-text-muted mb-6">
        We hit a bump. Give it another try?
      </p>
      <button
        onClick={reset}
        className="py-3 px-8 rounded-xl bg-accent hover:bg-accent-hover text-black font-bold transition-colors"
      >
        Try again
      </button>
    </main>
  );
}
