import ky from "ky";

const API = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});

export type FeasibilityResponse = {
  summary: string;
  pros: string[];
  cons: string[];
  scores: { risk: number; demand: number; competition: number };
};

export async function analyze(payload: any) {
  try {
    return await API.post("analyze", {
      json: payload,
    }).json<FeasibilityResponse>();
  } catch {
    // mock so the UI still works before backend is ready
    return {
      summary:
        "Dummy feasibility (mock): good demand near campus; watch competition.",
      pros: ["High student footfall (mock)", "Lower rent (mock)"],
      cons: ["Nearby competition (mock)", "Seasonal demand (mock)"],
      scores: { risk: 42, demand: 75, competition: 60 },
    };
  }
}

export type PredictionResponse = { prediction: string; confidence: number };

export async function predict(payload: any) {
  try {
    return await API.post("predict", {
      json: payload,
    }).json<PredictionResponse>();
  } catch {
    return { prediction: "Promising (mock)", confidence: 0.78 };
  }
}
