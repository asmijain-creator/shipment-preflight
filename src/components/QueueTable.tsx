"use client";
import type { AnalyzedBooking } from "@/lib/analyze";
import { verdictBadge } from "./verdict-badge";

export default function QueueTable({
  bookings,
  selectedId,
  onSelect,
}: {
  bookings: AnalyzedBooking[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">
        No bookings found in this file.
      </div>
    );
  }
  const counts = {
    blocked: bookings.filter((b) => b.outcome.verdict === "blocked").length,
    incomplete: bookings.filter((b) => b.outcome.verdict === "incomplete").length,
    warnings: bookings.filter((b) => b.outcome.verdict === "warnings").length,
    passed: bookings.filter((b) => b.outcome.verdict === "passed").length,
  };
  const commonRule = mostCommonRule(bookings);

  const order = { blocked: 0, incomplete: 1, warnings: 2, passed: 3 } as const;
  const sorted = [...bookings].sort((a, b) => order[a.outcome.verdict] - order[b.outcome.verdict]);

  return (
    <section className="rounded-lg border bg-white">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3 text-sm">
        <span className="font-medium">{bookings.length} bookings</span>
        <span className="text-rose-700">{counts.blocked} Blocked</span>
        <span className="text-slate-600">{counts.incomplete} Incomplete</span>
        <span className="text-amber-700">{counts.warnings} Warnings</span>
        <span className="text-emerald-700">{counts.passed} Passed</span>
        {commonRule && <span className="text-slate-500 ml-auto">Most common issue: {commonRule}</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Booking</th>
              <th className="px-4 py-2">Seller</th>
              <th className="px-4 py-2">Route</th>
              <th className="px-4 py-2">Verdict</th>
              <th className="px-4 py-2">Red</th>
              <th className="px-4 py-2">Amber</th>
              <th className="px-4 py-2">Carrier</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => {
              const red = b.outcome.redFindings.length;
              const amber = b.outcome.amberFindings.length;
              const rec = b.carrier.recommended;
              const isSel = b.booking.id === selectedId;
              return (
                <tr
                  key={b.booking.id}
                  className={`cursor-pointer border-t ${isSel ? "bg-slate-50" : "hover:bg-slate-50"}`}
                  onClick={() => onSelect(b.booking.id)}
                >
                  <td className="px-4 py-2 font-mono text-xs">{b.booking.bookingRef.value}</td>
                  <td className="px-4 py-2">{b.booking.sellerName.value ?? "—"}</td>
                  <td className="px-4 py-2">{b.booking.originCity.value ?? "?"} → {b.booking.destCity.value ?? "?"}</td>
                  <td className="px-4 py-2">{verdictBadge(b.outcome.verdict)}</td>
                  <td className="px-4 py-2 text-rose-700">{red || ""}</td>
                  <td className="px-4 py-2 text-amber-700">{amber || ""}</td>
                  <td className="px-4 py-2 text-xs">{rec ? `${rec.option.carrier} · ${rec.option.service}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function mostCommonRule(bookings: AnalyzedBooking[]): string | null {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    for (const f of b.outcome.allFindings) {
      if (f.severity === "red" || f.severity === "amber") {
        counts.set(f.ruleId, (counts.get(f.ruleId) ?? 0) + 1);
      }
    }
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [k, v] of counts) if (v > bestN) { best = k; bestN = v; }
  return best;
}
