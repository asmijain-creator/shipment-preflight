import { Booking } from "./booking/model";
import { Finding, RuleResult } from "./rules/types";
import { CarrierDecision, estimatedDelivery } from "./carrier/recommend";
import { formatHumanDate } from "./parsing/dates";

export type Verdict = "blocked" | "incomplete" | "warnings" | "passed";

export type VerdictOutcome = {
  verdict: Verdict;
  label: string;
  redFindings: Finding[];
  amberFindings: Finding[];
  incompleteFindings: Finding[];
  allFindings: Finding[];
  ruleResults: RuleResult[];
};

export function decideVerdict(ruleResults: RuleResult[]): VerdictOutcome {
  const allFindings = ruleResults.flatMap((r) => r.findings);
  const redFindings = allFindings.filter((f) => f.severity === "red");
  const amberFindings = allFindings.filter((f) => f.severity === "amber");
  const incompleteFindings = allFindings.filter((f) => f.severity === "incomplete");

  let verdict: Verdict;
  let label: string;
  if (redFindings.length > 0) {
    verdict = "blocked";
    label = `Blocked: ${redFindings.length} issue${redFindings.length === 1 ? "" : "s"} must be fixed before this shipment can go.`;
  } else if (incompleteFindings.length > 0) {
    verdict = "incomplete";
    label = `Incomplete: ${incompleteFindings.length} detail${incompleteFindings.length === 1 ? "" : "s"} needed.`;
  } else if (amberFindings.length > 0) {
    verdict = "warnings";
    label = `Pre-flight checks passed with ${amberFindings.length} warning${amberFindings.length === 1 ? "" : "s"}.`;
  } else {
    verdict = "passed";
    label = "Pre-flight checks passed: ready for booking.";
  }

  return { verdict, label, redFindings, amberFindings, incompleteFindings, allFindings, ruleResults };
}

export function nextStepsText(b: Booking, dec: CarrierDecision, outcome: VerdictOutcome): string {
  const parts: string[] = [];
  const seller = b.sellerName.value ?? "The seller";
  const route = `${b.originCity.value ?? "?"}, ${b.originCountry.value ?? "UK"} → ${b.destCity.value ?? "?"}, ${b.destCountry.value ?? "?"}`;
  parts.push(`${seller} ships ${b.pallets.value ?? "?"} pallet(s) / ${b.cartons.value ?? "?"} cartons, ${b.totalGrossWeight.value ?? "?"} kg, declared £${b.totalDeclaredValue.value?.toFixed(2) ?? "?"}, from ${route}.`);
  const rec = dec.recommended;
  if (rec) {
    const ed = estimatedDelivery(b.readyDate.value, rec.option);
    parts.push(`Carrier: ${rec.option.carrier} ${rec.option.service} — £${rec.totalCost}, ${rec.option.transitDays} day transit, ${rec.option.onTimeRate}% on-time.`);
    if (b.readyDate.value) {
      parts.push(`Collection: ${formatHumanDate(b.readyDate.value)}. Estimated delivery: ${ed ?? "n/a"}.`);
    }
  }
  if (b.destinationType.value === "Warehouse") {
    parts.push("For warehouse delivery, the delivery appointment must cover the estimated arrival date.");
  }
  if (outcome.verdict === "warnings" && outcome.amberFindings.length > 0) {
    parts.push(`Acknowledged warnings: ${outcome.amberFindings.map((f) => f.ruleId).join(", ")}.`);
  }
  if (outcome.verdict === "blocked" || outcome.verdict === "incomplete") {
    parts.push("This is a provisional summary; the shipment becomes Ready for booking once blocking issues are fixed.");
  }
  return parts.join(" ");
}
