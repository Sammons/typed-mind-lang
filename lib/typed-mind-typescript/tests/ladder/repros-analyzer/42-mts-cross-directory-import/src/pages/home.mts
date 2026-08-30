// Adversarial-review blocker fix repro — an `.mts` module in a
// subdirectory neither `types` nor `services`, imported cross-directory
// by App.mts.
export const Home = (): string => 'home';
