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
      <body className="min-h-screen bg-bg text-text">
        {children}
      </body>
    </html>
  );
}
