"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import ScoreChart from "@/components/ScoreChart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { predict } from "@/lib/api";
import { toast } from "sonner";

type Data = {
  summary: string;
  pros: string[];
  cons: string[];
  scores: { risk: number; demand: number; competition: number };
};

export default function ResultsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [pred, setPred] = useState<{ label: string; conf: number } | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("lastAnalysis");
    if (raw) setData(JSON.parse(raw));
  }, []);

  async function handlePredict() {
    try {
      setBusy(true);
      toast.loading("Getting prediction…", { id: "predict" });
      // Minimal payload for now — adjust when you wire the real model
      const res = await predict({
        project_type: "cafe",
        city: "Vellore",
        budget_lakh: 10,
        seating_capacity: 30,
      });
      setPred({ label: res.prediction, conf: res.confidence });
      toast.success("Prediction ready", { id: "predict" });
    } catch (e: any) {
      toast.error(e?.message || "Prediction failed", { id: "predict" });
    } finally {
      setBusy(false);
    }
  }

  function downloadJson() {
    if (!data) return;
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
      <Shell>
        <h1 className="text-2xl font-semibold">Results</h1>
        <p className="text-slate-600 mt-2">
          No results yet. Run an analysis first from the Analyze tab.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Results</h1>
            <p className="text-slate-600 mt-1">{data.summary}</p>
            {pred && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary">{pred.label}</Badge>
                <span className="text-sm text-slate-600">
                  confidence {(pred.conf * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={downloadJson} variant="outline">
              Export JSON
            </Button>
            <Button onClick={handlePredict} disabled={busy}>
              {busy ? "Predicting…" : "Get Prediction"}
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="rounded-2xl border p-4">
            <h4 className="font-medium mb-2">Pros</h4>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {(data.pros || []).map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </Card>
          <Card className="rounded-2xl border p-4">
            <h4 className="font-medium mb-2">Cons</h4>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {(data.cons || []).map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="rounded-2xl border p-4">
          <h4 className="font-medium mb-3">Scores</h4>
          <ScoreChart scores={data.scores} />
        </Card>
      </div>
    </Shell>
  );
}
