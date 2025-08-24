"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ScenarioForm, { ScenarioValues } from "@/components/ScenarioForm";
import { analyze } from "@/lib/api";

export default function AnalyzePage() {
  const router = useRouter();

  async function handleSubmit(v: ScenarioValues) {
    try {
      toast.loading("Analyzing scenario…", { id: "analyze" });

      const res = await analyze({
        project_type: v.projectType,
        city: v.city,
        address: v.address,
        lat: v.lat,
        lon: v.lon,
        radius_m: v.radiusM,
        budget_lakh: v.budgetInLakh,
        seating_capacity: v.seatingCapacity,
        open_hours: v.openHours,
        use_population_density: v.usePopulationDensity,
        consider_competition: v.considerCompetition,
        notes: v.notes,
      });

      localStorage.setItem("lastAnalysis", JSON.stringify(res));
      localStorage.setItem(
        "lastForm",
        JSON.stringify({
          project_type: v.projectType,
          city: v.city,
          budget_lakh: v.budgetInLakh,
          seating_capacity: v.seatingCapacity,
          radius_m: v.radiusM,
          lat: v.lat,
          lon: v.lon,
        })
      );

      toast.success("Analysis complete", { id: "analyze" });
      router.push("/results");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Analysis failed", { id: "analyze" });
    }
  }

  return (
    <main className="min-h-dvh bg-bg text-white relative">
      {/* same background glow used on the home page */}
      <div className="bg-aurora" />

      <div className="mx-auto max-w-5xl px-4 py-12">
        <header className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Feasibility{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 via-primary-400 to-primary-200">
              Analysis
            </span>
          </h1>
          {/* subheading made visible on dark background */}
          <p className="mt-2 text-white/70">
            Fill the details; we’ll estimate demand, risk, and competition for
            your idea.
          </p>
        </header>

        {/* glassy panel to host the light form fields */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 sm:p-6">
          <ScenarioForm
            submitLabel="Analyze Feasibility"
            onSubmit={handleSubmit}
          />
        </section>
      </div>
    </main>
  );
}
