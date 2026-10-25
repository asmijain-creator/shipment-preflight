import { Booking } from "@/lib/booking/model";
import { Finding, RuleResult } from "./types";
import { R06_CLEAR_MATCHES, R06_EXCLUSIONS, R06_NEEDS_CONFIRM } from "@/config/r06-phrases";

function containsPhrase(text: string, phrase: string): boolean {
  const t = text.toLowerCase();
  const p = phrase.toLowerCase();
  if (!t.includes(p)) return false;
  // whole-ish word boundary: ensure non-letter boundary
  const idx = t.indexOf(p);
  const before = idx === 0 ? "" : t[idx - 1];
  const after = idx + p.length >= t.length ? "" : t[idx + p.length];
  const isBoundary = (ch: string) => ch === "" || !/[a-z0-9]/.test(ch);
  return isBoundary(before) && isBoundary(after);
}

export function r06(b: Booking): RuleResult {
  const findings: Finding[] = [];
  let anyFail = false;

  for (const it of b.items) {
    const desc = (it.description.value ?? "").trim();
    if (!desc) continue;
    const lower = desc.toLowerCase();

    // Check exclusions first
    const excluded = R06_EXCLUSIONS.some((ex) => lower.includes(ex.toLowerCase()));
    if (excluded) continue;

    let matched: { category: string; phrase: string } | null = null;
    for (const [cat, list] of Object.entries(R06_CLEAR_MATCHES)) {
      for (const phrase of list) {
        if (containsPhrase(desc, phrase)) {
          matched = { category: cat, phrase };
          break;
        }
      }
      if (matched) break;
    }
    if (matched) {
      anyFail = true;
      findings.push({
        ruleId: "R-06",
        ruleName: "No lithium batteries, aerosols or flammable liquids",
        severity: "red",
        bookingId: b.id,
        itemInternalId: it.internalId,
        sku: it.sku.value,
        sourceRow: it.sourceRow,
        message: `Description "${desc}" matches restricted category ${matched.category} (phrase: "${matched.phrase}").`,
        evidence: { description: desc, category: matched.category, matchedPhrase: matched.phrase },
        whereFail: "Refused at collection",
        matchedPhrase: matched.phrase,
        fix: {
          label: "Remove this item, repackage without the restricted content, or book a dangerous-goods service (not supported here).",
          confidence: "needs-seller-confirmation",
        },
      });
      continue;
    }

    const confirmMatch = R06_NEEDS_CONFIRM.find((p) => containsPhrase(desc, p));
    if (confirmMatch) {
      anyFail = true;
      findings.push({
        ruleId: "R-06",
        ruleName: "No lithium batteries, aerosols or flammable liquids",
        severity: "red",
        bookingId: b.id,
        itemInternalId: it.internalId,
        sku: it.sku.value,
        sourceRow: it.sourceRow,
        message: `"${desc}" likely contains a lithium battery. Needs seller confirmation.`,
        evidence: { description: desc, matchedPhrase: confirmMatch },
        whereFail: "Refused at collection",
        matchedPhrase: confirmMatch,
        fix: {
          label: 'Confirm "no battery included" to clear, or declare for dangerous-goods handling.',
          confidence: "needs-seller-confirmation",
        },
      });
    }
  }

  return {
    ruleId: "R-06",
    ruleName: "No lithium batteries, aerosols or flammable liquids",
    status: anyFail ? "fail" : "pass",
    findings,
  };
}
