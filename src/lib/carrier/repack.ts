import { Booking } from "@/lib/booking/model";
import { optionsForRoute } from "@/config/rate-card";
import { recommendCarrier } from "./recommend";
import type { CarrierDecision } from "./recommend";

export type RepackScenario = {
  pallets: number;
  perPalletWeight: number;
  recommendedCarrier: string | null;
  recommendedService: string | null;
  totalCost: number | null;
  transitDays: number | null;
  onTimeRate: number | null;
  note: string;
};

export function repackScenarios(b: Booking): RepackScenario[] {
  const g = b.totalGrossWeight.value;
  const destCountry = b.destCountry.value;
  if (g == null || !destCountry) return [];
  const opts = optionsForRoute(destCountry);
  const minMax = Math.min(...opts.map((o) => o.maxWeightPerPallet));
  const need = Math.max(1, Math.ceil(g / minMax));
  const scenarios: RepackScenario[] = [];
  for (let p = need; p <= need + 2; p++) {
    const clone: Booking = { ...b, pallets: { ...b.pallets, value: p, source: "generated" } };
    const dec: CarrierDecision = recommendCarrier(clone);
    const r = dec.recommended;
    scenarios.push({
      pallets: p,
      perPalletWeight: Math.round((g / p) * 100) / 100,
      recommendedCarrier: r?.option.carrier ?? null,
      recommendedService: r?.option.service ?? null,
      totalCost: r?.totalCost ?? null,
      transitDays: r?.option.transitDays ?? null,
      onTimeRate: r?.option.onTimeRate ?? null,
      note: "Provisional scenario: assumes total gross weight is unchanged. Confirm the new gross weight after repacking.",
    });
  }
  return scenarios;
}
