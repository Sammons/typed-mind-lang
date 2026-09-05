// Shape A — a real re-export of the sibling's name. The barrel's File
// entity carries `<-> [normalizeVehicleString]`; it must NOT also claim the
// name in `-> [...]`, so `checker/multi-exported` must not fire.
export { normalizeVehicleString } from './normalize.ts';
