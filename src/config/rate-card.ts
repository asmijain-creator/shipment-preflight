export type CarrierOption = {
  carrier: "Carrier A" | "Carrier B" | "Carrier C";
  service: "Road economy" | "Road standard" | "Road express";
  originCountry: "United Kingdom";
  destCountry: "Germany" | "France" | "Netherlands";
  pricePerPallet: number;
  transitDays: number;
  onTimeRate: number;
  maxWeightPerPallet: number;
};

export const RATE_CARD: readonly CarrierOption[] = [
  { carrier: "Carrier A", service: "Road economy",  originCountry: "United Kingdom", destCountry: "Germany",     pricePerPallet: 180, transitDays: 5, onTimeRate: 92, maxWeightPerPallet: 500 },
  { carrier: "Carrier B", service: "Road standard", originCountry: "United Kingdom", destCountry: "Germany",     pricePerPallet: 220, transitDays: 3, onTimeRate: 95, maxWeightPerPallet: 750 },
  { carrier: "Carrier C", service: "Road express",  originCountry: "United Kingdom", destCountry: "Germany",     pricePerPallet: 340, transitDays: 2, onTimeRate: 98, maxWeightPerPallet: 400 },
  { carrier: "Carrier A", service: "Road economy",  originCountry: "United Kingdom", destCountry: "France",      pricePerPallet: 170, transitDays: 5, onTimeRate: 92, maxWeightPerPallet: 500 },
  { carrier: "Carrier B", service: "Road standard", originCountry: "United Kingdom", destCountry: "France",      pricePerPallet: 210, transitDays: 3, onTimeRate: 95, maxWeightPerPallet: 750 },
  { carrier: "Carrier C", service: "Road express",  originCountry: "United Kingdom", destCountry: "France",      pricePerPallet: 330, transitDays: 2, onTimeRate: 98, maxWeightPerPallet: 400 },
  { carrier: "Carrier A", service: "Road economy",  originCountry: "United Kingdom", destCountry: "Netherlands", pricePerPallet: 160, transitDays: 5, onTimeRate: 92, maxWeightPerPallet: 500 },
  { carrier: "Carrier B", service: "Road standard", originCountry: "United Kingdom", destCountry: "Netherlands", pricePerPallet: 200, transitDays: 3, onTimeRate: 95, maxWeightPerPallet: 750 },
  { carrier: "Carrier C", service: "Road express",  originCountry: "United Kingdom", destCountry: "Netherlands", pricePerPallet: 320, transitDays: 2, onTimeRate: 98, maxWeightPerPallet: 400 },
] as const;

export function optionsForRoute(destCountry: string): CarrierOption[] {
  return RATE_CARD.filter((r) => r.destCountry === destCountry);
}
