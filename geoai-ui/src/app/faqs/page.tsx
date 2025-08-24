export const metadata = { title: "FAQs" };

export default function FAQsPage() {
  return (
    <main className="min-h-dvh bg-bg text-white relative">
      <div className="bg-aurora" />
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-8">
        <header>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            FAQs
          </h1>
          <p className="mt-2 text-white/70">
            Quick answers to common questions.
          </p>
        </header>

        <div className="space-y-4">
          {[
            {
              q: "How do you compute Demand, Risk, and Competition?",
              a: "Demand uses population density (GeoTIFF) near the chosen location; Risk and Competition are derived heuristics and can be augmented with POI data.",
            },
            {
              q: "What is the Business Feasibility Score (BFS)?",
              a: "BFS is a 0–100 composite: 50% Demand + 30% (100−Risk) + 20% (100−Competition). Feasible if BFS ≥ 65.",
            },
            {
              q: "Can I use my own datasets?",
              a: "Yes. Replace the raster path for population, add POI data via Overpass/Google/Foursquare, and retrain the model with your labels.",
            },
            {
              q: "Does it work outside Vellore?",
              a: "Yes. Provide lat/lon and a raster covering the area. POI sources are global.",
            },
          ].map((item, i) => (
            <details
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5"
            >
              <summary className="cursor-pointer font-medium">{item.q}</summary>
              <p className="mt-2 text-white/80">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}
