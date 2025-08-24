"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const LinkItem = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      className={cn(
        "px-3 py-2 rounded-xl text-sm",
        pathname === href
          ? "bg-slate-900 text-white"
          : "text-slate-700 hover:bg-slate-200/60"
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <div className="font-semibold">GeoAI</div>
          <nav className="flex items-center gap-2">
            <LinkItem href="/analyze" label="Analyze" />
            <LinkItem href="/results" label="Results" />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
