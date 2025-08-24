"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import ScoreChart from "@/components/ScoreChart";
import { predict } from "@/lib/api";

import {
  computeFeasibility,
  recommendBusinesses,
  buildGapSeries,
  buildTrendSeries,
  inferRiskFactors,
  mockDemographics,
  mockSpending,
} from "@/lib/insights";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

// Load Leaflet map only on the client to avoid SSR issues
const MapPreview = dynamic(() => import("@/components/MapPreview"), {
  ssr: false,
});

type Scores = { risk: number; demand: number; competition: number };

type Analysis = {
  summary: string;
  pros: string[];
  cons: string[];
  scores: Scores;
};

type LastForm = {
  project_type: string;
  city: string;
  budget_lakh: number;
  seating_capacity: number;
  radius_m: number;
  lat?: number;
  lon?: number;
};

export default function ResultsPage() {
  const [data, setData] = useState<Analysis | null>(null);
  const [form, setForm] = useState<LastForm | null>(null);
  const [pred, setPred] = useState<{ label: string; conf: number } | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const a = localStorage.getItem("lastAnalysis");
      const f = localStorage.getItem("lastForm");
      if (a) setData(JSON.parse(a) as Analysis);
      if (f) setForm(JSON.parse(f) as LastForm);
    } catch {
      // ignore JSON parse errors
    }
  }, []);

  async function handlePredict() {
    if (!data || !form) {
      toast.error("No analysis to predict from. Run Analyze first.");
      return;
    }
    try {
      setBusy(true);
      toast.loading("Getting prediction…", { id: "predict" });
      const res = await predict({
        project_type: form.project_type,
        city: form.city,
        budget_lakh: form.budget_lakh,
        seating_capacity: form.seating_capacity,
        radius_m: form.radius_m,
        demand_score: data.scores?.demand ?? 60,
        lat: form.lat,
        lon: form.lon,
      });
      setPred({ label: res.prediction, conf: res.confidence });
      toast.success("Prediction ready", { id: "predict" });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Prediction failed", { id: "predict" });
    } finally {
      setBusy(false);
    }
  }

  function downloadJson() {
    if (!data) {
      toast.error("Nothing to export yet.");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analysis.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!data) {
    return (
      <main className="min-h-dvh bg-bg text-white relative">
        <div className="bg-aurora" />
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Results
          </h1>
          <p className="mt-2 text-white/70">
            No results yet. Please go to{" "}
            <a className="underline" href="/analyze">
              Analyze
            </a>{" "}
            and run a scenario.
          </p>
        </div>
      </main>
    );
  }

  // Derived insights from current scores
  const fe = computeFeasibility(data.scores);
  const recs = recommendBusinesses(data.scores);
  const gap = buildGapSeries(data.scores);
  const trend = buildTrendSeries(data.scores);
  const risks = inferRiskFactors(data.scores);
  const demo = mockDemographics();
  const spending = mockSpending();

  return (
    <main className="min-h-dvh bg-bg text-white relative">
      {/* same purple glow background as home/analyze */}
      <div className="bg-aurora" />

      <div className="mx-auto max-w-5xl px-4 py-12 space-y-6">
        {/* Header + actions */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Results
            </h1>
            <p className="mt-2 text-white/70">{data.summary}</p>

            {pred && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="inline-flex items-center rounded-md px-2 py-1 bg-white/10 border border-white/10">
                  {pred.label}
                </span>
                <span className="text-white/70">
                  confidence {(pred.conf * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={downloadJson}
              className="px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10"
            >
              Export JSON
            </button>
            <button
              onClick={handlePredict}
              disabled={busy || !form}
              className="px-4 py-2 rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 shadow-glow disabled:opacity-50"
            >
              {busy ? "Predicting…" : "Get Prediction"}
            </button>
          </div>
        </div>

        {/* How to read + Feasibility score */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h4 className="font-medium mb-2">How to read the scores</h4>
              <ul className="list-disc pl-5 text-sm text-white/80 space-y-1">
                <li>
                  <strong>Demand</strong> (higher is better): potential
                  customers around your point.
                </li>
                <li>
                  <strong>Risk</strong> (lower is better):
                  seasonality/operational uncertainty.
                </li>
                <li>
                  <strong>Competition</strong> (lower is better): saturation of
                  similar businesses.
                </li>
              </ul>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/70">
                Business Feasibility Score
              </div>
              <div
                className={`text-3xl font-bold ${
                  fe.feasible ? "text-primary-300" : "text-red-300"
                }`}
              >
                {fe.score}%
              </div>
              <div className="text-xs text-white/60">
                {fe.feasible ? "Feasible" : "Not Feasible"} (cutoff {fe.cutoff}
                %)
              </div>
            </div>
          </div>
        </section>

        {/* Pros / Cons in glass cards */}
        <section className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
            <h4 className="font-medium mb-2">Pros</h4>
            <ul className="list-disc pl-5 text-sm space-y-1 text-white/90">
              {(data.pros || []).map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
            <h4 className="font-medium mb-2">Cons</h4>
            <ul className="list-disc pl-5 text-sm space-y-1 text-white/90">
              {(data.cons || []).map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Map (only if we have coordinates) */}
        {form?.lat != null && form?.lon != null && (
          <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
            <h4 className="font-medium mb-3">Competition Map</h4>
            <div className="text-sm text-white/70 mb-3">
              Lat {form.lat.toFixed(5)}, Lon {form.lon.toFixed(5)} — Radius{" "}
              {form.radius_m} m
            </div>
            <MapPreview lat={form.lat} lon={form.lon} radiusM={form.radius_m} />
            <p className="mt-2 text-xs text-white/60">
              Pins will show existing businesses once POI data is connected.
            </p>
          </section>
        )}

        {/* Scores (existing chart) */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
          <h4 className="font-medium mb-3">Scores</h4>
          <ScoreChart scores={data.scores} />
        </section>

        {/* Recommended businesses */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
          <h4 className="font-medium mb-3">Top Recommended Businesses</h4>
          <ul className="space-y-2">
            {recs.map((r, i) => (
              <li key={r.name} className="flex items-center gap-3">
                <span className="text-white/70 w-6 text-right">{i + 1}.</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-white/70 text-sm">{r.prob}%</div>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded">
                    <div
                      className="h-2 rounded bg-gradient-to-r from-primary-500 to-primary-700"
                      style={{ width: `${r.prob}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Demand–Supply Gap */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
          <h4 className="font-medium mb-3">Demand–Supply Gap</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gap}>
                <CartesianGrid
                  stroke="rgba(255,255,255,0.08)"
                  vertical={false}
                />
                <XAxis dataKey="label" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip />
                <Bar dataKey="demand" stackId="a" fill="#a855f7" />
                <Bar dataKey="supply" stackId="a" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-white/60">
            Gap = demand − supply (supply inferred from competition until POIs
            are wired).
          </p>
        </section>

        {/* Trend Forecast */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
          <h4 className="font-medium mb-3">Trend Forecast (12 months)</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="month" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="demand"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-white/60">
            Simple projection from current demand with risk/competition drags.
            Replace with a real time-series later.
          </p>
        </section>

        {/* Demographics & Spending */}
        <section className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
            <h4 className="font-medium mb-3">Demographic Profile</h4>
            <ul className="text-sm text-white/90 space-y-1">
              {demo.map((d) => (
                <li key={d.label} className="flex justify-between">
                  <span className="text-white/70">{d.label}</span>
                  <span>{d.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
            <h4 className="font-medium mb-3">Spending Behavior</h4>
            <ul className="text-sm text-white/90 space-y-1">
              {spending.map((s) => (
                <li key={s.label} className="flex justify-between">
                  <span className="text-white/70">{s.label}</span>
                  <span>{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Risk Factors */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
          <h4 className="font-medium mb-3">Risk Factors</h4>
          <ul className="list-disc pl-5 text-sm text-white/90 space-y-1">
            {risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
