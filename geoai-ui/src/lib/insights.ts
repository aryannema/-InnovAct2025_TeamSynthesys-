export type Scores = { demand: number; risk: number; competition: number };

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

export function computeFeasibility(scores: Scores) {
  const demand = clamp(scores.demand);
  const safety = 100 - clamp(scores.risk);
  const openSpace = 100 - clamp(scores.competition);

  const score = Math.round(0.5 * demand + 0.3 * safety + 0.2 * openSpace);
  const cutoff = 65;
  return {
    score,
    feasible: score >= cutoff,
    cutoff,
    parts: { demand, safety, openSpace },
  };
}

// quick recommendation heuristic using your three scores
export function recommendBusinesses(scores: Scores) {
  const d = clamp(scores.demand);
  const r = clamp(scores.risk);
  const c = clamp(scores.competition);
  const space = 100 - c;
  const safety = 100 - r;

  // simple viability formula per category
  const cat = (name: string, wDemand = 0.55, wSafety = 0.25, wSpace = 0.2) => ({
    name,
    prob: Math.round(wDemand * d + wSafety * safety + wSpace * space),
  });

  const items = [
    cat("Cafe / Quick Bites", 0.58, 0.22, 0.2),
    cat("Gym / Fitness", 0.5, 0.3, 0.2),
    cat("Stationery / Print", 0.4, 0.35, 0.25),
    cat("Hostel Mess", 0.52, 0.28, 0.2),
  ]
    .map((x) => ({ ...x, prob: clamp(x.prob) }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 3);

  return items;
}

// demand vs supply bars (placeholder supply: inferred from competition)
export function buildGapSeries(scores: Scores) {
  const demand = clamp(scores.demand);
  const competition = clamp(scores.competition);
  const supplyFactor = 0.3 + 0.7 * (competition / 100); // 0.3..1.0
  const supply = Math.round(demand * supplyFactor);

  return [
    { label: "Food", demand, supply: Math.round(supply * 0.9) },
    { label: "Fitness", demand, supply: Math.round(supply * 0.8) },
    { label: "Services", demand, supply: Math.round(supply * 1.0) },
  ];
}

// simple 12-month trend based on demand baseline, risk drag and competition drag
export function buildTrendSeries(scores: Scores) {
  const d = clamp(scores.demand);
  const riskDrag = (scores.risk - 50) / 200; // -0.25..+0.25
  const compDrag = (scores.competition - 50) / 250; // -0.20..+0.20
  let level = d;
  return Array.from({ length: 12 }, (_, i) => {
    level = clamp(level + (0.6 - riskDrag - compDrag)); // slight upward with drags
    return { month: i + 1, demand: Math.round(level) };
  });
}

export function inferRiskFactors(scores: Scores) {
  const items: string[] = [];
  if (scores.risk >= 70)
    items.push("High operational risk (capital/seasonality).");
  if (scores.competition >= 70)
    items.push("Dense competition within the catchment.");
  if (scores.demand <= 40)
    items.push("Weak local demand; consider alternative spot.");
  if (items.length === 0) items.push("No major red flags detected.");
  return items;
}

// optional placeholders (replace later with real datasets)
export function mockDemographics() {
  return [
    { label: "Students", value: "High (campus-adjacent)" },
    { label: "Age 18–25", value: "45%" },
    { label: "Age 26–40", value: "32%" },
    { label: "Median Income", value: "₹28k/month (est.)" },
  ];
}

export function mockSpending() {
  return [
    { label: "Avg. Ticket Size", value: "₹180–₹250" },
    { label: "Monthly Spend / Person", value: "₹3.2k (est.)" },
  ];
}
