import { Booking } from "@/lib/booking/model";
import { Finding, RuleResult } from "./types";

export function r04(b: Booking): RuleResult {
  if (b.cartons.value == null) {
    return {
      ruleId: "R-04",
      ruleName: "Booking cartons = Σ item cartons",
      status: "cannot-check",
      findings: [
        {
          ruleId: "R-04",
          ruleName: "Booking cartons = Σ item cartons",
          severity: "incomplete",
          bookingId: b.id,
          sourceRow: b.sourceRow,
          message: "Cannot check: booking carton total missing or invalid.",
          evidence: { raw: b.cartons.raw },
          whereFail: "Carton count mismatch at the warehouse",
        },
      ],
    };
  }
  const itemCartons = b.items.map((it) => it.cartons.value);
  if (itemCartons.some((c) => c == null)) {
    return {
      ruleId: "R-04",
      ruleName: "Booking cartons = Σ item cartons",
      status: "cannot-check",
      findings: [
        {
          ruleId: "R-04",
          ruleName: "Booking cartons = Σ item cartons",
          severity: "incomplete",
          bookingId: b.id,
          sourceRow: b.sourceRow,
          message: "Cannot check: at least one item has missing cartons.",
          evidence: { itemCartons },
          whereFail: "Carton count mismatch at the warehouse",
        },
      ],
    };
  }
  const sum = (itemCartons as number[]).reduce((s, c) => s + c, 0);
  if (sum !== b.cartons.value) {
    return {
      ruleId: "R-04",
      ruleName: "Booking cartons = Σ item cartons",
      status: "fail",
      findings: [
        {
          ruleId: "R-04",
          ruleName: "Booking cartons = Σ item cartons",
          severity: "red",
          bookingId: b.id,
          sourceRow: b.sourceRow,
          message: `Booking total is ${b.cartons.value} cartons; items sum to ${sum}.`,
          evidence: { bookingCartons: b.cartons.value, itemCartons, sum },
          whereFail: "Carton count mismatch at the warehouse",
          fix: {
            label: `Set booking cartons to ${sum} (sum of item cartons).`,
            confidence: "arithmetic-correction",
            action: { target: "booking", field: "cartons", newValue: sum },
          },
        },
      ],
    };
  }
  return { ruleId: "R-04", ruleName: "Booking cartons = Σ item cartons", status: "pass", findings: [] };
}
