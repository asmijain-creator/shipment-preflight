import { Booking, BookingItem, fv } from "@/lib/booking/model";
import { makeInternalId } from "@/lib/booking/ids";
import { Edit } from "./edit-schema";
import {
  ORIGIN_CITIES,
  DEST_CITIES,
  DEST_COUNTRIES,
  DESTINATION_TYPES,
  SELLER_PRIORITIES,
  APPT_VALUES,
  ITEM_ORIGIN_COUNTRIES,
  cityToCountry,
  normalizeEnum,
  DestCountry,
} from "@/config/allowed-values";
import { parseAnyDate } from "@/lib/parsing/dates";
import { parseNumber, parseInteger, normalizeHsCode, cleanText } from "@/lib/parsing/numbers";

export type ApplyResult = {
  booking: Booking;
  applied: Edit[];
  rejected: Array<{ edit: Edit; reason: string }>;
};

export function emptyBooking(): Booking {
  return {
    id: `b-chat-${Date.now()}`,
    bookingRef: fv("CHAT-001", "CHAT-001"),
    sourceRow: null,
    sellerName: fv<string>(null, null, "missing"),
    originCity: fv<string>(null, null, "missing"),
    originCountry: fv("United Kingdom", "United Kingdom", "ok", "generated"),
    destCity: fv<string>(null, null, "missing"),
    destCountry: fv<string>(null, null, "missing"),
    destinationType: fv<string>(null, null, "missing"),
    readyDate: fv<string>(null, null, "missing"),
    sellerPriority: fv<string>(null, null, "missing"),
    pallets: fv<number>(null, null, "missing"),
    cartons: fv<number>(null, null, "missing"),
    totalDeclaredValue: fv<number>(null, null, "missing"),
    currency: fv("GBP", "GBP", "ok", "generated"),
    totalGrossWeight: fv<number>(null, null, "missing"),
    deliveryAppointment: fv<string>(null, null, "missing"),
    items: [],
  };
}

export function applyEdits(input: Booking, edits: Edit[]): ApplyResult {
  const b = cloneBooking(input);
  const applied: Edit[] = [];
  const rejected: Array<{ edit: Edit; reason: string }> = [];

  for (const edit of edits) {
    try {
      switch (edit.op) {
        case "set_booking_field": {
          const r = setBookingField(b, edit.field, edit.value);
          if (r.ok) applied.push(edit);
          else rejected.push({ edit, reason: r.reason });
          break;
        }
        case "adjust_booking_number": {
          const current = (b[edit.field].value as number | null) ?? 0;
          const next = current + edit.delta;
          const r = setBookingField(b, edit.field, next);
          if (r.ok) applied.push(edit);
          else rejected.push({ edit, reason: r.reason });
          break;
        }
        case "add_item": {
          const item = buildItem(b.items.length, edit);
          b.items.push(item);
          applied.push(edit);
          break;
        }
        case "update_item": {
          const item = b.items.find((it) => it.internalId === edit.itemInternalId);
          if (!item) {
            rejected.push({ edit, reason: `No item with internal id ${edit.itemInternalId}.` });
            break;
          }
          const r = setItemField(item, edit.field, edit.value);
          if (r.ok) applied.push(edit);
          else rejected.push({ edit, reason: r.reason });
          break;
        }
        case "remove_item": {
          const idx = b.items.findIndex((it) => it.internalId === edit.itemInternalId);
          if (idx < 0) rejected.push({ edit, reason: "Item not found." });
          else {
            b.items.splice(idx, 1);
            applied.push(edit);
          }
          break;
        }
        case "mark_unknown": {
          if (edit.target === "booking") {
            const f = (b as unknown as Record<string, { raw: unknown; value: unknown; status: string; source: string }>)[edit.field];
            if (f) {
              f.status = "unknown";
              f.source = "stated in chat";
              applied.push(edit);
            } else rejected.push({ edit, reason: `Unknown booking field ${edit.field}.` });
          } else if (edit.itemInternalId) {
            const item = b.items.find((it) => it.internalId === edit.itemInternalId);
            if (!item) {
              rejected.push({ edit, reason: "Item not found." });
              break;
            }
            const f = (item as unknown as Record<string, { status: string; source: string }>)[edit.field];
            if (f) {
              f.status = "unknown";
              f.source = "stated in chat";
              applied.push(edit);
            } else rejected.push({ edit, reason: `Unknown item field ${edit.field}.` });
          }
          break;
        }
        case "select_carrier":
        case "confirm":
        case "acknowledge":
        case "clarify":
          applied.push(edit);
          break;
      }
    } catch (e) {
      rejected.push({ edit, reason: (e as Error).message });
    }
  }

  // compute derived fields
  recomputeDerived(b);
  return { booking: b, applied, rejected };
}

function cloneBooking(b: Booking): Booking {
  return JSON.parse(JSON.stringify(b)) as Booking;
}

function setBookingField(b: Booking, field: string, value: unknown): { ok: boolean; reason: string } {
  switch (field) {
    case "sellerName": {
      const v = cleanText(value);
      b.sellerName = fv(value, v, v ? "ok" : "missing", "stated in chat");
      return { ok: true, reason: "" };
    }
    case "originCity": {
      const v = normalizeEnum(value, ORIGIN_CITIES);
      if (!v) return { ok: false, reason: `Origin city must be one of ${ORIGIN_CITIES.join(", ")}.` };
      b.originCity = fv(value, v, "ok", "stated in chat");
      return { ok: true, reason: "" };
    }
    case "destCity": {
      const country = cityToCountry(String(value ?? ""));
      if (!country) return { ok: false, reason: `Destination city must be one of ${Object.values(DEST_CITIES).flat().join(", ")}.` };
      b.destCity = fv(value, String(value), "ok", "stated in chat");
      b.destCountry = fv(country, country, "ok", "calculated");
      return { ok: true, reason: "" };
    }
    case "destCountry": {
      const v = normalizeEnum(value, DEST_COUNTRIES);
      if (!v) return { ok: false, reason: `Destination country must be one of ${DEST_COUNTRIES.join(", ")}.` };
      b.destCountry = fv(value, v, "ok", "stated in chat");
      return { ok: true, reason: "" };
    }
    case "destinationType": {
      const v = normalizeEnum(value, DESTINATION_TYPES);
      if (!v) return { ok: false, reason: `Destination type must be Warehouse or Business address.` };
      b.destinationType = fv(value, v, "ok", "stated in chat");
      return { ok: true, reason: "" };
    }
    case "readyDate": {
      const iso = parseAnyDate(value);
      if (!iso) return { ok: false, reason: "Ready date must be a valid date (DD-MM-YYYY)." };
      b.readyDate = fv(value, iso, "ok", "stated in chat");
      return { ok: true, reason: "" };
    }
    case "sellerPriority": {
      const v = normalizeEnum(value, SELLER_PRIORITIES);
      if (!v) return { ok: false, reason: `Priority must be one of ${SELLER_PRIORITIES.join(", ")}.` };
      b.sellerPriority = fv(value, v, "ok", "stated in chat");
      return { ok: true, reason: "" };
    }
    case "pallets":
    case "cartons": {
      const n = parseInteger(value);
      if (n == null || n < 0) return { ok: false, reason: `${field} must be a non-negative integer.` };
      (b as unknown as Record<string, unknown>)[field] = fv(value, n, "ok", "stated in chat");
      return { ok: true, reason: "" };
    }
    case "totalDeclaredValue":
    case "totalGrossWeight": {
      const n = parseNumber(value);
      if (n == null || n < 0) return { ok: false, reason: `${field} must be a non-negative number.` };
      (b as unknown as Record<string, unknown>)[field] = fv(value, n, "ok", "stated in chat");
      return { ok: true, reason: "" };
    }
    case "deliveryAppointment": {
      const v = normalizeEnum(value, APPT_VALUES);
      if (!v) return { ok: false, reason: "Delivery appointment must be Yes or No." };
      b.deliveryAppointment = fv(value, v, "ok", "stated in chat");
      return { ok: true, reason: "" };
    }
  }
  return { ok: false, reason: `Unknown booking field ${field}.` };
}

function setItemField(item: BookingItem, field: string, value: unknown): { ok: boolean; reason: string } {
  switch (field) {
    case "sku":
    case "description": {
      const v = cleanText(value);
      (item as unknown as Record<string, unknown>)[field] = fv(value, v, v ? "ok" : "missing", "stated in chat");
      return { ok: true, reason: "" };
    }
    case "hsCode": {
      const hs = normalizeHsCode(value);
      if (!hs) return { ok: false, reason: "HS code must be numeric." };
      item.hsCode = fv(value, hs.digits, "ok", "stated in chat");
      return { ok: true, reason: "" };
    }
    case "quantity":
    case "unitsPerCarton":
    case "cartons": {
      const n = parseInteger(value);
      if (n == null || n < 0) return { ok: false, reason: `${field} must be a non-negative integer.` };
      (item as unknown as Record<string, unknown>)[field] = fv(value, n, "ok", "stated in chat");
      return { ok: true, reason: "" };
    }
    case "unitPrice":
    case "unitWeight": {
      const n = parseNumber(value);
      if (n == null || n < 0) return { ok: false, reason: `${field} must be a non-negative number.` };
      (item as unknown as Record<string, unknown>)[field] = fv(value, n, "ok", "stated in chat");
      return { ok: true, reason: "" };
    }
    case "countryOfOrigin": {
      const v = normalizeEnum(value, ITEM_ORIGIN_COUNTRIES);
      if (!v) return { ok: false, reason: `Country of origin must be one of ${ITEM_ORIGIN_COUNTRIES.join(", ")}.` };
      item.countryOfOrigin = fv(value, v, "ok", "stated in chat");
      return { ok: true, reason: "" };
    }
  }
  return { ok: false, reason: `Unknown item field ${field}.` };
}

function buildItem(index: number, edit: Extract<Edit, { op: "add_item" }>): BookingItem {
  const hs = edit.hsCode != null ? normalizeHsCode(edit.hsCode) : null;
  const sku = edit.sku ? edit.sku : `ITEM-${index + 1}`;
  const skuSource = edit.sku ? "stated in chat" : "generated";
  return {
    internalId: makeInternalId(index),
    sourceRow: null,
    sku: fv(sku, sku, "ok", skuSource),
    description: fv(edit.description, cleanText(edit.description), edit.description ? "ok" : "missing", "stated in chat"),
    hsCode: fv(edit.hsCode, hs ? hs.digits : null, hs ? "ok" : "missing", "stated in chat"),
    quantity: fv(edit.quantity, edit.quantity ?? null, edit.quantity != null ? "ok" : "missing", "stated in chat"),
    unitPrice: fv(edit.unitPrice, edit.unitPrice ?? null, edit.unitPrice != null ? "ok" : "missing", "stated in chat"),
    unitsPerCarton: fv(edit.unitsPerCarton, edit.unitsPerCarton ?? null, edit.unitsPerCarton != null ? "ok" : "missing", "stated in chat"),
    cartons: fv(edit.cartons, edit.cartons ?? null, edit.cartons != null ? "ok" : "missing", "stated in chat"),
    unitWeight: fv(edit.unitWeight, edit.unitWeight ?? null, edit.unitWeight != null ? "ok" : "missing", "stated in chat"),
    countryOfOrigin: fv(
      edit.countryOfOrigin,
      edit.countryOfOrigin ? (normalizeEnum(edit.countryOfOrigin, ITEM_ORIGIN_COUNTRIES) ?? null) : null,
      edit.countryOfOrigin ? "ok" : "missing",
      "stated in chat"
    ),
  };
}

function recomputeDerived(b: Booking): void {
  // Derive item cartons when qty / upc are known
  for (const it of b.items) {
    const q = it.quantity.value;
    const upc = it.unitsPerCarton.value;
    if (q != null && upc != null && upc > 0 && q % upc === 0 && it.cartons.source !== "stated in chat" && it.cartons.source !== "uploaded") {
      it.cartons = fv(q / upc, q / upc, "ok", "calculated");
    }
  }
  // Booking cartons = Σ item cartons (if all known) unless explicitly set
  if (b.cartons.source !== "stated in chat" && b.cartons.source !== "uploaded") {
    const all = b.items.map((it) => it.cartons.value);
    if (all.length > 0 && all.every((c) => c != null)) {
      const sum = all.reduce((s, c) => s + (c as number), 0);
      b.cartons = fv(sum, sum, "ok", "calculated");
    }
  }
  // Declared value = Σ qty × price (if all known) unless explicitly set
  if (b.totalDeclaredValue.source !== "stated in chat" && b.totalDeclaredValue.source !== "uploaded") {
    const lines = b.items.map((it) => {
      const q = it.quantity.value;
      const p = it.unitPrice.value;
      return q != null && p != null ? q * p : null;
    });
    if (lines.length > 0 && lines.every((v) => v != null)) {
      const sum = lines.reduce((s, v) => s + (v as number), 0);
      b.totalDeclaredValue = fv(sum, sum, "ok", "calculated");
    }
  }
}
