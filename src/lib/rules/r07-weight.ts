import { Booking } from "@/lib/booking/model";
import { RuleResult } from "./types";

export function r07(b: Booking): RuleResult {
  const gross = b.totalGrossWeight.value;
  if (gross == null) {
    return {
      ruleId: "R-07",
      ruleName: "Gross weight ≥ Σ(unit weight × quantity)",
      status: "cannot-check",
      findings: [
        {
          ruleId: "R-07",
          ruleName: "Gross weight ≥ Σ(unit weight × quantity)",
          severity: "incomplete",
          bookingId: b.id,
          sourceRow: b.sourceRow,
          message: "Cannot check: total gross weight is missing or invalid.",
          evidence: {},
          whereFail: "Weight discrepancy at collection or customs",
        },
      ],
    };
  }
  const perItem = b.items.map((it) => {
    const w = it.unitWeight.value;
    const q = it.quantity.value;
    return { sku: it.sku.value, w, q, line: w != null && q != null ? w * q : null };
  });
  if (perItem.some((x) => x.line == null)) {
    return {
      ruleId: "R-07",
      ruleName: "Gross weight ≥ Σ(unit weight × quantity)",
      status: "cannot-check",
      findings: [
        {
          ruleId: "R-07",
          ruleName: "Gross weight ≥ Σ(unit weight × quantity)",
          severity: "incomplete",
          bookingId: b.id,
          sourceRow: b.sourceRow,
          message: "Cannot check: at least one item has missing unit weight or quantity.",
          evidence: { perItem },
          whereFail: "Weight discrepancy at collection or customs",
        },
      ],
    };
  }
  const net = perItem.reduce((s, x) => s + (x.line as number), 0);
  if (gross >= net - 1e-9) {
    return { ruleId: "R-07", ruleName: "Gross weight ≥ Σ(unit weight × quantity)", status: "pass", findings: [] };
  }
  return {
    ruleId: "R-07",
    ruleName: "Gross weight ≥ Σ(unit weight × quantity)",
    status: "fail",
    findings: [
      {
        ruleId: "R-07",
        ruleName: "Gross weight ≥ Σ(unit weight × quantity)",
        severity: "amber",
        bookingId: b.id,
        sourceRow: b.sourceRow,
        message: `Gross weight ${gross} kg is less than net ${net.toFixed(2)} kg (unit weights × quantities).`,
        evidence: { gross, net, perItem },
        whereFail: "Weight discrepancy at collection or customs",
        fix: {
          label: `Increase gross weight to at least ${net.toFixed(2)} kg or review unit weights.`,
          confidence: "evidence-supported",
          action: { target: "booking", field: "totalGrossWeight", newValue: Math.ceil(net) },
        },
      },
    ],
  };
}
