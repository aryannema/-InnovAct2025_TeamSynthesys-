import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner"; // wrapper (client) around "sonner"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GeoAI UI",
  description: "Hackathon frontend",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-slate-50`}>
        {children}
        {/* Toasts render here so any page can use them */}
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
