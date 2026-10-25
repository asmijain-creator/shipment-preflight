import { Booking } from "./booking/model";
import { runRules } from "./rules/engine";
import { recommendCarrier, CarrierDecision } from "./carrier/recommend";
import { repackScenarios, RepackScenario } from "./carrier/repack";
import { decideVerdict, VerdictOutcome, nextStepsText } from "./verdict";
import { istToday } from "./parsing/dates";

export type AnalyzedBooking = {
  booking: Booking;
  carrier: CarrierDecision;
  repackScenarios: RepackScenario[];
  outcome: VerdictOutcome;
  nextSteps: string;
  today: string;
};

export function analyzeBooking(b: Booking): AnalyzedBooking {
  const today = istToday();
  const carrier = recommendCarrier(b);
  const selectedOpt = carrier.recommended?.option ?? null;
  const ruleResults = runRules({ booking: b, selectedCarrier: selectedOpt, today });
  const outcome = decideVerdict(ruleResults);
  const repack = carrier.recommended ? [] : repackScenarios(b);
  const nextSteps = nextStepsText(b, carrier, outcome);
  return { booking: b, carrier, repackScenarios: repack, outcome, nextSteps, today };
}
