"use client";
import { useRef, useState } from "react";
import type { AnalyzedBooking } from "@/lib/analyze";
import type { Booking } from "@/lib/booking/model";
import type { MissingField } from "@/lib/chat/missing";
import BookingDetail from "@/components/BookingDetail";

type ChatResponse = {
  reply: string;
  analyzed: AnalyzedBooking;
  editsApplied: Array<Record<string, unknown>>;
  editsRejected: Array<{ edit: Record<string, unknown>; reason: string }>;
  missing: MissingField[];
  fallback: boolean;
  fallbackReason?: string;
};

type Turn = { role: "user" | "assistant"; text: string };

export default function ChatPage() {
  const [turns, setTurns] = useState<Turn[]>([
    { role: "assistant", text: "Hi — describe your shipment and I'll fill the booking. UK → Germany, France or Netherlands. Example: 'Sending 90 cartons of mugs from Manchester to Frankfurt, ready next Monday, cheapest.'" },
  ]);
  const [input, setInput] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [analyzed, setAnalyzed] = useState<AnalyzedBooking | null>(null);
  const [missing, setMissing] = useState<MissingField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const msgCounter = useRef(0);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    msgCounter.current += 1;
    const clientMsgId = `msg-${Date.now()}-${msgCounter.current}`;
    setInput("");
    setTurns((t) => [...t, { role: "user", text }]);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, booking, clientMsgId }),
      });
      const json = (await res.json()) as ChatResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Chat failed");
      setTurns((t) => [...t, { role: "assistant", text: json.reply }]);
      setAnalyzed(json.analyzed);
      setBooking(json.analyzed.booking);
      setMissing(json.missing);
      if (json.editsRejected.length > 0) {
        setTurns((t) => [...t, { role: "assistant", text: `Note: ${json.editsRejected.map((r) => r.reason).join(" ")}` }]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <section className="rounded-lg border bg-white lg:col-span-2">
        <div className="border-b px-4 py-3 text-sm font-semibold">Describe your shipment</div>
        <div className="flex h-[520px] flex-col">
          <div className="flex-1 space-y-3 overflow-auto p-4">
            {turns.map((t, i) => (
              <div key={i} className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${t.role === "user" ? "ml-auto bg-slate-900 text-white" : "bg-slate-100"}`}>
                {t.text}
              </div>
            ))}
            {loading && <div className="text-xs text-slate-500">Thinking…</div>}
            {error && <div className="text-xs text-rose-700">{error}</div>}
          </div>
          {missing.length > 0 && (
            <div className="border-t bg-amber-50 px-4 py-2 text-xs text-amber-900">
              Still needed: {missing.slice(0, 3).map((m) => m.key).join(", ")}{missing.length > 3 ? "…" : ""}
            </div>
          )}
          <div className="flex gap-2 border-t p-3">
            <input
              className="flex-1 rounded border px-3 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="Type your shipment details…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </section>

      <section className="lg:col-span-3">
        {analyzed ? (
          <BookingDetail analyzed={analyzed} />
        ) : (
          <div className="rounded-lg border bg-white p-6 text-sm text-slate-600">
            The booking card will fill in here as you chat.
          </div>
        )}
      </section>
    </div>
  );
}
