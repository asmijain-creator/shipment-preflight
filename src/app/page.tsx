"use client";
import { useState } from "react";
import type { AnalyzedBooking } from "@/lib/analyze";
import BookingDetail from "@/components/BookingDetail";
import QueueTable from "@/components/QueueTable";

type UploadResponse = {
  bookings: AnalyzedBooking[];
  unmatchedItems: Array<{ sourceRow: number; bookingRef: string; raw: Record<string, unknown> }>;
  duplicateBookingRefs: string[];
  fileErrors: string[];
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedId(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json()) as UploadResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setResult(json);
      if (json.bookings.length > 0) setSelectedId(json.bookings[0].booking.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const selected = result?.bookings.find((b) => b.booking.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      {!result && (
        <section className="rounded-lg border bg-white p-6">
          <h1 className="text-xl font-semibold mb-2">Pre-flight checks for UK → EU freight</h1>
          <p className="text-sm text-slate-600 mb-5 max-w-prose">
            Upload the official Bookings + Items workbook. We parse it, run the 10-rule checker,
            compare the three route carriers against the seller priority, and show what to fix.
          </p>
          <label className="inline-flex items-center gap-3 rounded-md border bg-slate-50 px-4 py-3 cursor-pointer hover:bg-slate-100">
            <span className="text-sm font-medium">Choose .xlsx</span>
            <input type="file" accept=".xlsx" onChange={onFile} className="hidden" />
          </label>
          {loading && <p className="mt-3 text-sm text-slate-600">Parsing and running checks…</p>}
          {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
          <div className="mt-6 text-xs text-slate-500 border-t pt-4">
            <p className="font-medium text-slate-700 mb-1">What it checks</p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1 max-w-xl">
              <li>R-01 HS code ≥ 6 digits</li>
              <li>R-02 Σ qty × price = declared</li>
              <li>R-03 upc × cartons = qty</li>
              <li>R-04 booking cartons = Σ item cartons</li>
              <li>R-05 weight/pallet ≤ carrier max</li>
              <li>R-06 no lithium / aerosols / flammables</li>
              <li>R-07 gross ≥ Σ unit weight × qty</li>
              <li>R-08 warehouse → appointment</li>
              <li>R-09 country of origin</li>
              <li>R-10 ready date not in past</li>
            </ul>
          </div>
        </section>
      )}

      {result && (
        <>
          {result.fileErrors.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p className="font-medium">File issues</p>
              <ul className="list-disc list-inside">
                {result.fileErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          {result.duplicateBookingRefs.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">Duplicate Booking IDs</p>
              <p>{result.duplicateBookingRefs.join(", ")}. Each row is kept separately.</p>
            </div>
          )}
          {result.unmatchedItems.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">Unmatched items</p>
              <p>{result.unmatchedItems.length} item row(s) reference a Booking ID that is not in the Bookings sheet.</p>
            </div>
          )}
          <QueueTable bookings={result.bookings} selectedId={selectedId} onSelect={setSelectedId} />
          {selected && <BookingDetail analyzed={selected} />}
          <div>
            <button
              className="text-sm text-slate-500 underline"
              onClick={() => { setResult(null); setSelectedId(null); }}
            >
              Upload another file
            </button>
          </div>
        </>
      )}
    </div>
  );
}
