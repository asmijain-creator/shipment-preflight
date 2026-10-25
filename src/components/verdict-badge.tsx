import type { Verdict } from "@/lib/verdict";

export function verdictBadge(v: Verdict) {
  const styles: Record<Verdict, string> = {
    blocked: "bg-rose-100 text-rose-800 border-rose-200",
    incomplete: "bg-slate-100 text-slate-700 border-slate-200",
    warnings: "bg-amber-100 text-amber-800 border-amber-200",
    passed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
  const labels: Record<Verdict, string> = {
    blocked: "🔴 Blocked",
    incomplete: "⚪ Incomplete",
    warnings: "🟠 Warnings",
    passed: "🟢 Passed",
  };
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${styles[v]}`}>
      {labels[v]}
    </span>
  );
}
