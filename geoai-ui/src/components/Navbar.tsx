"use client";

import Link from "next/link";
import Image from "next/image";
import { Youtube, Twitter, MessageSquare, FileText } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-bg/60">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo-sythesys.png"
            alt="Synthesys"
            width={28}
            height={28}
            className="rounded-sm shadow-glow"
            priority
          />
          <span className="text-lg font-semibold tracking-wide">Synthesys</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-white/80">
          <Link href="/#about" className="hover:text-white">
            About
          </Link>
          <Link href="/faqs" className="hover:text-white">
            FAQs
          </Link>
          <Link href="/contact" className="hover:text-white">
            Contact
          </Link>
        </nav>

        {/* Social / CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="https://youtube.com"
            aria-label="YouTube"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
          >
            <Youtube className="h-4 w-4" />
          </Link>
          <Link
            href="https://twitter.com"
            aria-label="Twitter"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
          >
            <Twitter className="h-4 w-4" />
          </Link>
          <Link
            href="https://discord.com"
            aria-label="Community"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
          >
            <MessageSquare className="h-4 w-4" />
          </Link>
          <Link
            href="#"
            className="hidden sm:flex items-center gap-2 rounded-xl bg-white/8 hover:bg-white/12 px-3 py-2"
          >
            <FileText className="h-4 w-4" />
            <span className="text-sm">Whitepaper</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
