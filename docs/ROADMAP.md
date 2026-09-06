# Roadmap — personal finance tracker

Where this project is, and what is next. It is not a migration: `../../inventory/laravel-ms-ai-v2`
stays untouched as a reference for conventions, and almost everything that makes it
complicated — multi-tenancy, RBAC, localization, medialibrary — is deliberately absent
here. What is taken from it is taken file by file, with the reason written down.

**Legend:** ✅ done · 🚧 in progress · ⬜ not started

## Done — the scaffold ✅

Five commits, in order. Nothing since the fifth is committed, which is the working
agreement rather than an oversight: finish the work, get the gates green, leave it in the
tree for review.

| Step | Commit | What it settled |
|---|---|---|
| The kit, verbatim | `chore: laravel/react-starter-kit scaffold as delivered` | A recovery point. The installer had died half-way; committing the wreck first is what made Chisel's edits a reviewable diff. |
| MySQL, Chisel, the owner account | `feat(auth): finish the scaffold — mysql, chisel, and the owner account` | Off SQLite (its `DECIMAL` has NUMERIC affinity and stores as REAL — money would be float in the database itself). Registration and email verification removed; the single user is seeded from `SEED_USER_*`. |
| Toolchain | `feat(build): swap vite-plus for vite + biome, and get the gates green` | vite-plus 0.3.0 out, plain Vite + Biome 2.5.2 in, so the reference's `biome.json`, guards and docs port as-is. Bun replaces npm throughout. 36 Biome errors in the starter kit fixed. |
| The component tree | `feat(ui): vendor the shadcn registry, minus form` | 62 files in `components/ui/`, up from the kit's 26. `form` is absent by choice — client form state here is Inertia's `<Form>` plus the zod gate, and `react-hook-form` would be a dependency nothing imports. |
| Theme | `feat(theme): adopt laravel-ms-ai-v2's theme, with a validated chart ramp` | Every non-chart token byte-identical to the reference. Two divergences, both measured, both explained in `resources/css/app.css`. |
| Governance | *uncommitted — in the working tree* | `CLAUDE.md`, `docs/`, `lefthook.yml`, the four scripts in `scripts/`, `.github/workflows/ci.yml`, `spatie/laravel-data` + the transformer provider, and the removal of the remaining `tests/` and `phpunit.xml`. |

### What was removed, and what was never installed

The test suite is gone — `tests/`, `phpunit.xml`, `phpunit/phpunit`, `mockery/mockery` and
the `Tests\` autoload entry. That is a decision, not a backlog item; the static gates below
are the entire automated safety net. Three of the deletions rode along with commit
`1f96690` (registration, email verification and their tests); the other eleven —
`phpunit.xml` and ten test files — plus the composer changes are in the working tree.

Never installed, and not to be introduced by accident: `stancl/tenancy`,
`spatie/laravel-permission`, `spatie/laravel-medialibrary`, `react-hook-form`, and any i18n
layer. There is no `lang/`, no `t()`, no `check-i18n.ts`. A component ported from the
reference has its `t('some.key')` calls replaced with the English literal.

### Where the gates stand

All eight pass. Two of them pass by having nothing to check yet, and that is worth saying
out loud rather than reading as coverage:

```
bun run check:ci               # biome, 0 errors
bun run types:check            # tsc --noEmit
bun run check:structure        # scripts/check-structure.sh
bun run check:validation       # scripts/check-validation-parity.ts
bun run check:generated-types  # scripts/check-generated-types.ts
vendor/bin/pint --test
vendor/bin/phpstan analyse     # level 7, NO baseline
bun run build
```

`check:validation` reads `app/Http/Requests` **non-recursively**, which is what keeps the
four `Settings/` requests out — they are the starter kit's own auth screens and validate
server-side only. Nothing sits at the top level, so it reports *"no FormRequests yet"*.
`check:generated-types` reports *"no `#[TypeScript]` classes yet, and no generated.d.ts"* —
`app/Data/` holds a `.gitkeep`. Both become real gates in phase 1, and phase 1 is where
they should be deliberately broken once each to confirm they still fail.

`lefthook.yml` splits them: pre-commit runs pint, biome, `types:check`, the UI guard and
the structure gate; pre-push runs PHPStan, validation parity, generated types and the
build.

`scripts/check-structure.sh` carries five errors — `lib/` must not import React ·
`components/` must not import from `pages/` · a module's `_components/` are private to it ·
controllers must not run raw queries · no money arithmetic in the browser — plus size caps
as warnings. The reference's fourth rule, which forces dialogs to be imported from
`components/feedback/` rather than `components/ui/`, was **dropped** and money arithmetic
took the freed slot: it existed only
because the vendored `DialogContent` renders a hard-coded English `sr-only` "Close", and
there is no i18n here for that to break.

### Debts the earlier commits deferred to this one

Both are paid by the governance scaffolding: `cn@0.2.5` gets its `docs/PACKAGE-POLICY.md`
entry, and the chart ramp's secondary-encoding constraint — every chart carries a legend
and direct labels, identity is never colour alone — moves from a comment beside the tokens
into `docs/UI-UX-GUIDELINES.md`.

## Slice 1 — the finance tracker ⬜

Accounts, categories, transactions, and a dashboard over them. Three phases, each of which
leaves the app working and stops for review.

| Phase | Scope | Status |
|---|---|---|
| 1 · Backend domain | migrations, enums, models, `App\Support\Money`, FormRequests, DTOs, controllers, routes, the metrics service | ✅ |
| 2 · Shared kit + modules | the `components/{data,form,feedback}` port, the zod gate, `lib/money.ts`, the three module trees, the shell | ✅ |
| 3 · Dashboard | this month in/out/net, balance per account, spending by category, 6-month trend | ⬜ |

### Phase 1 — the backend domain

Three migrations — `accounts`, `categories`, `transactions` — each carrying `user_id` with
a foreign key and a global scope from day one, through an `App\Models\Concerns\BelongsToUser`
that both scopes reads and stamps the column on write. There is one user; the point is that
adding a second is a config change rather than a migration and a backfill.

`amount` is `decimal(15,2)`, cast `decimal:2`. Enums land in `app/Enums/` (currently a
`.gitkeep`): the transaction type — income, expense, transfer — and the account type.
`App\Support\Money` becomes the one place PHP touches an amount outside a SQL expression:
normalising what a request sends, and formatting what a DTO exposes. It is the server-side
twin of `lib/money.ts`, and like it, it does no arithmetic that a query could do.

An `AppFormRequest` base plus one request per resource. It is already in the parity gate's
`EXEMPT` set with the reason — it declares no rules of its own. **Every `rules()` must be
an inline array literal:** the gate finds field names by matching exactly twelve spaces of
indentation, so a `rules()` that spreads a base array yields zero fields and the gate then
passes while checking nothing.

DTOs in `app/Data` with `#[TypeScript]`, exposing `public string $amount` so `"12.50"`
crosses the wire and JavaScript never floats it. These produce the first
`resources/js/types/generated.d.ts`, which is committed and gated.

Controllers stay thin. The concerns worth porting from the reference are `ResolvesPerPage`,
`SortsResourceQuery`, `RendersResourceIndex`, `RespondsWithToast` and `ReadsQueryValues`,
plus the `Searchable` model concern — take them when a controller needs them, not before.
`BuildsStockPickers` and `StreamsMedia` have no analogue here and are not coming.

The dashboard's numbers come from a service, not a controller, and **every one of them is a
SQL aggregate**: this month's in / out / net, the balance per account, spend grouped by
category, and six months of monthly totals. Nothing sums rows in PHP either — the rule is
about where arithmetic happens, not which language it happens in.

### Settled: a transfer is two legs

Two rows sharing a `transfer_group_id` — negative on the source, positive on the
destination — written together by `App\Actions\RecordTransfer`, which is the only thing in
the app allowed to write a row of type `transfer`.

The alternative was one row with a nullable `to_account_id`. **What decided it was writing
the four queries both ways**: the account transaction list, the per-account running balance,
spend-by-category, and this month's in/out/net. Under two legs every one of them stays
`WHERE account_id = ?` over a plain signed `SUM(amount)`; under one row, three of the four
become an `OR` across two indexed columns with a `CASE` over the sign, and the running
balance stops being a sum at all.

The costs, both real and both paid:

- **Edit and delete touch two rows.** Both go through `RecordTransfer` inside a database
  transaction, and edit is delete-then-write rather than update-both, because an edit can
  change which accounts are involved. Soft deletes mean a mistake is recoverable.
- **The list would show a transfer twice.** `TransactionController::index` shows only the
  outbound leg unless the list is filtered to one account — across accounts a transfer is
  one event, and inside one account both legs really are separate movements of that
  account's money.

### Phase 2 — the shared kit, and the three modules

The reference's `components/data/` (18 files), `components/form/` (6) and
`components/feedback/` (3) come to about 3,900 lines. Roughly 21 of those 27 files port
across, stripped of `t()`:

What actually landed, and what did not:

- **Not ported:** `stock-picker-field.tsx`, `on-hand-line.tsx`, `order-line-row.tsx`,
  `order-lines-field.tsx`, `decimal-cell.tsx` and `combobox-field.tsx` — all shapes with no
  analogue here. `combobox-filter.tsx` and `checkbox-filter.tsx` went too: a personal
  ledger's account and category lists are short, and a search box over five rows is
  furniture. `SelectFilter` covers every filter this app has.
- **The Columns panel came across; its persistence did not.** `column-panel`, `column-row`
  and `column-layout` are all here, so `hideBelow`, `defaultHidden` and the drag/reorder
  behaviour work. `use-column-layout.ts` is replaced by a `useState` in `DataTable`: the
  layout survives searching, sorting and paging, and resets on navigation. Remembering it
  across visits needs a server round trip to stay hydration-safe — the seed has to be a
  value both sides already agree on — and that is a table, a controller and a shared prop.
  Recorded below rather than guessed at.
- **`feedback/dialog.tsx` was kept, on target-size grounds.** Its original reason was the
  untranslated close button and that reason is gone; the incidental improvement is not. The
  vendored primitive's dismiss button is a bare `size-4` icon — a 16px target, under WCAG
  2.2 (2.5.8)'s 24px minimum, on the one control in a dialog somebody in a hurry reaches
  for. The wrapper renders a 36px `Button` in its place. `check-structure.sh` **rule 6** now
  enforces the import, replacing the dropped i18n rule with a target-size one; the starter
  kit's three own dialogs were redirected through it at the same time.
- **`lib/validation/message.ts` does not come across.** It exists to carry a translation key
  and its params through zod's message slot. With one language, primitives return the
  English sentence Laravel's own validator would produce, and parity is checked by reading
  both.
- **Added, with no counterpart in the reference:** `lib/labels.ts` (enum words, keyed by the
  generated unions so a new PHP case is a `tsc` error), `lib/category-style.ts` and
  `lib/category-icons.ts` (a category stores a *chart token name* and a lucide icon name,
  not a hex and not an arbitrary import), `components/data/money-cell.tsx`,
  `components/data/category-badge.tsx`, `components/data/date-range-filter.tsx`,
  `components/form/date-field.tsx` and `components/form/checkbox-field.tsx`.

Alongside them: `lib/money.ts` (format and parse, deliberately no `add()`), `lib/format.ts`
for the deterministic date helpers, `lib/pagination.ts`, `lib/prefetch-cache.ts` — that last
one is not optional, since a prefetched nav target served after a write shows the list as it
was before the change.

Then `pages/{accounts,categories,transactions}`, each with its own `_components/`. The
rule of three applies: the first module keeps its form dialog and row actions private, and
the second is what reveals the shared shape.

The shell is replaced here too. `components/app-sidebar.tsx` still ships the starter kit's
single Dashboard entry and footer links to `github.com/laravel/react-starter-kit`.

### Phase 3 — the dashboard

`pages/dashboard.tsx` is currently 36 lines of `PlaceholderPattern` boxes. It becomes four
things: this month's in / out / net; the balance per account; spending by category as a
donut; and a six-month trend. `recharts` is already a dependency, pinned at exactly 3.8.0.

Every number is read from the metrics service. React formats and lays out; it does not add.

The five chart hues in `app.css` clear the lightness band, the chroma floor, 3:1 contrast
and the adjacent-pair colour-vision floor against both surfaces — but **no five-hue set
clears that floor across all pairs**, so charts carry a legend and direct labels, colours
are assigned in order and never cycled, and a sixth series folds into "Other".

### What closes slice 1

One end-to-end Playwright pass over every feature, when the user asks for it. Playwright is
not driven during a phase; this replaces the reference's per-phase browser check. Until
then, SSR determinism is enforced by reading rather than running — no `Date.now()`,
`Math.random()` or unpinned `Intl` in render output — which is why `scripts/ui-guard.sh`
blocks the two easy cases.

## Deferred finance work ⬜

Each of these is a real feature and none of them is needed for the first four screens to be
useful.

| Deferred | Why |
|---|---|
| Budgets per category | A budget is a comparison against a period's spending, and the period rules — calendar versus rolling, a limit changed mid-month, carry-over — are a design job on their own. |
| Recurring / scheduled transactions | Needs a scheduler, a materialisation strategy (generate ahead or synthesise on read), and a rule for editing one occurrence versus the series. That is a second data model, not a column. |
| Savings goals | A goal is a view over an account plus a target date and amount. Which balance counts is undecidable before there are real balances to look at. |
| Receipt attachments | Needs a storage decision and a media layer. `spatie/laravel-medialibrary` is deliberately not installed, and one attachment type does not justify installing it. |
| CSV bank-statement import + export | Import is parsing, matching and de-duplication, and every bank's CSV is different. Export is easy and pointless before there is anything worth exporting. |
| Multi-currency | Every amount would need a currency and every aggregate a rate at a date. That changes the money rule the whole app is built around. Single currency, 2dp, until there is a reason. |

## Possible future modules — recorded, not planned

Tasks and todos. Notes and documents. Contacts, calendar, reminders.

These are written down so the architecture does not quietly foreclose them, not because
anyone has agreed to build them. What keeps the door open costs nothing when it arrives:
`user_id` plus a global scope on every domain table from the first migration, and module
trees under `pages/<module>/` with private `_components/`. None of that exists yet — there
are no domain tables and no module trees — and the sidebar is a flat `NavItem[]` literal in
`components/app-sidebar.tsx`, which grows a group shape when there is a second group. **Do not build toward them.** The repository is named
`personal-assistant`; the application is a finance tracker, and adding a second domain is a
conversation, not a phase.

## Known gaps and things to revisit

- **`welcome.tsx` is still Laravel's marketing page** — 387 lines, served at `/` by
  `Route::inertia('/', 'welcome')`, and over the structure gate's 250-line signal, so every
  `check:structure` run warns on it. For a single-user app with registration disabled, `/`
  arguably has no marketing job at all and should redirect to the dashboard or to login,
  with the page deleted. The reference replaced its own copy with an 86-line token-based
  placeholder and still routes `/` to it; turning that route into a redirect is outstanding
  work there too. Left alone here because it is a routing decision that belongs with slice
  1's routes.
- **The Columns panel works but does not remember.** `column-panel`, `column-row` and
  `column-layout` all ported; `use-column-layout.ts` did not. `DataTable` seeds the layout
  from the column declarations with a `useState`, so it survives searching, sorting and
  paging and resets on navigation. Persisting it is not a `localStorage` call: SSR renders
  the header row, so the seed has to be a value both sides already agree on before the first
  paint — which means a server prop, which means the reference's controller, an
  `App\Support\TableColumns` validator, a `TableKey` enum and a column on `users`. That is a
  migration and an endpoint for a preference on three lists with fewer than a dozen columns
  each. Revisit if the ledger grows past what fits at 1024px.
- **The Wayfinder trees are large for a route table this small** — 50 generated modules,
  324 KB of TypeScript across `resources/js/{actions,routes,wayfinder}`, all three
  gitignored. Nothing has measured what survives tree-shaking into the client bundle, and
  measuring it is only meaningful once real modules import from it. If it turns out to be
  material, the answer is importing narrowly, not giving up typed routes for Ziggy.
- **`cn` exists twice.** 56 files in `components/ui/` import the npm package `cn@0.2.5`;
  8 authored files import `@/lib/utils`. Both are clsx + tailwind-merge and both ship. This
  is deliberate — the vendored tree is read-only and self-consistent — but it is two copies
  of one function in the bundle and a pre-1.0 dependency. The entry is in
  `docs/PACKAGE-POLICY.md`; revisit when the registry moves.
- **A transfer row costs one extra query.** `TransactionController::counterpart()` loads the
  other leg per transfer row, so a page of transfers is an N+1. Accepted rather than hidden:
  only transfers pay it, a page holds at most 100 rows, and the alternative is a self-join
  on `transfer_group_id` that complicates every other read of the list. Revisit if a page of
  mostly-transfers ever feels slow.
- **The ledger's sort allow-list advertises `created_at`, which has no column.** Harmless —
  the allow-list governs what `ORDER BY` may name, and a crafted `?sort=created_at` sorts
  correctly — but nothing on screen can reach it. Either give the ledger a "Recorded" column
  (hidden by default, like Accounts has) or drop it from the list.
- **`prefetch-cache.ts` flushes everything on any write.** Inertia can invalidate by cache
  tag instead, which would keep unrelated prefetched pages warm. Not done, and deliberately:
  tagging means tagging every link correctly and forever, and a missed tag brings back a
  stale-page bug that looks like a lost save. Revisit only if prefetching stops feeling
  instant.
