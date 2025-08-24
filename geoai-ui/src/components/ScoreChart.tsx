"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function ScoreChart({
  scores,
}: {
  scores: { risk: number; demand: number; competition: number };
}) {
  const data = [
    { name: "Risk", value: scores.risk },
    { name: "Demand", value: scores.demand },
    { name: "Competition", value: scores.competition },
  ];
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
