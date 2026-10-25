import { Booking } from "@/lib/booking/model";
import { Finding, RuleResult } from "./types";
import { toPence } from "@/lib/parsing/numbers";

export function r02(b: Booking): RuleResult {
  const findings: Finding[] = [];
  if (b.totalDeclaredValue.value == null) {
    return {
      ruleId: "R-02",
      ruleName: "Declared value matches Σ(quantity × unit price)",
      status: "cannot-check",
      findings: [
        {
          ruleId: "R-02",
          ruleName: "Declared value matches Σ(quantity × unit price)",
          severity: "incomplete",
          bookingId: b.id,
          sourceRow: b.sourceRow,
          message: "Cannot check: total declared value is missing or invalid.",
          evidence: { declaredRaw: b.totalDeclaredValue.raw },
          whereFail: "Customs hold / valuation query",
        },
      ],
    };
  }

  const perItem = b.items.map((it) => {
    const q = it.quantity.value;
    const p = it.unitPrice.value;
    const line = q != null && p != null ? q * p : null;
    return { sku: it.sku.value, qty: q, price: p, line };
  });

  if (perItem.some((x) => x.line == null)) {
    return {
      ruleId: "R-02",
      ruleName: "Declared value matches Σ(quantity × unit price)",
      status: "cannot-check",
      findings: [
        {
          ruleId: "R-02",
          ruleName: "Declared value matches Σ(quantity × unit price)",
          severity: "incomplete",
          bookingId: b.id,
          sourceRow: b.sourceRow,
          message: "Cannot check: at least one item has missing quantity or unit price.",
          evidence: { perItem },
          whereFail: "Customs hold / valuation query",
        },
      ],
    };
  }

  const calc = perItem.reduce((s, x) => s + (x.line as number), 0);
  const declared = b.totalDeclaredValue.value;

  if (calc === 0 && declared === 0) {
    return { ruleId: "R-02", ruleName: "Declared value matches Σ(quantity × unit price)", status: "pass", findings };
  }
  if (calc === 0 && declared !== 0) {
    findings.push({
      ruleId: "R-02",
      ruleName: "Declared value matches Σ(quantity × unit price)",
      severity: "red",
      bookingId: b.id,
      sourceRow: b.sourceRow,
      message: `Declared value is £${declared.toFixed(2)} but calculated total from items is £0.00.`,
      evidence: { declared, calc, perItem },
      whereFail: "Customs hold / valuation query",
      fix: {
        label: `Set declared value to £0.00 or review item prices and quantities.`,
        confidence: "needs-seller-confirmation",
      },
    });
    return { ruleId: "R-02", ruleName: "Declared value matches Σ(quantity × unit price)", status: "fail", findings };
  }

  const declaredPence = toPence(declared);
  const calcPence = toPence(calc);
  const diffPence = Math.abs(declaredPence - calcPence);
  // tolerance 1% of calc, exact equality passes
  const tolPence = calcPence * 0.01; // allow fractional pence as threshold

  if (diffPence <= tolPence + 1e-9) {
    return { ruleId: "R-02", ruleName: "Declared value matches Σ(quantity × unit price)", status: "pass", findings };
  }

  findings.push({
    ruleId: "R-02",
    ruleName: "Declared value matches Σ(quantity × unit price)",
    severity: "red",
    bookingId: b.id,
    sourceRow: b.sourceRow,
    message: `Declared value £${declared.toFixed(2)} differs from calculated £${calc.toFixed(2)} by ${((diffPence / calcPence) * 100).toFixed(2)}%.`,
    evidence: {
      declared,
      calc,
      diffPct: diffPence / calcPence,
      perItem,
      formula: "Σ(quantity × unit price)",
    },
    whereFail: "Customs hold / valuation query",
    fix: {
      label: `Set declared value to £${calc.toFixed(2)} (sum of item lines).`,
      confidence: "arithmetic-correction",
      action: { target: "booking", field: "totalDeclaredValue", newValue: calc },
    },
  });
  return { ruleId: "R-02", ruleName: "Declared value matches Σ(quantity × unit price)", status: "fail", findings };
}
