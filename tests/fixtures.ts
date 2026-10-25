import { Booking, BookingItem, fv } from "@/lib/booking/model";
import { makeInternalId } from "@/lib/booking/ids";

export function makeBooking(overrides: Partial<Booking> = {}): Booking {
  const b: Booking = {
    id: "b-test-1",
    bookingRef: fv("BK-001", "BK-001"),
    sourceRow: 4,
    sellerName: fv("Northfield Goods", "Northfield Goods"),
    originCity: fv("Manchester", "Manchester"),
    originCountry: fv("United Kingdom", "United Kingdom"),
    destCity: fv("Frankfurt", "Frankfurt"),
    destCountry: fv("Germany", "Germany"),
    destinationType: fv("Warehouse", "Warehouse"),
    readyDate: fv("05-11-2026", "2026-11-05"),
    sellerPriority: fv("Cheapest", "Cheapest"),
    pallets: fv(3, 3),
    cartons: fv(90, 90),
    totalDeclaredValue: fv(5400, 5400),
    currency: fv("GBP", "GBP"),
    totalGrossWeight: fv(620, 620),
    deliveryAppointment: fv("Yes", "Yes"),
    items: [makeItem()],
    ...overrides,
  };
  return b;
}

export function makeItem(overrides: Partial<BookingItem> = {}): BookingItem {
  return {
    internalId: makeInternalId(0),
    sourceRow: 4,
    sku: fv("MUG-01", "MUG-01"),
    description: fv("Ceramic coffee mug, 350 ml", "Ceramic coffee mug, 350 ml"),
    hsCode: fv("691200", "691200"),
    quantity: fv(1080, 1080),
    unitPrice: fv(5.0, 5.0),
    unitsPerCarton: fv(12, 12),
    cartons: fv(90, 90),
    unitWeight: fv(0.5, 0.5),
    countryOfOrigin: fv("United Kingdom", "United Kingdom"),
    ...overrides,
  };
}
