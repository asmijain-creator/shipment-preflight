import { NextRequest, NextResponse } from "next/server";
import { Booking } from "@/lib/booking/model";
import { analyzeBooking } from "@/lib/analyze";
import { applyEdits, emptyBooking } from "@/lib/chat/apply";
import { nextMissing } from "@/lib/chat/missing";
import { extractEdits } from "@/lib/chat/llm";

export const maxDuration = 60;

const seenMessageIds = new Map<string, { response: unknown; expiresAt: number }>();

function sweep() {
  const now = Date.now();
  for (const [k, v] of seenMessageIds) if (v.expiresAt < now) seenMessageIds.delete(k);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      message?: string;
      clientMsgId?: string;
      booking?: Booking | null;
    };
    const message = (body.message ?? "").trim();
    if (!message) return NextResponse.json({ error: "Empty message." }, { status: 400 });

    sweep();
    const key = `${body.clientMsgId ?? ""}`;
    if (key && seenMessageIds.has(key)) {
      return NextResponse.json(seenMessageIds.get(key)!.response);
    }

    const incoming = body.booking ?? emptyBooking();
    const missing = nextMissing(incoming);

    let llmResponse;
    let fallback = false;
    let fallbackReason = "";
    try {
      llmResponse = await extractEdits({ message, booking: incoming, missing });
    } catch (e) {
      fallback = true;
      fallbackReason = (e as Error).message;
      llmResponse = { edits: [], reply: `I couldn't parse that just now (${fallbackReason}). Try answering the next question below.` };
    }

    const { booking: updated, applied, rejected } = applyEdits(incoming, llmResponse.edits);
    const analyzed = analyzeBooking(updated);
    const remaining = nextMissing(updated);

    const response = {
      reply: llmResponse.reply,
      analyzed,
      editsApplied: applied,
      editsRejected: rejected,
      missing: remaining,
      fallback,
      fallbackReason,
    };

    if (key) seenMessageIds.set(key, { response, expiresAt: Date.now() + 10 * 60 * 1000 });
    return NextResponse.json(response);
  } catch (e) {
    return NextResponse.json({ error: `Server error: ${(e as Error).message}` }, { status: 500 });
  }
}
