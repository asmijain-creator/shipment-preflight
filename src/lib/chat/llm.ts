import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { Booking } from "@/lib/booking/model";
import { MissingField } from "./missing";
import { llmResponseSchema, LlmResponse } from "./edit-schema";
import { istToday } from "@/lib/parsing/dates";

const MODEL = "gemini-2.5-flash";

function compactBooking(b: Booking) {
  return {
    sellerName: b.sellerName.value,
    originCity: b.originCity.value,
    destCity: b.destCity.value,
    destCountry: b.destCountry.value,
    destinationType: b.destinationType.value,
    readyDate: b.readyDate.value,
    sellerPriority: b.sellerPriority.value,
    pallets: b.pallets.value,
    cartons: b.cartons.value,
    totalDeclaredValue: b.totalDeclaredValue.value,
    totalGrossWeight: b.totalGrossWeight.value,
    deliveryAppointment: b.deliveryAppointment.value,
    items: b.items.map((it) => ({
      internalId: it.internalId,
      sku: it.sku.value,
      description: it.description.value,
      hsCode: it.hsCode.value,
      quantity: it.quantity.value,
      unitPrice: it.unitPrice.value,
      unitsPerCarton: it.unitsPerCarton.value,
      cartons: it.cartons.value,
      unitWeight: it.unitWeight.value,
      countryOfOrigin: it.countryOfOrigin.value,
    })),
  };
}

const SYSTEM = `You are a shipment-booking assistant. Convert the seller's message into structured edit operations.

STRICT RULES:
1. Return ONLY the schema fields. Never invent numbers, prices, HS codes, or dates the seller did not say.
2. Allowed destination cities: Berlin, Frankfurt, Hamburg (Germany); Paris, Lyon (France); Amsterdam, Rotterdam (Netherlands). Reject anything else and ask for a valid city.
3. Allowed origin cities: London, Manchester, Birmingham, Leeds.
4. Allowed seller priority: Cheapest, Fastest, Most reliable, Balanced.
5. Allowed country of origin for items: United Kingdom, China, India, Vietnam, Turkey, Germany.
6. Dates: pass through as the seller wrote them. If relative (e.g. "next Friday"), resolve against today in IST and output DD-MM-YYYY.
7. For relative changes like "add a pallet", use adjust_booking_number with delta.
8. For an ambiguous reference ("the mugs" when there are two mug rows), emit a clarify edit with your question.
9. "I don't know the HS code" → mark_unknown with target=item, field=hsCode, itemInternalId=<id>.
10. The seller can confirm "no battery included" to clear an R-06 battery flag.
11. If the message is just chat (hello, thanks, etc), return an empty edits array and a short reply.
12. The reply is one short friendly line. Keep it to one or two sentences.
`;

export async function extractEdits(opts: {
  message: string;
  booking: Booking;
  missing: MissingField[];
}): Promise<LlmResponse> {
  const today = istToday();
  const prompt = `Today (IST): ${today}

Current booking state:
${JSON.stringify(compactBooking(opts.booking), null, 2)}

Missing fields that still need to be filled:
${opts.missing.map((m) => `- ${m.key}: ${m.question}${m.options ? ` (options: ${(m.options as readonly string[]).join(", ")})` : ""}`).join("\n") || "(none)"}

Seller message:
"""${opts.message}"""

Return the edits and a short reply.`;

  const { object } = await generateObject({
    model: google(MODEL),
    schema: llmResponseSchema,
    system: SYSTEM,
    prompt,
    temperature: 0,
  });
  return object;
}
