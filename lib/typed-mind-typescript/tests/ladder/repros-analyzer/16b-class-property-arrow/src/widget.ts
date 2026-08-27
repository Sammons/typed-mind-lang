// RFC-TM-9 X-AN-5 (site two), FAQ Q7: `parseProperty` (typescript-analyzer.ts:555-573)
// repeats the same initializer-blind omission the module-level arrow-const
// case (16-arrow-const-fn) fixes — a class-property arrow is a method, not
// data.
export class Widget {
  handleClick = (event: string): void => {
    console.log(event);
  };
}
