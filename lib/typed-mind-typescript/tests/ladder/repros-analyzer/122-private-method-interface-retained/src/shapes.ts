// Pure-types module: no File entity of its own until a retained private
// Class needs an owner.
interface Reporter {
  report(line: string): void;
}

export interface Job {
  reporter: Reporter;
}
