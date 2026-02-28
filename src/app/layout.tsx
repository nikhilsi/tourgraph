import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TourGraph — Discover the World's Most Surprising Tours",
  description:
    "One button. Random tour. The weirdest, most wonderful experiences on Earth.",
  metadataBase: new URL("https://tourgraph.ai"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-text flex flex-col">
        <div className="flex-1">{children}</div>
        {/* H13: Viator attribution */}
        <footer className="text-center text-xs text-text-dim py-4">
          Tour data powered by{" "}
          <a
            href="https://www.viator.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-text-muted transition-colors"
          >
            Viator
          </a>
        </footer>
      </body>
    </html>
  );
}
