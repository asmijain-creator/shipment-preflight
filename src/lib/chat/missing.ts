import { Booking } from "@/lib/booking/model";

export type MissingField = {
  key: string;
  question: string;
  options?: readonly string[];
};

import {
  ORIGIN_CITIES,
  DEST_CITIES,
  DESTINATION_TYPES,
  SELLER_PRIORITIES,
  APPT_VALUES,
  ITEM_ORIGIN_COUNTRIES,
} from "@/config/allowed-values";

export function nextMissing(b: Booking): MissingField[] {
  const q: MissingField[] = [];
  if (b.destCity.status === "missing") {
    const all = Object.values(DEST_CITIES).flat();
    q.push({ key: "destCity", question: "Which destination city?", options: all });
  }
  if (b.destinationType.status === "missing") {
    q.push({ key: "destinationType", question: "Is the destination a Warehouse or a Business address?", options: DESTINATION_TYPES });
  }
  if (b.originCity.status === "missing") {
    q.push({ key: "originCity", question: "Which UK city is the pickup from?", options: ORIGIN_CITIES });
  }

  if (b.items.length === 0) {
    q.push({ key: "items", question: "What's in the shipment? For each product I need: SKU (optional), description, quantity, unit price, units per carton, unit weight, HS code, country of origin." });
  }
  for (const it of b.items) {
    const missing: string[] = [];
    if (it.description.status === "missing") missing.push("description");
    if (it.quantity.status === "missing") missing.push("quantity");
    if (it.unitPrice.status === "missing") missing.push("unit price");
    if (it.unitsPerCarton.status === "missing") missing.push("units per carton");
    if (it.unitWeight.status === "missing") missing.push("unit weight");
    if (it.hsCode.status === "missing") missing.push("HS code");
    if (it.countryOfOrigin.status === "missing") missing.push("country of origin");
    if (missing.length > 0) {
      q.push({ key: `item:${it.internalId}`, question: `For item ${it.sku.value ?? it.internalId}: still need ${missing.join(", ")}.`, options: it.countryOfOrigin.status === "missing" ? ITEM_ORIGIN_COUNTRIES : undefined });
    }
  }

  if (b.pallets.status === "missing") q.push({ key: "pallets", question: "How many pallets?" });
  if (b.totalGrossWeight.status === "missing") q.push({ key: "totalGrossWeight", question: "Total gross weight in kg?" });
  if (b.readyDate.status === "missing") q.push({ key: "readyDate", question: "What is the ready-to-ship date? (DD-MM-YYYY, or 'next Friday')" });
  if (b.sellerPriority.status === "missing") q.push({ key: "sellerPriority", question: "Which matters most: Cheapest, Fastest, Most reliable, or Balanced?", options: SELLER_PRIORITIES });
  if (b.destinationType.value === "Warehouse" && b.deliveryAppointment.status === "missing") {
    q.push({ key: "deliveryAppointment", question: "Is a delivery appointment booked at the warehouse? (Yes/No)", options: APPT_VALUES });
  }

  return q;
}
