export const ORIGIN_COUNTRY = "United Kingdom" as const;
export const CURRENCY = "GBP" as const;

export const ORIGIN_CITIES = ["London", "Manchester", "Birmingham", "Leeds"] as const;
export type OriginCity = (typeof ORIGIN_CITIES)[number];

export const DEST_COUNTRIES = ["Germany", "France", "Netherlands"] as const;
export type DestCountry = (typeof DEST_COUNTRIES)[number];

export const DEST_CITIES: Record<DestCountry, readonly string[]> = {
  Germany: ["Berlin", "Frankfurt", "Hamburg"],
  France: ["Paris", "Lyon"],
  Netherlands: ["Amsterdam", "Rotterdam"],
};

export const DESTINATION_TYPES = ["Warehouse", "Business address"] as const;
export type DestinationType = (typeof DESTINATION_TYPES)[number];

export const SELLER_PRIORITIES = ["Cheapest", "Fastest", "Most reliable", "Balanced"] as const;
export type SellerPriority = (typeof SELLER_PRIORITIES)[number];

export const APPT_VALUES = ["Yes", "No"] as const;
export type ApptValue = (typeof APPT_VALUES)[number];

export const ITEM_ORIGIN_COUNTRIES = [
  "United Kingdom",
  "China",
  "India",
  "Vietnam",
  "Turkey",
  "Germany",
] as const;
export type ItemOriginCountry = (typeof ITEM_ORIGIN_COUNTRIES)[number];

export function cityToCountry(city: string): DestCountry | null {
  const c = city.trim();
  for (const country of DEST_COUNTRIES) {
    if ((DEST_CITIES[country] as readonly string[]).some((x) => x.toLowerCase() === c.toLowerCase())) {
      return country;
    }
  }
  return null;
}

export function normalizeEnum<T extends string>(input: unknown, allowed: readonly T[]): T | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  const match = allowed.find((v) => v.toLowerCase() === trimmed.toLowerCase());
  return match ?? null;
}
