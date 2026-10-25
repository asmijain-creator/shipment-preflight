import { describe, expect, it } from "vitest";
import { makeBooking } from "./fixtures";
import { fv } from "@/lib/booking/model";
import { recommendCarrier } from "@/lib/carrier/recommend";

describe("Carrier recommendations", () => {
  it("Cheapest at ≤400 kg → Carrier A", () => {
    const b = makeBooking({ pallets: fv(1, 1), totalGrossWeight: fv(400, 400), sellerPriority: fv("Cheapest", "Cheapest") });
    const r = recommendCarrier(b);
    expect(r.recommended?.option.carrier).toBe("Carrier A");
  });
  it("Fastest at ≤400 kg → Carrier C", () => {
    const b = makeBooking({ pallets: fv(1, 1), totalGrossWeight: fv(400, 400), sellerPriority: fv("Fastest", "Fastest") });
    const r = recommendCarrier(b);
    expect(r.recommended?.option.carrier).toBe("Carrier C");
  });
  it("Most reliable at ≤400 kg → Carrier C (98%)", () => {
    const b = makeBooking({ pallets: fv(1, 1), totalGrossWeight: fv(400, 400), sellerPriority: fv("Most reliable", "Most reliable") });
    const r = recommendCarrier(b);
    expect(r.recommended?.option.carrier).toBe("Carrier C");
  });
  it("Balanced at ≤400 kg → Carrier B (minimax)", () => {
    const b = makeBooking({ pallets: fv(1, 1), totalGrossWeight: fv(400, 400), sellerPriority: fv("Balanced", "Balanced") });
    const r = recommendCarrier(b);
    expect(r.recommended?.option.carrier).toBe("Carrier B");
  });
  it("Balanced at 500 kg (A,B eligible) → Carrier B (total regret tiebreak)", () => {
    const b = makeBooking({ pallets: fv(1, 1), totalGrossWeight: fv(500, 500), sellerPriority: fv("Balanced", "Balanced") });
    const r = recommendCarrier(b);
    expect(r.recommended?.option.carrier).toBe("Carrier B");
  });
  it("Balanced at 750 kg (B only) → Carrier B", () => {
    const b = makeBooking({ pallets: fv(1, 1), totalGrossWeight: fv(750, 750), sellerPriority: fv("Balanced", "Balanced") });
    const r = recommendCarrier(b);
    expect(r.recommended?.option.carrier).toBe("Carrier B");
  });
  it("Cheapest at 620 kg / 3 pallets (~207 kg/pallet) → all eligible, A cheapest", () => {
    const b = makeBooking({ pallets: fv(3, 3), totalGrossWeight: fv(620, 620), sellerPriority: fv("Cheapest", "Cheapest") });
    const r = recommendCarrier(b);
    expect(r.recommended?.option.carrier).toBe("Carrier A");
    expect(r.recommended?.totalCost).toBe(180 * 3);
  });
  it("No eligible when >750 kg/pallet", () => {
    const b = makeBooking({ pallets: fv(1, 1), totalGrossWeight: fv(812, 812) });
    const r = recommendCarrier(b);
    expect(r.recommended).toBeNull();
  });
});
