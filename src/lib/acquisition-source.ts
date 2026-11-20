/**
 * "Sur quel compte TikTok tu nous as vus ?", asked once on the confirmation
 * page right after a purchase. The answer goes to PostHog as
 * `acquisition_source_answered` with `account`, on the same person as
 * `purchase_completed`.
 */

export const ACQUISITION_TIKTOK_ACCOUNTS = [
  "kyliantropa",
  "tristanpauki",
  "mariusgreto",
  "gabrielhelau",
  "annadbpljux",
  "camilyhd337",
  "anaisuxfzsv",
] as const;

export type AcquisitionAccount = (typeof ACQUISITION_TIKTOK_ACCOUNTS)[number] | "other";

export const ACQUISITION_OTHER: AcquisitionAccount = "other";

/** Set once the customer answered or skipped: the question never comes back. */
export const ACQUISITION_STORAGE_KEY = "anyloc-acquisition-source";

/**
 * The accounts in a random order (Fisher-Yates), so the first button doesn't
 * collect the clicks of people who don't remember. "Autre" stays last.
 */
export function shuffleAccounts(
  random: () => number = Math.random
): (typeof ACQUISITION_TIKTOK_ACCOUNTS)[number][] {
  const accounts = [...ACQUISITION_TIKTOK_ACCOUNTS];
  for (let index = accounts.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [accounts[index], accounts[swap]] = [accounts[swap], accounts[index]];
  }
  return accounts;
}
