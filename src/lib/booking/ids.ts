export function makeInternalId(idx: number): string {
  return `it-${idx + 1}`;
}

let bookingCounter = 0;
export function makeBookingId(): string {
  bookingCounter += 1;
  return `b-${Date.now().toString(36)}-${bookingCounter}`;
}
