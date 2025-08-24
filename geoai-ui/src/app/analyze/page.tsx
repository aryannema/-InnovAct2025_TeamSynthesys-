"use client";
import Shell from "@/components/Shell";
import ScenarioForm, { ScenarioValues } from "@/components/ScenarioForm";
import { analyze } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function AnalyzePage() {
  const router = useRouter();
  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Feasibility Analysis
          </h1>
          <p className="text-slate-600 mt-1">
            Fill the scenario; we’ll call the backend and show results.
          </p>
        </div>
        <ScenarioForm
          submitLabel="Analyze Feasibility"
          onSubmit={async (v: ScenarioValues) => {
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
            router.push("/results");
          }}
        />
      </div>
    </Shell>
  );
}
