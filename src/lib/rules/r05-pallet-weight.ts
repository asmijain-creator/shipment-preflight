import { Booking } from "@/lib/booking/model";
import { Finding, RuleResult } from "./types";
import { optionsForRoute, CarrierOption } from "@/config/rate-card";

export type R05Context = {
  selectedCarrier: CarrierOption | null; // the carrier against which R-05 is checked
};

export function r05(b: Booking, ctx: R05Context): RuleResult {
  const pallets = b.pallets.value;
  const gross = b.totalGrossWeight.value;
  const destCountry = b.destCountry.value;

  if (pallets == null || pallets <= 0) {
    return {
      ruleId: "R-05",
      ruleName: "Weight per pallet ≤ chosen carrier's max",
      status: "cannot-check",
      findings: [
        {
          ruleId: "R-05",
          ruleName: "Weight per pallet ≤ chosen carrier's max",
          severity: "incomplete",
          bookingId: b.id,
          sourceRow: b.sourceRow,
          message: "Cannot check: pallet count is missing, zero or invalid.",
          evidence: { pallets },
          whereFail: "Refused at collection",
        },
      ],
    };
  }
  if (gross == null) {
    return {
      ruleId: "R-05",
      ruleName: "Weight per pallet ≤ chosen carrier's max",
      status: "cannot-check",
      findings: [
        {
          ruleId: "R-05",
          ruleName: "Weight per pallet ≤ chosen carrier's max",
          severity: "incomplete",
          bookingId: b.id,
          sourceRow: b.sourceRow,
          message: "Cannot check: total gross weight is missing or invalid.",
          evidence: { gross },
          whereFail: "Refused at collection",
        },
      ],
    };
  }
  if (!destCountry) {
    return {
      ruleId: "R-05",
      ruleName: "Weight per pallet ≤ chosen carrier's max",
      status: "cannot-check",
      findings: [
        {
          ruleId: "R-05",
          ruleName: "Weight per pallet ≤ chosen carrier's max",
          severity: "incomplete",
          bookingId: b.id,
          sourceRow: b.sourceRow,
          message: "Cannot check: destination country unknown.",
          evidence: {},
          whereFail: "Refused at collection",
        },
      ],
    };
  }

  const perPallet = Math.round((gross / pallets) * 100) / 100;
  const options = optionsForRoute(destCountry);
  const eligibleCarriers = options.filter((o) => perPallet <= o.maxWeightPerPallet);

  if (eligibleCarriers.length === 0) {
    const minPalletsByCarrier = options.map((o) => ({
      carrier: o.carrier,
      service: o.service,
      minPallets: Math.ceil(gross / o.maxWeightPerPallet),
      totalCost: Math.ceil(gross / o.maxWeightPerPallet) * o.pricePerPallet,
    }));
    return {
      ruleId: "R-05",
      ruleName: "Weight per pallet ≤ chosen carrier's max",
      status: "fail",
      findings: [
        {
          ruleId: "R-05",
          ruleName: "Weight per pallet ≤ chosen carrier's max",
          severity: "red",
          bookingId: b.id,
          sourceRow: b.sourceRow,
          message: `No service on UK → ${destCountry} accepts ${perPallet} kg per pallet.`,
          evidence: { perPallet, gross, pallets, options: options.map((o) => ({ carrier: o.carrier, max: o.maxWeightPerPallet })) },
          whereFail: "Refused at collection",
          fix: {
            label: "Repack onto more pallets.",
            confidence: "needs-seller-confirmation",
            alternatives: minPalletsByCarrier.map((m) => ({
              description: `${m.carrier} needs ≥ ${m.minPallets} pallets (total £${m.totalCost}).`,
            })),
          },
        },
      ],
    };
  }

  // selectedCarrier check
  if (ctx.selectedCarrier) {
    if (perPallet > ctx.selectedCarrier.maxWeightPerPallet) {
      return {
        ruleId: "R-05",
        ruleName: "Weight per pallet ≤ chosen carrier's max",
        status: "fail",
        findings: [
          {
            ruleId: "R-05",
            ruleName: "Weight per pallet ≤ chosen carrier's max",
            severity: "red",
            bookingId: b.id,
            sourceRow: b.sourceRow,
            message: `${ctx.selectedCarrier.carrier} (${ctx.selectedCarrier.service}) accepts up to ${ctx.selectedCarrier.maxWeightPerPallet} kg per pallet; yours average ${perPallet} kg.`,
            evidence: { perPallet, max: ctx.selectedCarrier.maxWeightPerPallet },
            whereFail: "Refused at collection",
            fix: {
              label: "Switch to an eligible carrier, or add pallets.",
              confidence: "evidence-supported",
            },
          },
        ],
      };
    }
  }

  return { ruleId: "R-05", ruleName: "Weight per pallet ≤ chosen carrier's max", status: "pass", findings: [] };
}
