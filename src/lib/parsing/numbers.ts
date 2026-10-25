export function parseNumber(input: unknown): number | null {
  if (input == null || input === "") return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input === "string") {
    const cleaned = input.replace(/[£$€,\s]/g, "").trim();
    if (cleaned === "") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parseInteger(input: unknown): number | null {
  const n = parseNumber(input);
  if (n == null) return null;
  if (!Number.isInteger(n)) return null;
  return n;
}

export function toPence(gbp: number): number {
  return Math.round(gbp * 100);
}

export function normalizeHsCode(input: unknown): { digits: string; raw: string } | null {
  if (input == null || input === "") return null;
  let s: string;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    s = Number.isInteger(input) ? String(input) : String(input);
  } else if (typeof input === "string") {
    s = input;
  } else {
    return null;
  }
  const raw = String(s);
  const digits = raw.replace(/[\s.]/g, "");
  return { digits, raw };
}

export function cleanText(input: unknown): string | null {
  if (input == null) return null;
  const s = String(input).trim();
  return s === "" ? null : s;
}
