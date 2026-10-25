# Shipment Pre-Flight Checker

Case 2 — Mesa AI × Ops Hackathon, October 2026.

A booking assistant for UK → EU freight (Germany, France, Netherlands) that prevents errors while a seller books, catches the rest before collection, explains how to fix each one, and recommends the carrier that matches the seller's priority.

## What it does

- **Upload** the official Bookings + Items `.xlsx`
- **Parses** headers by name (robust to row offsets, blank rows, template example rows, strict DD-MM-YYYY dates, numeric HS codes)
- **Runs 10 rules** (R-01..R-10) as pure deterministic TypeScript functions — one per rule, each returning typed findings with evidence, a fix, and a confidence label
- **Recommends** a carrier per seller priority (Cheapest, Fastest, Most reliable, Balanced). Balanced uses **minimax regret** with total-regret tiebreak
- **Shows the verdict**: Blocked / Incomplete / Passed with warnings / Passed. Final state is "Ready for booking" — this app never says "Shipment booked"

## Stack

- Next.js 16 (App Router) + TypeScript, deployed on Vercel Fluid Compute
- `exceljs` for parsing
- Vitest for unit tests (41 passing)
- Tailwind for the ops UI

## Project layout

```
src/
├─ config/              rate card, allowed values, R-06 phrases
├─ lib/
│   ├─ parsing/         excel parser, strict DD-MM-YYYY, numbers
│   ├─ booking/         FieldValue wrapper, Booking/Item types
│   ├─ rules/           r01…r10, engine
│   ├─ carrier/         eligibility, 4-priority ranking, minimax regret
│   ├─ verdict.ts       4-state decider + next-steps text
│   └─ analyze.ts       orchestrator used by API
├─ app/
│   ├─ api/upload/      POST xlsx → analyzed bookings
│   ├─ queue/           review-queue placeholder
│   └─ page.tsx         upload + queue + booking detail
├─ components/          BookingDetail, QueueTable, verdict badge
└─ tests/               rules + carrier unit tests
```

## Running locally

```sh
npm install
npm run dev
npx vitest run
```

## Status (Checkpoint 1)

- Upload → parse → rules → carrier → verdict → booking detail → review queue: ✅
- Automated rule + carrier tests (14.1, 14.2): ✅ 41/41 passing
- Chat booking + fix advisor + change log: planned Checkpoint 2
