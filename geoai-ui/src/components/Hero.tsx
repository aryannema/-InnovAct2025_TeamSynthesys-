"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* background glows */}
      <div className="bg-aurora" />

      <div className="mx-auto max-w-6xl px-4 pt-20 pb-24 text-center">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-tight tracking-tight">
          Empowering{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 via-primary-400 to-primary-200 drop-shadow-[0_0_25px_rgba(148,56,245,0.35)]">
            Startups.
          </span>
        </h1>

        <p className="mt-6 text-lg text-white/70 max-w-3xl mx-auto">
          A hub to find, curate, and employ AI agents. Hire custom AI workforces
          to supercharge productivity and revolutionize how you create value.
          This is the future of work.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/analyze"
            className="btn-pill inline-flex items-center gap-2 rounded-2xl px-5 py-3
                       bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700
                       shadow-glow"
          >
            <span className="font-medium">Join Waitlist</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="https://discord.com"
            className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 border border-white/15
                       bg-white/5 hover:bg-white/10"
          >
            <span className="font-medium">Join Community</span>
          </Link>
        </div>

        {/* little decorative dots */}
        <div className="relative mx-auto mt-12 h-1 w-[min(640px,90%)] bg-white/10 rounded-full">
          <div className="absolute -top-1 left-0 h-3 w-3 rounded-full bg-primary-400 shadow-glow" />
          <div className="absolute -top-1 right-0 h-3 w-3 rounded-full bg-white/30" />
        </div>
      </div>

      {/* bottom wave-ish mask so the hero fades into the page */}
      <div className="wave-mask pointer-events-none h-24 w-full bg-hero-grad" />
    </section>
  );
}
