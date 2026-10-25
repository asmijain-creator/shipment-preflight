import { Booking } from "@/lib/booking/model";
import { Finding, RuleResult } from "./types";

export function r09(b: Booking): RuleResult {
  const findings: Finding[] = [];
  let anyFail = false;
  for (const it of b.items) {
    if (it.countryOfOrigin.value == null) {
      anyFail = true;
      findings.push({
        ruleId: "R-09",
        ruleName: "Every item has a country of origin",
        severity: "amber",
        bookingId: b.id,
        itemInternalId: it.internalId,
        sku: it.sku.value,
        sourceRow: it.sourceRow,
        message: "Country of origin is missing.",
        evidence: { raw: it.countryOfOrigin.raw },
        whereFail: "Customs query",
        fix: {
          label: "Enter the country of origin (where the product was made).",
          confidence: "needs-seller-confirmation",
        },
      });
    }
  }
  return {
    ruleId: "R-09",
    ruleName: "Every item has a country of origin",
    status: anyFail ? "fail" : "pass",
    findings,
  };
}
