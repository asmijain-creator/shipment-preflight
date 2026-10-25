import { Booking } from "@/lib/booking/model";
import { Finding, RuleResult } from "./types";

export function r01(b: Booking): RuleResult {
  const findings: Finding[] = [];
  let anyFail = false;
  let anyCannotCheck = false;

  for (const item of b.items) {
    const raw = item.hsCode.raw;
    const digits = item.hsCode.value;
    if (!digits && (raw == null || raw === "")) {
      findings.push({
        ruleId: "R-01",
        ruleName: "HS code present and ≥ 6 digits",
        severity: "red",
        bookingId: b.id,
        itemInternalId: item.internalId,
        sku: item.sku.value,
        sourceRow: item.sourceRow,
        message: "HS code missing.",
        evidence: { raw },
        whereFail: "Customs hold",
        fix: {
          label: "Enter the 6-digit (or longer) HS code for this product.",
          confidence: "needs-seller-confirmation",
        },
      });
      anyFail = true;
      continue;
    }
    if (!digits || !/^\d+$/.test(digits)) {
      findings.push({
        ruleId: "R-01",
        ruleName: "HS code present and ≥ 6 digits",
        severity: "red",
        bookingId: b.id,
        itemInternalId: item.internalId,
        sku: item.sku.value,
        sourceRow: item.sourceRow,
        message: "HS code is not numeric.",
        evidence: { raw },
        whereFail: "Customs hold",
        fix: {
          label: "Replace with the correct numeric HS code (6+ digits).",
          confidence: "needs-seller-confirmation",
        },
      });
      anyFail = true;
      continue;
    }
    if (digits.length < 6) {
      const note =
        digits.length === 5
          ? "This may be a 6-digit code that lost its leading 0 in Excel; confirm the correct code."
          : "HS code must be at least 6 digits.";
      findings.push({
        ruleId: "R-01",
        ruleName: "HS code present and ≥ 6 digits",
        severity: "red",
        bookingId: b.id,
        itemInternalId: item.internalId,
        sku: item.sku.value,
        sourceRow: item.sourceRow,
        message: `HS code "${digits}" has only ${digits.length} digits. ${note}`,
        evidence: { raw, digits, length: digits.length },
        whereFail: "Customs hold",
        fix: {
          label: "Confirm the correct HS code (6+ digits). Do not auto-pad.",
          confidence: "needs-seller-confirmation",
        },
      });
      anyFail = true;
    }
  }

  if (b.items.length === 0) anyCannotCheck = true;

  return {
    ruleId: "R-01",
    ruleName: "HS code present and ≥ 6 digits",
    status: anyFail ? "fail" : anyCannotCheck ? "cannot-check" : "pass",
    findings,
  };
}
