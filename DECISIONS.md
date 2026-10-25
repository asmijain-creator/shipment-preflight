# Decisions

Seeded from Spec §16, logged as choices are made.

| # | Decision | Why |
|---|---|---|
| A1 | R-02 tolerance = 1% of calc; exactly 1% passes; compared in pence | Spec; avoid float drift. |
| A2 | R-05 checked against the recommended carrier when no explicit choice; against the chosen carrier otherwise | Spec. |
| A3 | Balanced = minimax regret, tiebreak on total regret → cost → days → on-time → carrier name | Robust, no stated weights. |
| A4 | Transit days are calendar days; delivery is a calendar-day estimate | Rate card is days only. |
| A5 | Repack keeps gross unchanged unless the seller gives a new figure | No tare in data. |
| A6 | R-06 uses whole-word phrase matching with explicit exclusions; battery-devices need confirmation | Descriptions are free text. |
| A7 | 5-digit HS codes are flagged with a leading-zero note; never auto-padded | Could be a wrong code or a lost zero. |
| A8 | "Today" is current date in IST, re-computed per request | Judges test in India. |
| A9 | Template example row (`BK-001` / `Northfield Goods`) is processed and tagged | Never drop judge data by position. |
| A10 | Final state is "Ready for booking", not "Booked" | No carrier integration. |
| B1 | V1 is stateless: upload → in-memory analyze → JSON response. No DB tonight. | Fastest to ship; judge workflow needs no cross-session persistence. |
| B2 | TypeScript + Next.js 16 on Vercel; `exceljs` for parsing | Single deploy, strong types for FieldValue model. |
| B3 | Deployment protection must be disabled on production for the judge-facing URL | Preview protection = login wall = failed test. |
