# Quality

Maintained by [ever-better](https://github.com/isamu/ever-better). Numbers are rendered from
`.ever-better/state.json`; edits outside the notes block are overwritten on the next run.

- Phase: **drain**
- Frozen: 2026-08-18T02:43:46.443Z
- Open violations: **2008**
- Rules improved since the ceiling: **0**
- Everything is at or below its ceiling.

## Worklist

Top to bottom. An unattended run works this list and nothing else.

- [x] **P0 diagnose** — taken 2026-08-18T02:34:47.294Z
- [x] **P1 bootstrap** — nothing missing
- [x] **P2 freeze** — frozen 2026-08-18T02:43:46.443Z
- [ ] **P3 drain** — 2008 violations across 30 rules
  - [ ] `sonarjs/unused-import` — 1 left
  - [ ] `complexity` — 1 left
  - [ ] `sonarjs/cognitive-complexity` — 1 left
  - [ ] `sonarjs/super-linear-regex` — 1 left
  - [ ] `@typescript-eslint/no-misused-promises` — 1 left
- [ ] **P4 tighten** — add the next rule tier, then freeze and drain again
- [ ] **P5 duplication and dead code** — report-only scans; extraction is judgment, not a threshold

## Ratchet

Ceiling is the count at the last freeze. It may fall and must never rise.

| Rule | Ceiling | Now | Change | Status |
| --- | ---: | ---: | ---: | --- |
| `prettier/prettier` | 1553 | 1553 | 0 | draining |
| `id-length` | 267 | 267 | 0 | draining |
| `@typescript-eslint/no-confusing-void-expression` | 26 | 26 | 0 | draining |
| `@typescript-eslint/restrict-template-expressions` | 24 | 24 | 0 | draining |
| `@typescript-eslint/no-unsafe-member-access` | 23 | 23 | 0 | draining |
| `@typescript-eslint/consistent-type-assertions` | 18 | 18 | 0 | draining |
| `@typescript-eslint/no-unsafe-call` | 17 | 17 | 0 | draining |
| `@typescript-eslint/no-non-null-assertion` | 15 | 15 | 0 | draining |
| `max-lines-per-function` | 11 | 11 | 0 | draining |
| `@typescript-eslint/no-unsafe-assignment` | 11 | 11 | 0 | draining |
| `@typescript-eslint/no-unsafe-argument` | 7 | 7 | 0 | draining |
| `@typescript-eslint/no-unnecessary-condition` | 6 | 6 | 0 | draining |
| `sonarjs/no-identical-functions` | 5 | 5 | 0 | draining |
| `@typescript-eslint/no-empty-function` | 4 | 4 | 0 | draining |
| `@typescript-eslint/no-floating-promises` | 3 | 3 | 0 | draining |
| `@typescript-eslint/no-unused-vars` | 2 | 2 | 0 | draining |
| `sonarjs/no-nested-conditional` | 2 | 2 | 0 | draining |
| `@typescript-eslint/use-unknown-in-catch-callback-variable` | 2 | 2 | 0 | draining |
| `sonarjs/unused-import` | 1 | 1 | 0 | draining |
| `complexity` | 1 | 1 | 0 | draining |
| `sonarjs/cognitive-complexity` | 1 | 1 | 0 | draining |
| `sonarjs/super-linear-regex` | 1 | 1 | 0 | draining |
| `@typescript-eslint/no-misused-promises` | 1 | 1 | 0 | draining |
| `@typescript-eslint/no-unsafe-return` | 1 | 1 | 0 | draining |
| `@typescript-eslint/restrict-plus-operands` | 1 | 1 | 0 | draining |
| `@typescript-eslint/prefer-nullish-coalescing` | 1 | 1 | 0 | draining |
| `@typescript-eslint/unbound-method` | 1 | 1 | 0 | draining |
| `max-lines` | 1 | 1 | 0 | draining |
| `sonarjs/pseudo-random` | 1 | 1 | 0 | draining |
| `@typescript-eslint/no-unnecessary-type-assertion` | 1 | 1 | 0 | draining |

## Other counters

| Counter | Ceiling | Now |
| --- | ---: | ---: |
| eslint:warnings | 48 | 48 |

## Outstanding

### tighten

- [ ] **Only 84% of sources are TypeScript** — The type-aware rules cover the typed part only, so the remaining .js files are the blind spot the counts will not show.
- [ ] **TypeScript `strict` is off** — Everything else in the type tier is moot until this is on.

### split

- [ ] **1 files over 600 lines** — These are the split-and-DRY backlog. Knowing the count now makes the limit a choice.

### review

- [ ] **CI does not run on macos, windows** — Path handling and file watching break per platform, and only per platform.
- [ ] **CI does not run lint** — The rules are configured but nothing runs them on a pull request.

## Notes

<!-- ever-better:notes:start -->
_Anything written between these markers survives a re-render._
<!-- ever-better:notes:end -->
