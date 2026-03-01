import Link from "next/link";
import type { Metadata } from "next";
import FeatureNav from "@/components/FeatureNav";

export const metadata: Metadata = {
  title: "The Story — TourGraph",
  description:
    "How TourGraph went from a competitive analysis that said 'kill the project' to a site that makes people smile.",
  openGraph: {
    title: "The TourGraph Story",
    description:
      "From 'kill the project' to 'I just lost an hour on this weird tour website.'",
  },
};

export default function StoryPage() {
  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      <Link
        href="/"
        className="text-2xl font-bold tracking-tight mb-8 hover:text-accent transition-colors"
      >
        TourGraph
      </Link>

      <article className="w-full max-w-lg space-y-8 pb-8">
        <h1 className="text-3xl font-bold">The Story</h1>

        {/* Chapter 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-accent">
            The Original Idea
          </h2>
          <p className="text-sm text-text-muted leading-relaxed">
            TourGraph started in early 2026 as supply-side infrastructure for
            the tours and experiences industry. The thesis: tour operators are
            invisible to AI agents. Nobody is building the pipes to make
            300,000+ tour experiences queryable by ChatGPT, Claude, or
            Perplexity. I&apos;d build an extraction pipeline, structure the
            data, and serve it via an MCP server.
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            The tech worked. I built an AI extraction pipeline using Claude that
            pulled structured data from operator websites with 95% accuracy.
            Integrated the Viator Partner API. Had 83 products from 7 Seattle
            operators with full scorecards. The domain was bought. The API key
            was live.
          </p>
        </section>

        {/* Chapter 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-accent">
            The Competitive Analysis That Said &ldquo;Kill It&rdquo;
          </h2>
          <p className="text-sm text-text-muted leading-relaxed">
            Then I did what every builder should do before going deeper: a
            proper competitive analysis. The findings were brutal. Peek had
            already launched a live MCP server with 300,000+ experiences.
            TourRadar shipped theirs covering 50,000 tours. Expedia published
            an MCP server on GitHub. Magpie Travel was building operator-side
            MCP infrastructure.
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            The claim &ldquo;nobody is building this&rdquo; was perhaps true
            in mid-2025. By February 2026, four companies were actively
            shipping. The window had closed.
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            The honest conclusion of my own competitive analysis: &ldquo;pivot
            or kill, but don&apos;t double down.&rdquo;
          </p>
        </section>

        {/* Chapter 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-accent">The Pivot</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            I had $200 invested. A working Viator API integration. A domain.
            And a dataset of tour experiences that was genuinely fun to browse.
            While testing the extraction pipeline, I kept getting distracted by
            the tours themselves — a midnight kayaking trip through
            bioluminescent bays in Puerto Rico, a 4-day Inca Trail trek, fairy
            hunting in Iceland with a certified elf spotter.
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            The question shifted: what if the product isn&apos;t infrastructure
            for AI agents, but something that makes humans smile? Not a booking
            engine. Not a travel planner. Not a recommendation engine. Just a
            place you visit because the world is weird, beautiful, and
            surprising — and someone should be showing you that.
          </p>
        </section>

        {/* Chapter 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-accent">
            What Emerged
          </h2>
          <p className="text-sm text-text-muted leading-relaxed">
            TourGraph became a consumer site built around four ideas: zero
            friction (no signup, no tracking), instant smiles (warm and
            witty, never cynical), effortlessly shareable (every tour has a
            beautiful link preview), and rabbit hole energy (that
            &ldquo;one more click&rdquo; quality through genuine curiosity).
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            Tour Roulette gives you a random tour with one button press.
            Right Now Somewhere shows you what&apos;s happening where it&apos;s
            golden hour. The World&apos;s Most ___ surfaces daily superlatives.
            Six Degrees of Anywhere connects any two cities through a chain of
            tours with surprising thematic links.
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            The name finally earned itself — not as a supply-side data graph,
            but as a web of surprising connections between places, experiences,
            and cultures.
          </p>
        </section>

        {/* Chapter 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-accent">
            How It&apos;s Built
          </h2>
          <p className="text-sm text-text-muted leading-relaxed">
            Next.js with React Server Components. SQLite as a pre-built local
            index (no API calls at page load — sub-50ms queries). Viator
            Partner API for 300,000+ experiences. Claude for AI-generated
            one-liners and thematic chain connections. TypeScript throughout.
            Dark mode because photos pop.
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            The entire stack is deliberately simple. No user database. No
            authentication. No analytics beyond what&apos;s needed. The
            complexity budget goes toward one thing: making the content
            delightful.
          </p>
        </section>

        {/* Chapter 6 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-accent">
            The Success Metric
          </h2>
          <p className="text-sm text-text-muted leading-relaxed">
            TourGraph doesn&apos;t have KPIs. The success metric is vibes:
            friends texting each other links, someone at a dinner party saying
            &ldquo;have you seen this site?&rdquo;, a Reddit post titled
            &ldquo;I just lost an hour on this weird tour website.&rdquo; And
            honestly — the builder having fun building it.
          </p>
        </section>

        {/* CTA */}
        <section className="pt-4 border-t border-text-dim/20">
          <p className="text-sm text-text-muted">
            Built by{" "}
            <a
              href="https://www.linkedin.com/in/nikhilsinghal/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Nikhil Singhal
            </a>{" "}
            in Seattle. 25+ years building products at Expedia, Microsoft,
            T-Mobile, and startups.{" "}
            <a
              href="https://github.com/nikhilsi/tourgraph"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Source on GitHub
            </a>
            .
          </p>
        </section>

        <div className="pt-4">
          <FeatureNav current="story" />
        </div>
      </article>
    </main>
  );
}
