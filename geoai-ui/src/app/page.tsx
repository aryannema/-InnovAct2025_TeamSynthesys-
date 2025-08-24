import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-bg text-white">
      <Navbar />
      <Hero />

      {/* Below hero you can keep your existing sections or link into the app */}
      <section
        id="about"
        className="mx-auto max-w-6xl px-4 py-16 text-white/80"
      >
        <h2 className="text-xl font-semibold mb-3">About</h2>
        <p>
          GeoAI UI is a feasibility and prediction tool that helps you evaluate
          locations and concepts using lightweight ML and geospatial signals.
          Continue to the Analyze flow to try it.
        </p>
      </section>
    </main>
  );
}
