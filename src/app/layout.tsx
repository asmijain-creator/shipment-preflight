import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shipment Pre-Flight Checker",
  description: "Catch errors before your UK → EU shipment leaves. Case 2, Mesa AI x Ops Hackathon.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <a href="/" className="font-semibold tracking-tight text-slate-900">
              Pre-Flight · UK → EU Freight
            </a>
            <nav className="flex gap-4 text-sm text-slate-600">
              <a href="/" className="hover:text-slate-900">Upload</a>
              <a href="/queue" className="hover:text-slate-900">Review queue</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-slate-500">
          Built for Mesa AI × Ops Hackathon · deterministic rule engine · code decides, not the model.
        </footer>
      </body>
    </html>
  );
}
