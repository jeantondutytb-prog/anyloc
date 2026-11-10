/**
 * What the intercepted back press led to:
 * - "shown": an offer is on screen, the visitor stays;
 * - "declined": no offer to make, the back press must be replayed;
 * - "aborted": the page state changed meanwhile (payment popup opened), so
 *   the visitor stays and nothing is replayed.
 */
export type BackResult = "shown" | "declined" | "aborted";

/** Only a "declined" result sends the visitor back; anything else keeps them here. */
export function shouldReplayBack(result: BackResult | void): boolean {
  return result === "declined";
}
