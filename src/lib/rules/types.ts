export type Severity = "red" | "amber" | "incomplete" | "info" | "pass" | "na";

export type FixConfidence =
  | "arithmetic-correction"
  | "evidence-supported"
  | "needs-seller-confirmation";

export type Fix = {
  label: string;
  confidence: FixConfidence;
  action?: {
    target: "booking" | "item";
    itemInternalId?: string;
    field: string;
    newValue: unknown;
  };
  resolvesOtherRules?: string[];
  alternatives?: Array<{ description: string; action?: Fix["action"] }>;
};

export type Finding = {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  bookingId: string;
  itemInternalId?: string;
  sku?: string | null;
  sourceRow?: number | null;
  message: string;
  evidence: Record<string, unknown>;
  whereFail: string;
  fix?: Fix;
  matchedPhrase?: string;
};

export type RuleResult = {
  ruleId: string;
  ruleName: string;
  status: "pass" | "fail" | "na" | "cannot-check";
  findings: Finding[];
};
