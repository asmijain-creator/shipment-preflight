"use client";
import type { AnalyzedBooking } from "@/lib/analyze";
import type { Finding } from "@/lib/rules/types";
import { verdictBadge } from "./verdict-badge";

export default function BookingDetail({ analyzed }: { analyzed: AnalyzedBooking }) {
  const { booking: b, carrier, outcome, nextSteps, repackScenarios } = analyzed;
  return (
    <section className="rounded-lg border bg-white">
      <div className="border-b px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">
            {b.bookingRef.value} · {b.sellerName.value ?? "Seller"}
          </h2>
          {verdictBadge(outcome.verdict)}
          {b.isTemplateExample && (
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
              Template example row
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-600">{outcome.label}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs md:grid-cols-4">
          <Field label="Route" value={`${b.originCity.value ?? "?"} → ${b.destCity.value ?? "?"}, ${b.destCountry.value ?? "?"}`} />
          <Field label="Dest type" value={b.destinationType.value ?? "?"} />
          <Field label="Ready date" value={b.readyDate.value ?? b.readyDate.raw != null ? String(b.readyDate.value ?? b.readyDate.raw) : "—"} />
          <Field label="Priority" value={b.sellerPriority.value ?? "?"} />
          <Field label="Pallets" value={b.pallets.value ?? "?"} />
          <Field label="Cartons" value={b.cartons.value ?? "?"} />
          <Field label="Gross wt" value={b.totalGrossWeight.value != null ? `${b.totalGrossWeight.value} kg` : "?"} />
          <Field label="Declared" value={b.totalDeclaredValue.value != null ? `£${b.totalDeclaredValue.value.toFixed(2)}` : "?"} />
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Findings</h3>
          {outcome.allFindings.length === 0 ? (
            <p className="text-sm text-slate-500">No issues found.</p>
          ) : (
            <ul className="space-y-3">
              {[...outcome.redFindings, ...outcome.amberFindings, ...outcome.incompleteFindings].map((f, i) => (
                <FindingCard key={i} f={f} />
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">All checks</h3>
          <ul className="divide-y rounded border text-sm">
            {outcome.ruleResults.map((r) => (
              <li key={r.ruleId} className="flex items-center justify-between px-3 py-2">
                <div>
                  <span className="font-mono text-xs text-slate-500 mr-2">{r.ruleId}</span>
                  {r.ruleName}
                </div>
                <StatusPill status={r.status} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t p-5">
        <h3 className="mb-2 text-sm font-semibold">Carrier recommendation</h3>
        {carrier.options.length === 0 ? (
          <p className="text-sm text-slate-500">Not enough data to recommend a carrier.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500">
                  <th className="py-1">Carrier</th>
                  <th className="py-1">Service</th>
                  <th className="py-1">Cost</th>
                  <th className="py-1">Transit</th>
                  <th className="py-1">On-time</th>
                  <th className="py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {carrier.options.map((o, i) => (
                  <tr key={i} className={`border-t ${o.isRecommended ? "bg-emerald-50" : ""}`}>
                    <td className="py-1">{o.option.carrier}</td>
                    <td className="py-1">{o.option.service}</td>
                    <td className="py-1">{o.totalCost != null ? `£${o.totalCost}` : "—"}</td>
                    <td className="py-1">{o.option.transitDays} d</td>
                    <td className="py-1">{o.option.onTimeRate}%</td>
                    <td className="py-1 text-xs">
                      {o.eligible ? (o.isRecommended ? "Recommended" : "Eligible") : <span className="text-rose-700">Not eligible</span>}
                      {o.reason && <span className="block text-slate-500">{o.reason}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {carrier.tradeOffNotice && (
              <p className="mt-3 rounded bg-slate-50 p-2 text-xs text-slate-600">{carrier.tradeOffNotice}</p>
            )}
          </>
        )}
        {repackScenarios.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase text-slate-500">Provisional repacking scenarios</h4>
            <ul className="mt-1 space-y-1 text-xs text-slate-700">
              {repackScenarios.map((s, i) => (
                <li key={i}>
                  {s.pallets} pallets ({s.perPalletWeight} kg/pallet) → {s.recommendedCarrier ?? "no carrier"}{s.totalCost != null ? ` · £${s.totalCost}` : ""}{s.transitDays != null ? ` · ${s.transitDays} d` : ""}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">Assumes total gross weight is unchanged. Confirm the new gross weight after repacking.</p>
          </div>
        )}
      </div>

      <div className="border-t p-5">
        <h3 className="mb-2 text-sm font-semibold">Confirmation and next steps</h3>
        <p className="text-sm text-slate-700">{nextSteps}</p>
        <p className="mt-2 text-xs text-slate-500">
          The final state is &ldquo;Ready for booking&rdquo;. This tool does not connect to a carrier.
        </p>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium">{String(value ?? "—")}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: "pass" | "fail" | "na" | "cannot-check" }) {
  const map = {
    pass: ["bg-emerald-100 text-emerald-800", "Pass"],
    fail: ["bg-rose-100 text-rose-800", "Fail"],
    na: ["bg-slate-100 text-slate-600", "N/A"],
    "cannot-check": ["bg-amber-100 text-amber-800", "Cannot check"],
  } as const;
  const [cls, label] = map[status];
  return <span className={`rounded px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
}

function FindingCard({ f }: { f: Finding }) {
  const sevStyle: Record<string, string> = {
    red: "border-rose-200 bg-rose-50",
    amber: "border-amber-200 bg-amber-50",
    incomplete: "border-slate-200 bg-slate-50",
  };
  const sevLabel: Record<string, string> = {
    red: "Red · must fix",
    amber: "Amber · warning",
    incomplete: "Incomplete",
  };
  return (
    <li className={`rounded border p-3 ${sevStyle[f.severity] ?? ""}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="font-mono">{f.ruleId}</span>
        <span className="font-medium">{sevLabel[f.severity] ?? f.severity}</span>
        {f.sku && <span>· SKU {f.sku}</span>}
        {f.sourceRow && <span>· row {f.sourceRow}</span>}
      </div>
      <p className="mt-1 text-sm">{f.message}</p>
      <p className="mt-1 text-xs text-slate-600">Where it would fail: {f.whereFail}</p>
      {f.fix && (
        <div className="mt-2 rounded bg-white/70 p-2 text-xs">
          <p className="font-medium">Fix ({labelOf(f.fix.confidence)})</p>
          <p>{f.fix.label}</p>
          {f.fix.alternatives && f.fix.alternatives.length > 0 && (
            <ul className="mt-1 list-disc pl-4">
              {f.fix.alternatives.map((a, i) => (
                <li key={i}>{a.description}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function labelOf(c: string): string {
  if (c === "arithmetic-correction") return "Arithmetic correction";
  if (c === "evidence-supported") return "Evidence-supported suggestion";
  return "Needs seller confirmation";
}
