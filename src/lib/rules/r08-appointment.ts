import { Booking } from "@/lib/booking/model";
import { RuleResult } from "./types";

export function r08(b: Booking): RuleResult {
  const type = b.destinationType.value;
  if (type !== "Warehouse") {
    return {
      ruleId: "R-08",
      ruleName: "Warehouse deliveries have a booked appointment",
      status: type === "Business address" ? "na" : "cannot-check",
      findings: type === "Business address" ? [] : [
        {
          ruleId: "R-08",
          ruleName: "Warehouse deliveries have a booked appointment",
          severity: "incomplete",
          bookingId: b.id,
          sourceRow: b.sourceRow,
          message: "Cannot check: destination type is missing.",
          evidence: {},
          whereFail: "Turned away at the warehouse dock",
        },
      ],
    };
  }
  const appt = b.deliveryAppointment.value;
  if (appt === "Yes") {
    return { ruleId: "R-08", ruleName: "Warehouse deliveries have a booked appointment", status: "pass", findings: [] };
  }
  if (appt == null) {
    return {
      ruleId: "R-08",
      ruleName: "Warehouse deliveries have a booked appointment",
      status: "cannot-check",
      findings: [
        {
          ruleId: "R-08",
          ruleName: "Warehouse deliveries have a booked appointment",
          severity: "incomplete",
          bookingId: b.id,
          sourceRow: b.sourceRow,
          message: "Cannot check: delivery appointment status is missing.",
          evidence: {},
          whereFail: "Turned away at the warehouse dock",
        },
      ],
    };
  }
  return {
    ruleId: "R-08",
    ruleName: "Warehouse deliveries have a booked appointment",
    status: "fail",
    findings: [
      {
        ruleId: "R-08",
        ruleName: "Warehouse deliveries have a booked appointment",
        severity: "amber",
        bookingId: b.id,
        sourceRow: b.sourceRow,
        message: "Warehouse delivery without a booked appointment.",
        evidence: { destinationType: type, appointment: appt },
        whereFail: "Turned away at the warehouse dock",
        fix: {
          label: "Book a delivery appointment at the receiving warehouse before dispatch.",
          confidence: "needs-seller-confirmation",
        },
      },
    ],
  };
}
