import { Booking } from "@/lib/booking/model";
import { RuleResult } from "./types";
import { compareIso, istToday } from "@/lib/parsing/dates";

export function r10(b: Booking, today?: string): RuleResult {
  const t = today ?? istToday();
  const d = b.readyDate.value;
  if (!d) {
    return {
      ruleId: "R-10",
      ruleName: "Ready-to-ship date not in the past",
      status: "cannot-check",
      findings: [
        {
          ruleId: "R-10",
          ruleName: "Ready-to-ship date not in the past",
          severity: "incomplete",
          bookingId: b.id,
          sourceRow: b.sourceRow,
          message: "Cannot check: ready-to-ship date is missing or invalid.",
          evidence: { raw: b.readyDate.raw },
          whereFail: "Collection cannot happen as booked",
        },
      ],
    };
  }
  if (compareIso(d, t) < 0) {
    return {
      ruleId: "R-10",
      ruleName: "Ready-to-ship date not in the past",
      status: "fail",
      findings: [
        {
          ruleId: "R-10",
          ruleName: "Ready-to-ship date not in the past",
          severity: "amber",
          bookingId: b.id,
          sourceRow: b.sourceRow,
          message: `Ready date ${d} is before today (${t} IST).`,
          evidence: { readyDate: d, today: t },
          whereFail: "Collection cannot happen as booked",
          fix: {
            label: "Update the ready-to-ship date to today or later.",
            confidence: "needs-seller-confirmation",
          },
        },
      ],
    };
  }
  return { ruleId: "R-10", ruleName: "Ready-to-ship date not in the past", status: "pass", findings: [] };
}
