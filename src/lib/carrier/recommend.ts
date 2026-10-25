import { CarrierOption, optionsForRoute } from "@/config/rate-card";
import { Booking } from "@/lib/booking/model";
import { addCalendarDays, formatHumanDate } from "@/lib/parsing/dates";

export type EligibilityCheck = {
  option: CarrierOption;
  eligible: boolean;
  reasonIfIneligible?: string;
  totalCost: number | null;
  perPalletWeight: number | null;
};

export type RankedOption = EligibilityCheck & {
  rank: number;
  isRecommended: boolean;
  reason: string;
};

export type CarrierDecision = {
  destCountry: string | null;
  perPalletWeight: number | null;
  pallets: number | null;
  priority: string | null;
  options: RankedOption[];
  recommended: RankedOption | null;
  tradeOffNotice: string | null;
  diagnostics: Record<string, unknown>;
};

function perPallet(b: Booking): number | null {
  const g = b.totalGrossWeight.value;
  const p = b.pallets.value;
  if (g == null || p == null || p <= 0) return null;
  return Math.round((g / p) * 100) / 100;
}

function totalCost(opt: CarrierOption, pallets: number): number {
  return opt.pricePerPallet * pallets;
}

type Metrics = { cost: number; days: number; onTime: number };

function minimaxRegret(set: Array<{ opt: CarrierOption; m: Metrics }>): {
  pickIdx: number;
  details: Array<{ costRegret: number; timeRegret: number; relRegret: number; max: number; total: number }>;
} {
  const costs = set.map((x) => x.m.cost);
  const days = set.map((x) => x.m.days);
  const rels = set.map((x) => x.m.onTime);
  const costMin = Math.min(...costs);
  const costMax = Math.max(...costs);
  const timeMin = Math.min(...days);
  const timeMax = Math.max(...days);
  const relMin = Math.min(...rels);
  const relMax = Math.max(...rels);

  const norm = (v: number, mn: number, mx: number) => (mx === mn ? 0 : (v - mn) / (mx - mn));
  const details = set.map((x) => {
    const costRegret = norm(x.m.cost, costMin, costMax);
    const timeRegret = norm(x.m.days, timeMin, timeMax);
    const relRegret = norm(relMax - x.m.onTime, 0, relMax - relMin || 1);
    const max = Math.max(costRegret, timeRegret, relRegret);
    const total = costRegret + timeRegret + relRegret;
    return { costRegret, timeRegret, relRegret, max, total };
  });

  let bestIdx = 0;
  for (let i = 1; i < set.length; i++) {
    const a = details[i];
    const b = details[bestIdx];
    if (a.max < b.max) bestIdx = i;
    else if (a.max === b.max) {
      if (a.total < b.total) bestIdx = i;
      else if (a.total === b.total) {
        if (set[i].m.cost < set[bestIdx].m.cost) bestIdx = i;
        else if (set[i].m.cost === set[bestIdx].m.cost) {
          if (set[i].m.days < set[bestIdx].m.days) bestIdx = i;
          else if (set[i].m.days === set[bestIdx].m.days && set[i].m.onTime > set[bestIdx].m.onTime) bestIdx = i;
        }
      }
    }
  }
  return { pickIdx: bestIdx, details };
}

export function recommendCarrier(b: Booking): CarrierDecision {
  const destCountry = b.destCountry.value;
  const pw = perPallet(b);
  const pallets = b.pallets.value;
  const priority = b.sellerPriority.value;

  if (!destCountry || pw == null || pallets == null) {
    return {
      destCountry,
      perPalletWeight: pw,
      pallets,
      priority,
      options: [],
      recommended: null,
      tradeOffNotice: null,
      diagnostics: { reason: "missing required fields for recommendation" },
    };
  }

  const opts = optionsForRoute(destCountry);
  const checks: EligibilityCheck[] = opts.map((o) => ({
    option: o,
    eligible: pw <= o.maxWeightPerPallet,
    reasonIfIneligible: pw > o.maxWeightPerPallet ? `Weight per pallet ${pw} kg exceeds ${o.maxWeightPerPallet} kg limit.` : undefined,
    totalCost: totalCost(o, pallets),
    perPalletWeight: pw,
  }));

  const eligible = checks.filter((c) => c.eligible);

  if (eligible.length === 0) {
    return {
      destCountry,
      perPalletWeight: pw,
      pallets,
      priority,
      options: checks.map((c, i) => ({ ...c, rank: i + 1, isRecommended: false, reason: c.reasonIfIneligible ?? "" })),
      recommended: null,
      tradeOffNotice: `No service on UK → ${destCountry} accepts ${pw} kg per pallet.`,
      diagnostics: {},
    };
  }

  const metrics = eligible.map((c) => ({
    opt: c.option,
    m: {
      cost: c.totalCost as number,
      days: c.option.transitDays,
      onTime: c.option.onTimeRate,
    },
  }));

  let pickIdx = 0;
  const diagnostics: Record<string, unknown> = {};

  const pri = (priority ?? "Cheapest") as string;
  const nameTieBreak = (a: CarrierOption, b: CarrierOption) => a.carrier.localeCompare(b.carrier);

  if (pri === "Cheapest") {
    metrics.sort((a, b) => a.m.cost - b.m.cost || a.m.days - b.m.days || b.m.onTime - a.m.onTime || nameTieBreak(a.opt, b.opt));
  } else if (pri === "Fastest") {
    metrics.sort((a, b) => a.m.days - b.m.days || a.m.cost - b.m.cost || b.m.onTime - a.m.onTime || nameTieBreak(a.opt, b.opt));
  } else if (pri === "Most reliable") {
    metrics.sort((a, b) => b.m.onTime - a.m.onTime || a.m.cost - b.m.cost || a.m.days - b.m.days || nameTieBreak(a.opt, b.opt));
  } else {
    // Balanced
    const { pickIdx: idx, details } = minimaxRegret(metrics);
    diagnostics.minimaxDetails = details.map((d, i) => ({ carrier: metrics[i].opt.carrier, ...d }));
    const winner = metrics[idx];
    metrics.splice(idx, 1);
    metrics.unshift(winner);
  }

  pickIdx = 0;

  const recommendedOpt = metrics[pickIdx].opt;
  const rankedEligible: RankedOption[] = metrics.map((m, i) => {
    const base = eligible.find((c) => c.option === m.opt)!;
    const reason = buildReason(pri, m.opt, metrics, i === 0, diagnostics);
    return { ...base, rank: i + 1, isRecommended: i === 0, reason };
  });
  const rankedIneligible: RankedOption[] = checks
    .filter((c) => !c.eligible)
    .map((c, i) => ({
      ...c,
      rank: rankedEligible.length + i + 1,
      isRecommended: false,
      reason: c.reasonIfIneligible ?? "",
    }));

  const allRanked = [...rankedEligible, ...rankedIneligible];

  // trade-off notice: if the carrier that would rank first ignoring weight is not eligible, note the gap
  let tradeOffNotice: string | null = null;
  const bestIneligible = findRankLeaderIgnoringEligibility(opts, pri);
  if (bestIneligible && pw > bestIneligible.maxWeightPerPallet) {
    const recCost = (allRanked.find((r) => r.isRecommended)?.totalCost ?? 0) as number;
    const bestIneligibleCost = totalCost(bestIneligible, pallets);
    const costDelta = recCost - bestIneligibleCost;
    const dayDelta = recommendedOpt.transitDays - bestIneligible.transitDays;
    tradeOffNotice = `${bestIneligible.carrier} (${bestIneligible.service}) is unavailable at ${pw} kg per pallet (limit ${bestIneligible.maxWeightPerPallet} kg). ${recommendedOpt.carrier} is the chosen eligible service: £${costDelta >= 0 ? costDelta : -costDelta} ${costDelta >= 0 ? "more" : "less"} than ineligible option, ${dayDelta >= 0 ? dayDelta : -dayDelta} days ${dayDelta >= 0 ? "slower" : "faster"}.`;
  }

  return {
    destCountry,
    perPalletWeight: pw,
    pallets,
    priority: pri,
    options: allRanked,
    recommended: rankedEligible[0] ?? null,
    tradeOffNotice,
    diagnostics,
  };
}

function findRankLeaderIgnoringEligibility(opts: readonly CarrierOption[], priority: string): CarrierOption | null {
  const arr = [...opts];
  if (priority === "Cheapest") arr.sort((a, b) => a.pricePerPallet - b.pricePerPallet);
  else if (priority === "Fastest") arr.sort((a, b) => a.transitDays - b.transitDays);
  else if (priority === "Most reliable") arr.sort((a, b) => b.onTimeRate - a.onTimeRate);
  else arr.sort((a, b) => a.pricePerPallet - b.pricePerPallet);
  return arr[0] ?? null;
}

function buildReason(
  priority: string,
  opt: CarrierOption,
  metrics: Array<{ opt: CarrierOption; m: Metrics }>,
  isWinner: boolean,
  diagnostics: Record<string, unknown>
): string {
  if (!isWinner) {
    if (priority === "Cheapest") return `More expensive than the recommended option (£${opt.pricePerPallet}/pallet).`;
    if (priority === "Fastest") return `Slower than the recommended option (${opt.transitDays} days transit).`;
    if (priority === "Most reliable") return `Lower on-time rate than the recommended option (${opt.onTimeRate}%).`;
    return "Higher balanced regret than the recommended option.";
  }
  if (priority === "Balanced") {
    const d = (diagnostics.minimaxDetails as Array<{ carrier: string; max: number; total: number }> | undefined) ?? [];
    const self = d.find((x) => x.carrier === opt.carrier);
    const summary = self
      ? `Balanced pick: minimax regret ${self.max.toFixed(2)}, total ${self.total.toFixed(2)} (lower is better).`
      : "Balanced pick: lowest maximum regret across cost, speed, reliability.";
    return summary;
  }
  if (priority === "Cheapest") return `Lowest total cost among eligible services (£${opt.pricePerPallet}/pallet).`;
  if (priority === "Fastest") return `Fewest transit days among eligible services (${opt.transitDays} days).`;
  if (priority === "Most reliable") return `Highest on-time rate among eligible services (${opt.onTimeRate}%).`;
  return "";
}

export function estimatedDelivery(readyIso: string | null, opt: CarrierOption | null): string | null {
  if (!readyIso || !opt) return null;
  const iso = addCalendarDays(readyIso, opt.transitDays);
  return `${formatHumanDate(iso)} (calendar-day estimate; ${opt.carrier} arrives on the promised day ${opt.onTimeRate}% of the time)`;
}
