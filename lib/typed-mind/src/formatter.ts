import type { ValidationError } from './types.ts';

export class ErrorFormatter {
  format(error: ValidationError, lines: string[]): string {
    const { position, message, severity, suggestion } = error;
    const line = lines[position.line - 1] || '';
    const pointer = ' '.repeat(Math.max(0, position.column - 1)) + '^';

    let output = `${severity.toUpperCase()} at line ${position.line}, col ${position.column}: ${message}\n`;
    output += `  ${position.line} | ${line}\n`;
    output += `     ${pointer}\n`;

    if (suggestion) {
      output += `  Suggestion: ${suggestion}\n`;
    }

    return output;
  }

  formatAll(errors: ValidationError[], lines: string[]): string {
    return errors.map((error) => this.format(error, lines)).join('\n');
  }
}
