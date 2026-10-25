import { describe, expect, it } from "vitest";
import { makeBooking, makeItem } from "./fixtures";
import { r01 } from "@/lib/rules/r01-hs";
import { r02 } from "@/lib/rules/r02-declared-value";
import { r03 } from "@/lib/rules/r03-item-math";
import { r04 } from "@/lib/rules/r04-booking-cartons";
import { r05 } from "@/lib/rules/r05-pallet-weight";
import { r06 } from "@/lib/rules/r06-dangerous-goods";
import { r07 } from "@/lib/rules/r07-weight";
import { r08 } from "@/lib/rules/r08-appointment";
import { r09 } from "@/lib/rules/r09-origin";
import { r10 } from "@/lib/rules/r10-ready-date";
import { fv } from "@/lib/booking/model";
import { optionsForRoute } from "@/config/rate-card";

describe("R-01 HS code", () => {
  it("passes 6 digits", () => expect(r01(makeBooking()).status).toBe("pass"));
  it("fails blank", () => {
    const b = makeBooking({ items: [makeItem({ hsCode: fv<string>(null, null, "missing") })] });
    expect(r01(b).status).toBe("fail");
  });
  it("flags 5 digits with leading-zero note", () => {
    const b = makeBooking({ items: [makeItem({ hsCode: fv("69120", "69120") })] });
    const res = r01(b);
    expect(res.status).toBe("fail");
    expect(res.findings[0].message).toMatch(/leading 0/);
  });
  it("passes 6-digit numeric via dot form 6912.00", () => {
    // The parser normalises; here simulate normalised form
    const b = makeBooking({ items: [makeItem({ hsCode: fv("6912.00", "691200") })] });
    expect(r01(b).status).toBe("pass");
  });
});

describe("R-02 declared value", () => {
  it("passes exact match", () => expect(r02(makeBooking()).status).toBe("pass"));
  it("passes within exactly 1%", () => {
    // calc = 5400; declared = 5346 => diff = 54 = exactly 1%
    const b = makeBooking({ totalDeclaredValue: fv(5346, 5346) });
    expect(r02(b).status).toBe("pass");
  });
  it("fails above 1%", () => {
    const b = makeBooking({ totalDeclaredValue: fv(5344, 5344) }); // diff 56 = 1.037%
    expect(r02(b).status).toBe("fail");
  });
  it("passes 0 and 0", () => {
    const b = makeBooking({
      totalDeclaredValue: fv(0, 0),
      items: [makeItem({ quantity: fv(0, 0), unitPrice: fv(0, 0), unitsPerCarton: fv(0, 0), cartons: fv(0, 0) })],
    });
    expect(r02(b).status).toBe("pass");
  });
});

describe("R-03 item math", () => {
  it("passes 12 × 90 = 1080", () => expect(r03(makeBooking()).status).toBe("pass"));
  it("fails on mismatch", () => {
    const b = makeBooking({ items: [makeItem({ quantity: fv(1000, 1000) })] });
    expect(r03(b).status).toBe("fail");
  });
});

describe("R-04 booking cartons", () => {
  it("passes when equal", () => expect(r04(makeBooking()).status).toBe("pass"));
  it("fails when unequal", () => {
    const b = makeBooking({ cartons: fv(100, 100) });
    expect(r04(b).status).toBe("fail");
  });
});

describe("R-05 pallet weight", () => {
  const germanyA = optionsForRoute("Germany").find((o) => o.carrier === "Carrier A")!;
  const germanyB = optionsForRoute("Germany").find((o) => o.carrier === "Carrier B")!;
  const germanyC = optionsForRoute("Germany").find((o) => o.carrier === "Carrier C")!;

  it("passes 500 kg against A (500 limit, equal passes)", () => {
    const b = makeBooking({ pallets: fv(1, 1), totalGrossWeight: fv(500, 500) });
    expect(r05(b, { selectedCarrier: germanyA }).status).toBe("pass");
  });
  it("fails 450 kg against C (400 limit)", () => {
    const b = makeBooking({ pallets: fv(1, 1), totalGrossWeight: fv(450, 450) });
    expect(r05(b, { selectedCarrier: germanyC }).status).toBe("fail");
  });
  it("passes 750 kg against B", () => {
    const b = makeBooking({ pallets: fv(1, 1), totalGrossWeight: fv(750, 750) });
    expect(r05(b, { selectedCarrier: germanyB }).status).toBe("pass");
  });
  it("fails 812 against any (no eligible)", () => {
    const b = makeBooking({ pallets: fv(1, 1), totalGrossWeight: fv(812, 812) });
    expect(r05(b, { selectedCarrier: null }).status).toBe("fail");
  });
  it("cannot check when pallets 0", () => {
    const b = makeBooking({ pallets: fv(0, 0) });
    expect(r05(b, { selectedCarrier: null }).status).toBe("cannot-check");
  });
});

describe("R-06 dangerous goods", () => {
  it("passes 'Battery-free LED candle'", () => {
    const b = makeBooking({ items: [makeItem({ description: fv("Battery-free LED candle", "Battery-free LED candle") })] });
    expect(r06(b).status).toBe("pass");
  });
  it("passes 'Phone case'", () => {
    const b = makeBooking({ items: [makeItem({ description: fv("Phone case", "Phone case") })] });
    expect(r06(b).status).toBe("pass");
  });
  it("passes 'Perfume bottle, empty'", () => {
    const b = makeBooking({ items: [makeItem({ description: fv("Perfume bottle, empty", "Perfume bottle, empty") })] });
    expect(r06(b).status).toBe("pass");
  });
  it("fails 'Lithium-ion power bank'", () => {
    const b = makeBooking({ items: [makeItem({ description: fv("Lithium-ion power bank", "Lithium-ion power bank") })] });
    expect(r06(b).status).toBe("fail");
  });
  it("fails 'Nail polish remover'", () => {
    const b = makeBooking({ items: [makeItem({ description: fv("Nail polish remover", "Nail polish remover") })] });
    expect(r06(b).status).toBe("fail");
  });
  it("flags 'Bluetooth speaker' needs confirmation", () => {
    const b = makeBooking({ items: [makeItem({ description: fv("Bluetooth speaker", "Bluetooth speaker") })] });
    const res = r06(b);
    expect(res.status).toBe("fail");
    expect(res.findings[0].message).toMatch(/Needs seller confirmation/);
  });
});

describe("R-07 weight", () => {
  it("passes equal", () => {
    // 0.5 * 1080 = 540; set gross = 540
    const b = makeBooking({ totalGrossWeight: fv(540, 540) });
    expect(r07(b).status).toBe("pass");
  });
  it("fails under net", () => {
    const b = makeBooking({ totalGrossWeight: fv(100, 100) });
    expect(r07(b).status).toBe("fail");
  });
});

describe("R-08 appointment", () => {
  it("passes Warehouse + Yes", () => expect(r08(makeBooking()).status).toBe("pass"));
  it("fails Warehouse + No", () => {
    const b = makeBooking({ deliveryAppointment: fv("No", "No") });
    expect(r08(b).status).toBe("fail");
  });
  it("na for Business address", () => {
    const b = makeBooking({ destinationType: fv("Business address", "Business address"), deliveryAppointment: fv("No", "No") });
    expect(r08(b).status).toBe("na");
  });
});

describe("R-09 origin", () => {
  it("passes when all set", () => expect(r09(makeBooking()).status).toBe("pass"));
  it("fails when missing", () => {
    const b = makeBooking({ items: [makeItem({ countryOfOrigin: fv<string>(null, null, "missing") })] });
    expect(r09(b).status).toBe("fail");
  });
});

describe("R-10 ready date", () => {
  it("passes today", () => expect(r10(makeBooking({ readyDate: fv("today", "2026-10-26") }), "2026-10-26").status).toBe("pass"));
  it("fails yesterday", () => expect(r10(makeBooking({ readyDate: fv("y", "2026-10-25") }), "2026-10-26").status).toBe("fail"));
  it("passes future", () => expect(r10(makeBooking({ readyDate: fv("f", "2026-11-05") }), "2026-10-26").status).toBe("pass"));
});
