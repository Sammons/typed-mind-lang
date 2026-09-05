# Implicit platform data types

`AbortSignal` is accepted as an implicit data type in DTO fields, including
callback parameters, and in generic constraints/defaults and typed class
members. A real declaration with that name takes precedence: it remains a
checked reference, and a Function cannot be used as a data type. Generic
parameters with the same name remain local bindings.

This singleton fallback covers the measured Node global type used by
`WorkerDeps.sleep`. The source project uses the ES2022 library without DOM;
`@types/node@26.4.0/web-globals/abortcontroller.d.ts:50` supplies its declaration
inside `declare global`. It has no import binding. The source regression in
`lib/typed-mind-typescript/src/abortsignal-platform-type.test.ts` verifies this
origin against the installed Node declaration package.

The converter retains its explicit missing-public-import-binding warning for
this ambient origin. No Dependency export or source import is fabricated. The
checker fallback does not reinterpret other external or unresolved types as
platform globals. Misspellings remain unknown, and qualified names retain the
normal owner/member checks.

The platform fallback is separate from the existing primitive allowlist so it
can run after declaration resolution without changing older primitive behavior.
