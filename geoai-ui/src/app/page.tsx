import Link from "next/link";
import Shell from "@/components/Shell";

export default function Home() {
  return (
    <Shell>
      <div className="text-center py-24">
        <h1 className="text-3xl font-semibold">GeoAI Feasibility Studio</h1>
        <p className="text-slate-600 mt-2">Run a scenario and view results.</p>
        <Link
          className="inline-flex mt-5 px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
          href="/analyze"
        >
          Start Analysis →
        </Link>
      </div>
    </Shell>
  );
}
