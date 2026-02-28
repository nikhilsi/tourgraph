import RouletteView from "@/components/RouletteView";
import FeatureNav from "@/components/FeatureNav";

export default function Home() {
  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      {/* Brand */}
      <h1 className="text-2xl font-bold tracking-tight mb-8">TourGraph</h1>

      {/* Roulette */}
      <RouletteView />

      {/* Feature Nav */}
      <div className="mt-8 mb-4">
        <FeatureNav current="roulette" />
      </div>
    </main>
  );
}
