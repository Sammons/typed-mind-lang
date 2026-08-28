// X-AN-10 not-found fixture — a handler string whose target file does not
// exist anywhere in the project. The recognizer must surface an X-DIAG-1
// warning naming the string and the failed probe path, never silence.
export const brokenFn = {
  handler: 'nonexistent/path.handler',
};
