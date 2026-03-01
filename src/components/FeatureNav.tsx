import Link from "next/link";

const features = [
  { name: "roulette", href: "/", label: "roulette", tip: "Random tours from around the world" },
  { name: "right-now", href: "/right-now", label: "right now", tip: "Tours happening in golden-hour cities" },
  { name: "worlds-most", href: "/worlds-most", label: "world's most", tip: "Daily superlatives from 300K+ tours" },
  { name: "six-degrees", href: "/six-degrees", label: "six degrees", tip: "Cities connected through thematic links" },
  { name: "about", href: "/about", label: "about", tip: "About TourGraph" },
  { name: "story", href: "/story", label: "story", tip: "How TourGraph came to be" },
];

export default function FeatureNav({ current }: { current: string }) {
  return (
    <nav className="flex items-center justify-center gap-2 text-sm text-text-dim">
      {features.map((f, i) => (
        <span key={f.name}>
          {i > 0 && <span className="mx-1">&middot;</span>}
          {f.name === current ? (
            <span className="text-text-muted font-medium" title={f.tip}>{f.label}</span>
          ) : (
            <Link
              href={f.href}
              title={f.tip}
              className="hover:text-text-muted transition-colors"
            >
              {f.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
