# Quality

Maintained by [ever-better](https://github.com/isamu/ever-better). Numbers are rendered from
`.ever-better/state.json`; edits outside the notes block are overwritten on the next run.

- Phase: **freeze**
- Frozen: not yet — run `ever-better freeze`
- Open violations: **0**
- Rules improved since the ceiling: **0**
- Everything is at or below its ceiling.

## Worklist

Top to bottom. An unattended run works this list and nothing else.

- [x] **P0 diagnose** — taken 2026-08-18T02:34:47.294Z
- [x] **P1 bootstrap** — nothing missing
- [ ] **P2 freeze** — baseline not pinned yet
- [ ] **P3 drain** — backlog empty
- [ ] **P4 tighten** — add the next rule tier, then freeze and drain again
- [ ] **P5 duplication and dead code** — report-only scans; extraction is judgment, not a threshold

## Ratchet

Ceiling is the count at the last freeze. It may fall and must never rise.

No rule violations recorded yet. Run `ever-better freeze`.

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
