import { Booking } from "@/lib/booking/model";
import { Finding, RuleResult } from "./types";

export function r03(b: Booking): RuleResult {
  const findings: Finding[] = [];
  let anyFail = false;
  let anyCannotCheck = false;

  for (const it of b.items) {
    const qty = it.quantity.value;
    const upc = it.unitsPerCarton.value;
    const cartons = it.cartons.value;
    if (qty == null || upc == null || cartons == null) {
      anyCannotCheck = true;
      findings.push({
        ruleId: "R-03",
        ruleName: "Per item: units per carton × cartons = quantity",
        severity: "incomplete",
        bookingId: b.id,
        itemInternalId: it.internalId,
        sku: it.sku.value,
        sourceRow: it.sourceRow,
        message: "Cannot check: missing quantity, units per carton or cartons.",
        evidence: { qty, upc, cartons },
        whereFail: "Units reported missing at the warehouse",
      });
      continue;
    }
    if (upc * cartons !== qty) {
      anyFail = true;
      const candidates: Array<{ field: string; value: number; viable: boolean }> = [];
      candidates.push({ field: "quantity", value: upc * cartons, viable: true });
      if (upc > 0 && qty % upc === 0) candidates.push({ field: "cartons", value: qty / upc, viable: true });
      if (cartons > 0 && qty % cartons === 0) candidates.push({ field: "unitsPerCarton", value: qty / cartons, viable: true });

      findings.push({
        ruleId: "R-03",
        ruleName: "Per item: units per carton × cartons = quantity",
        severity: "red",
        bookingId: b.id,
        itemInternalId: it.internalId,
        sku: it.sku.value,
        sourceRow: it.sourceRow,
        message: `${upc} × ${cartons} = ${upc * cartons}, but quantity is ${qty}.`,
        evidence: { qty, upc, cartons, product: upc * cartons, candidates },
        whereFail: "Units reported missing at the warehouse",
        fix: {
          label: "Correct one of: quantity, units per carton or cartons.",
          confidence: "needs-seller-confirmation",
          alternatives: candidates.map((c) => ({
            description: `Set ${labelOf(c.field)} to ${c.value}`,
            action: { target: "item", itemInternalId: it.internalId, field: c.field, newValue: c.value },
          })),
        },
      });
    }
  }

  return {
    ruleId: "R-03",
    ruleName: "Per item: units per carton × cartons = quantity",
    status: anyFail ? "fail" : anyCannotCheck ? "cannot-check" : "pass",
    findings,
  };
}

function labelOf(field: string): string {
  if (field === "quantity") return "quantity";
  if (field === "cartons") return "cartons";
  if (field === "unitsPerCarton") return "units per carton";
  return field;
}
