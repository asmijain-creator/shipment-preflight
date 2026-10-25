import { Booking } from "@/lib/booking/model";
import { CarrierOption } from "@/config/rate-card";
import { r01 } from "./r01-hs";
import { r02 } from "./r02-declared-value";
import { r03 } from "./r03-item-math";
import { r04 } from "./r04-booking-cartons";
import { r05 } from "./r05-pallet-weight";
import { r06 } from "./r06-dangerous-goods";
import { r07 } from "./r07-weight";
import { r08 } from "./r08-appointment";
import { r09 } from "./r09-origin";
import { r10 } from "./r10-ready-date";
import { RuleResult } from "./types";

export type EngineInput = {
  booking: Booking;
  selectedCarrier: CarrierOption | null;
  today?: string;
};

export function runRules({ booking, selectedCarrier, today }: EngineInput): RuleResult[] {
  return [
    r01(booking),
    r02(booking),
    r03(booking),
    r04(booking),
    r05(booking, { selectedCarrier }),
    r06(booking),
    r07(booking),
    r08(booking),
    r09(booking),
    r10(booking, today),
  ];
}
