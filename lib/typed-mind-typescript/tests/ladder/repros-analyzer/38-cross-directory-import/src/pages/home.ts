// RC-A repro — lives in `pages/`, a subdirectory neither `types` nor
// `services` (the only two prefixes `registerModuleExports`'s prior fixed
// specifier enumeration ever special-cased).
export const Home = (): string => 'home';
