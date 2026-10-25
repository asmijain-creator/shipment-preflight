export type FieldStatus = "ok" | "missing" | "invalid" | "unknown";
export type FieldSource =
  | "uploaded"
  | "stated in chat"
  | "calculated"
  | "confirmed by seller"
  | "generated";

export type FieldValue<T> = {
  raw: unknown;
  value: T | null;
  status: FieldStatus;
  source: FieldSource;
  note?: string;
};

export function fv<T>(
  raw: unknown,
  value: T | null,
  status: FieldStatus = value === null ? "missing" : "ok",
  source: FieldSource = "uploaded",
  note?: string
): FieldValue<T> {
  return { raw, value, status, source, note };
}

export type BookingItem = {
  internalId: string;
  sourceRow: number | null;
  sku: FieldValue<string>;
  description: FieldValue<string>;
  hsCode: FieldValue<string>;
  quantity: FieldValue<number>;
  unitPrice: FieldValue<number>;
  unitsPerCarton: FieldValue<number>;
  cartons: FieldValue<number>;
  unitWeight: FieldValue<number>;
  countryOfOrigin: FieldValue<string>;
};

export type Booking = {
  id: string;
  bookingRef: FieldValue<string>;
  sourceRow: number | null;
  sellerName: FieldValue<string>;
  originCity: FieldValue<string>;
  originCountry: FieldValue<string>;
  destCity: FieldValue<string>;
  destCountry: FieldValue<string>;
  destinationType: FieldValue<string>;
  readyDate: FieldValue<string>; // ISO yyyy-mm-dd
  sellerPriority: FieldValue<string>;
  pallets: FieldValue<number>;
  cartons: FieldValue<number>;
  totalDeclaredValue: FieldValue<number>;
  currency: FieldValue<string>;
  totalGrossWeight: FieldValue<number>;
  deliveryAppointment: FieldValue<string>;
  items: BookingItem[];
  isTemplateExample?: boolean;
};

export type ParseResult = {
  bookings: Booking[];
  unmatchedItems: Array<{ sourceRow: number; bookingRef: string; raw: Record<string, unknown> }>;
  fileErrors: string[];
  duplicateBookingRefs: string[];
};
