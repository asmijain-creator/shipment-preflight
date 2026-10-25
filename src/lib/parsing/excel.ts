import ExcelJS from "exceljs";
import { Booking, BookingItem, ParseResult, fv } from "@/lib/booking/model";
import { makeInternalId, makeBookingId } from "@/lib/booking/ids";
import { parseAnyDate } from "./dates";
import { parseNumber, parseInteger, normalizeHsCode, cleanText } from "./numbers";
import {
  ORIGIN_COUNTRY,
  CURRENCY,
  ORIGIN_CITIES,
  DEST_COUNTRIES,
  DEST_CITIES,
  DESTINATION_TYPES,
  SELLER_PRIORITIES,
  APPT_VALUES,
  ITEM_ORIGIN_COUNTRIES,
  normalizeEnum,
  DestCountry,
} from "@/config/allowed-values";

const BOOKING_SHEET_NAMES = ["bookings"];
const ITEMS_SHEET_NAMES = ["items"];

const BOOKING_HEADERS: Record<string, string[]> = {
  bookingRef: ["booking id", "bookingid", "booking ref"],
  sellerName: ["seller name", "seller"],
  originCity: ["origin city"],
  originCountry: ["origin country"],
  destCity: ["destination city"],
  destCountry: ["destination country"],
  destinationType: ["destination type"],
  readyDate: ["ready to ship date", "ready date"],
  sellerPriority: ["seller priority", "priority"],
  pallets: ["pallets"],
  cartons: ["cartons"],
  totalDeclaredValue: ["total declared value", "declared value"],
  currency: ["currency"],
  totalGrossWeight: ["total gross weight (kg)", "total gross weight", "gross weight"],
  deliveryAppointment: ["delivery appointment booked", "delivery appointment"],
};

const ITEM_HEADERS: Record<string, string[]> = {
  bookingRef: ["booking id", "bookingid"],
  sku: ["sku"],
  description: ["description"],
  hsCode: ["hs code", "hscode", "hs"],
  quantity: ["quantity (units)", "quantity", "qty"],
  unitPrice: ["unit price"],
  unitsPerCarton: ["units per carton"],
  cartons: ["cartons"],
  unitWeight: ["unit weight (kg)", "unit weight"],
  countryOfOrigin: ["country of origin"],
};

function normalizeHeader(s: unknown): string {
  return String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function cellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v == null) return null;
  if (typeof v === "object") {
    // formula result
    if ("result" in v) return (v as { result: unknown }).result;
    // rich text
    if ("richText" in v) {
      return (v as { richText: Array<{ text: string }> }).richText.map((r) => r.text).join("");
    }
    if (v instanceof Date) return v;
  }
  return v;
}

function findSheet(wb: ExcelJS.Workbook, candidates: string[]): ExcelJS.Worksheet | null {
  for (const ws of wb.worksheets) {
    const name = ws.name.trim().toLowerCase();
    if (candidates.includes(name)) return ws;
  }
  return null;
}

function findHeaderRow(ws: ExcelJS.Worksheet, requiredCols: string[]): { rowIdx: number; map: Record<string, number> } | null {
  const maxScan = Math.min(ws.rowCount, 10);
  for (let r = 1; r <= maxScan; r++) {
    const row = ws.getRow(r);
    const map: Record<string, number> = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const h = normalizeHeader(cellValue(cell));
      if (h) map[h] = colNumber;
    });
    const headerKeys = Object.keys(map);
    if (requiredCols.every((required) => headerKeys.some((h) => required === h || h.startsWith(required)))) {
      return { rowIdx: r, map };
    }
  }
  return null;
}

function resolveHeaderIndex(headerMap: Record<string, number>, candidates: string[]): number | null {
  for (const cand of candidates) {
    for (const [h, idx] of Object.entries(headerMap)) {
      if (h === cand) return idx;
    }
  }
  for (const cand of candidates) {
    for (const [h, idx] of Object.entries(headerMap)) {
      if (h.includes(cand)) return idx;
    }
  }
  return null;
}

function rowIsBlank(row: ExcelJS.Row, cols: number[]): boolean {
  for (const c of cols) {
    const v = cellValue(row.getCell(c));
    if (v != null && String(v).trim() !== "") return false;
  }
  return true;
}

export async function parseWorkbook(buffer: ArrayBuffer | Buffer): Promise<ParseResult> {
  const wb = new ExcelJS.Workbook();
  const u8: Uint8Array = Buffer.isBuffer(buffer)
    ? new Uint8Array((buffer as Buffer).buffer, (buffer as Buffer).byteOffset, (buffer as Buffer).byteLength)
    : new Uint8Array(buffer as ArrayBuffer);
  try {
    // exceljs .load accepts Buffer-like; cast through unknown to satisfy its older Buffer type
    await (wb.xlsx.load as unknown as (data: Uint8Array) => Promise<unknown>)(u8);
  } catch (e) {
    return {
      bookings: [],
      unmatchedItems: [],
      duplicateBookingRefs: [],
      fileErrors: [`Could not read the Excel file: ${(e as Error).message}`],
    };
  }

  const errors: string[] = [];
  const bookingsSheet = findSheet(wb, BOOKING_SHEET_NAMES);
  const itemsSheet = findSheet(wb, ITEMS_SHEET_NAMES);
  if (!bookingsSheet) errors.push('Missing "Bookings" sheet.');
  if (!itemsSheet) errors.push('Missing "Items" sheet.');
  if (!bookingsSheet || !itemsSheet) {
    return { bookings: [], unmatchedItems: [], duplicateBookingRefs: [], fileErrors: errors };
  }

  const bookingHeader = findHeaderRow(bookingsSheet, ["booking id", "seller name"]);
  const itemsHeader = findHeaderRow(itemsSheet, ["booking id", "sku"]);
  if (!bookingHeader) errors.push('Could not find Bookings headers (expected row with "Booking ID", "Seller name"…).');
  if (!itemsHeader) errors.push('Could not find Items headers (expected row with "Booking ID", "SKU"…).');
  if (!bookingHeader || !itemsHeader) {
    return { bookings: [], unmatchedItems: [], duplicateBookingRefs: [], fileErrors: errors };
  }

  const bCol: Record<string, number | null> = {};
  for (const [k, cands] of Object.entries(BOOKING_HEADERS)) {
    bCol[k] = resolveHeaderIndex(bookingHeader.map, cands);
  }
  const iCol: Record<string, number | null> = {};
  for (const [k, cands] of Object.entries(ITEM_HEADERS)) {
    iCol[k] = resolveHeaderIndex(itemsHeader.map, cands);
  }

  for (const required of ["bookingRef", "pallets", "cartons", "totalDeclaredValue", "totalGrossWeight"]) {
    if (!bCol[required]) errors.push(`Bookings sheet is missing column for ${required}.`);
  }
  for (const required of ["bookingRef", "quantity", "unitPrice", "unitsPerCarton", "cartons"]) {
    if (!iCol[required]) errors.push(`Items sheet is missing column for ${required}.`);
  }

  const bookingColList = Object.values(bCol).filter((v): v is number => v != null);
  const itemColList = Object.values(iCol).filter((v): v is number => v != null);

  const bookings: Booking[] = [];
  const byRef = new Map<string, Booking[]>();
  const duplicates = new Set<string>();

  for (let r = bookingHeader.rowIdx + 1; r <= bookingsSheet.rowCount; r++) {
    const row = bookingsSheet.getRow(r);
    if (rowIsBlank(row, bookingColList)) continue;

    const rawRef = cellValue(row.getCell(bCol.bookingRef as number));
    const ref = cleanText(rawRef);
    if (!ref) continue;

    const b = buildBookingFromRow(row, bCol, r, ref);
    bookings.push(b);
    const list = byRef.get(ref) ?? [];
    list.push(b);
    if (list.length > 1) duplicates.add(ref);
    byRef.set(ref, list);
  }

  const unmatched: ParseResult["unmatchedItems"] = [];
  for (let r = itemsHeader.rowIdx + 1; r <= itemsSheet.rowCount; r++) {
    const row = itemsSheet.getRow(r);
    if (rowIsBlank(row, itemColList)) continue;
    const refRaw = cellValue(row.getCell(iCol.bookingRef as number));
    const ref = cleanText(refRaw);
    if (!ref) continue;
    const matched = byRef.get(ref);
    if (!matched || matched.length === 0) {
      unmatched.push({ sourceRow: r, bookingRef: ref, raw: extractItemRaw(row, iCol) });
      continue;
    }
    const target = matched[0];
    const item = buildItemFromRow(row, iCol, r, target.items.length);
    target.items.push(item);
  }

  // mark template example
  for (const b of bookings) {
    if (b.bookingRef.value === "BK-001" && b.sellerName.value === "Northfield Goods") {
      b.isTemplateExample = true;
    }
  }

  return {
    bookings,
    unmatchedItems: unmatched,
    duplicateBookingRefs: Array.from(duplicates),
    fileErrors: errors,
  };
}

function extractItemRaw(row: ExcelJS.Row, iCol: Record<string, number | null>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, idx] of Object.entries(iCol)) {
    if (idx) out[k] = cellValue(row.getCell(idx));
  }
  return out;
}

function buildBookingFromRow(
  row: ExcelJS.Row,
  bCol: Record<string, number | null>,
  rowIdx: number,
  ref: string
): Booking {
  const get = (k: string) => (bCol[k] ? cellValue(row.getCell(bCol[k] as number)) : null);

  const originCountryRaw = get("originCountry");
  const destCountryRaw = get("destCountry");
  const destCityRaw = get("destCity");
  const destinationTypeRaw = get("destinationType");
  const sellerPriorityRaw = get("sellerPriority");
  const originCityRaw = get("originCity");
  const currencyRaw = get("currency");
  const apptRaw = get("deliveryAppointment");
  const readyRaw = get("readyDate");

  const originCityVal = normalizeEnum(originCityRaw, ORIGIN_CITIES);
  const originCountryVal = cleanText(originCountryRaw) === ORIGIN_COUNTRY ? ORIGIN_COUNTRY : null;
  const destCountryVal = normalizeEnum(destCountryRaw, DEST_COUNTRIES);
  const destCityOk =
    destCityRaw && destCountryVal
      ? ((DEST_CITIES[destCountryVal as DestCountry] as readonly string[]).find(
          (c) => c.toLowerCase() === String(destCityRaw).trim().toLowerCase()
        ) ?? null)
      : null;
  const destinationTypeVal = normalizeEnum(destinationTypeRaw, DESTINATION_TYPES);
  const sellerPriorityVal = normalizeEnum(sellerPriorityRaw, SELLER_PRIORITIES);
  const currencyVal = cleanText(currencyRaw) === CURRENCY ? CURRENCY : null;
  const apptVal = normalizeEnum(apptRaw, APPT_VALUES);
  const readyIso = parseAnyDate(readyRaw);

  const palletsNum = parseInteger(get("pallets"));
  const cartonsNum = parseInteger(get("cartons"));
  const declaredNum = parseNumber(get("totalDeclaredValue"));
  const grossNum = parseNumber(get("totalGrossWeight"));

  return {
    id: makeBookingId(),
    bookingRef: fv(ref, ref),
    sourceRow: rowIdx,
    sellerName: fv(get("sellerName"), cleanText(get("sellerName"))),
    originCity: fv(originCityRaw, originCityVal, originCityVal ? "ok" : originCityRaw ? "invalid" : "missing"),
    originCountry: fv(originCountryRaw, originCountryVal, originCountryVal ? "ok" : originCountryRaw ? "invalid" : "missing"),
    destCity: fv(destCityRaw, destCityOk, destCityOk ? "ok" : destCityRaw ? "invalid" : "missing"),
    destCountry: fv(destCountryRaw, destCountryVal, destCountryVal ? "ok" : destCountryRaw ? "invalid" : "missing"),
    destinationType: fv(destinationTypeRaw, destinationTypeVal, destinationTypeVal ? "ok" : destinationTypeRaw ? "invalid" : "missing"),
    readyDate: fv(readyRaw, readyIso, readyIso ? "ok" : readyRaw ? "invalid" : "missing"),
    sellerPriority: fv(sellerPriorityRaw, sellerPriorityVal, sellerPriorityVal ? "ok" : sellerPriorityRaw ? "invalid" : "missing"),
    pallets: fv(get("pallets"), palletsNum, palletsNum != null ? "ok" : get("pallets") == null || get("pallets") === "" ? "missing" : "invalid"),
    cartons: fv(get("cartons"), cartonsNum, cartonsNum != null ? "ok" : get("cartons") == null || get("cartons") === "" ? "missing" : "invalid"),
    totalDeclaredValue: fv(get("totalDeclaredValue"), declaredNum, declaredNum != null ? "ok" : get("totalDeclaredValue") == null || get("totalDeclaredValue") === "" ? "missing" : "invalid"),
    currency: fv(currencyRaw, currencyVal, currencyVal ? "ok" : currencyRaw ? "invalid" : "missing"),
    totalGrossWeight: fv(get("totalGrossWeight"), grossNum, grossNum != null ? "ok" : get("totalGrossWeight") == null || get("totalGrossWeight") === "" ? "missing" : "invalid"),
    deliveryAppointment: fv(apptRaw, apptVal, apptVal ? "ok" : apptRaw ? "invalid" : "missing"),
    items: [],
  };
}

function buildItemFromRow(
  row: ExcelJS.Row,
  iCol: Record<string, number | null>,
  rowIdx: number,
  itemIndex: number
): BookingItem {
  const get = (k: string) => (iCol[k] ? cellValue(row.getCell(iCol[k] as number)) : null);
  const hs = normalizeHsCode(get("hsCode"));
  const originRaw = get("countryOfOrigin");
  const originVal = normalizeEnum(originRaw, ITEM_ORIGIN_COUNTRIES);
  const qty = parseInteger(get("quantity"));
  const unitPrice = parseNumber(get("unitPrice"));
  const upc = parseInteger(get("unitsPerCarton"));
  const cartons = parseInteger(get("cartons"));
  const unitWeight = parseNumber(get("unitWeight"));

  return {
    internalId: makeInternalId(itemIndex),
    sourceRow: rowIdx,
    sku: fv(get("sku"), cleanText(get("sku"))),
    description: fv(get("description"), cleanText(get("description"))),
    hsCode: fv(get("hsCode"), hs ? hs.digits : null, hs ? "ok" : get("hsCode") == null || get("hsCode") === "" ? "missing" : "invalid"),
    quantity: fv(get("quantity"), qty, qty != null ? "ok" : get("quantity") == null || get("quantity") === "" ? "missing" : "invalid"),
    unitPrice: fv(get("unitPrice"), unitPrice, unitPrice != null ? "ok" : get("unitPrice") == null || get("unitPrice") === "" ? "missing" : "invalid"),
    unitsPerCarton: fv(get("unitsPerCarton"), upc, upc != null ? "ok" : get("unitsPerCarton") == null || get("unitsPerCarton") === "" ? "missing" : "invalid"),
    cartons: fv(get("cartons"), cartons, cartons != null ? "ok" : get("cartons") == null || get("cartons") === "" ? "missing" : "invalid"),
    unitWeight: fv(get("unitWeight"), unitWeight, unitWeight != null ? "ok" : get("unitWeight") == null || get("unitWeight") === "" ? "missing" : "invalid"),
    countryOfOrigin: fv(originRaw, originVal, originVal ? "ok" : originRaw ? "invalid" : "missing"),
  };
}
