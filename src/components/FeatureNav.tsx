import Link from "next/link";

// Update hrefs as each feature ships. Six Degrees = Phase 4 (not yet built).
const features = [
  { name: "roulette", href: "/", label: "roulette" },
  { name: "right-now", href: "/right-now", label: "right now" },
  { name: "worlds-most", href: "/worlds-most", label: "world's most" },
  { name: "six-degrees", href: "/", label: "six degrees" },
  { name: "about", href: "/about", label: "about" },
  { name: "story", href: "/story", label: "story" },
];

export default function FeatureNav({ current }: { current: string }) {
  return (
    <nav className="flex items-center justify-center gap-2 text-sm text-text-dim">
      {features.map((f, i) => (
        <span key={f.name}>
          {i > 0 && <span className="mx-1">&middot;</span>}
          {f.name === current ? (
            <span className="text-text-muted font-medium">{f.label}</span>
          ) : (
            <Link
              href={f.href}
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
