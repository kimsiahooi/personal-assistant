# Architecture & code organisation

One obvious home for each kind of code, and logic simple enough that reading it is enough.
The app is small — one user, three domain tables in slice 1 — which is exactly when
structure gets skipped, and exactly when it costs nothing to put in.
`resources/js/components/` is a flat 27 files today, all starter-kit chrome. That is fine
at 27 and a dump at 60, so the groups below are where things go as they arrive, not a
refactor waiting to happen.

## Frontend — `resources/js/`

| Folder | Holds | Rule |
|---|---|---|
| `pages/<module>/` | Route components — `accounts/`, `categories/`, `transactions/` | Composition + data wiring. **No business logic.** |
| `pages/<module>/_components/` | Components used by exactly ONE module | Co-located. Most components start life here. |
| `pages/dashboard.tsx` | The one page that is not a module | Renders totals the server already computed |
| `components/ui/` | Vendored shadcn — 62 files | Read-only. Never hand-edited. |
| `components/data/` | `DataTable` (`@tanstack/react-table`), pagination, filters | Shared list/table concerns |
| `components/form/` | Field wrappers, `input-error.tsx`, the amount input | Shared input concerns |
| `components/feedback/` | `EmptyState`, `alert-error.tsx`, confirm dialogs | Shared state/messaging |
| `components/layout/` | Sidebar, nav, breadcrumbs, header | Shared chrome |
| `layouts/` | `app-layout`, `auth-layout`, `settings/layout` | The shells `app.tsx` picks by page name |
| `hooks/` | Reusable React hooks | One hook per file |
| `lib/` | Pure functions — `utils.ts`, `money.ts`, `validation/schemas/` | **Never imports React** |
| `types/` | Shared + generated types | `generated.d.ts` is generated; edit the DTO |

There is no `config/`. The reference keeps one holding a single file — its sidebar and
command palette read the same nav descriptor from it. Here the nav is a literal in
`components/app-sidebar.tsx` and there are three resources to describe, so a `config/`
folder would be one file pretending to be a layer.
When a second thing wants describing, it earns the folder.

`routes/`, `actions/` and `wayfinder/` are not in the table because nobody writes them:
Wayfinder generates all three, they are gitignored, and `ui-guard.sh` blocks a hand-edit.
Import from them freely — `import { dashboard } from '@/routes'` is the intended shape.

One mechanical detail before the first page grows. `check-structure.sh` derives a page's
module from a *directory* segment, so `pages/dashboard.tsx` importing
`@/pages/dashboard/_components/x` reads as one module reaching into another's and fails
rule 3. A page that wants `_components/` becomes `pages/dashboard/index.tsx` first — and
the name in its `Inertia::render()` moves with it.

## Backend — `app/`

| Folder | Holds | Rule |
|---|---|---|
| `Http/Controllers/` | HTTP only: resolve → delegate → respond | **No business logic, no raw queries** |
| `Http/Controllers/Concerns/` | Shared controller traits | Index/pagination plumbing, never domain rules |
| `Http/Middleware/` | Request-shaping only | `HandleAppearance`, `HandleInertiaRequests` |
| `Http/Requests/` | Validation rules | Paired 1:1 with a zod schema in `lib/validation/schemas/` |
| `Actions/` | One state-changing operation, one public method | `RecordTransaction`, `TransferBetweenAccounts` |
| `Services/` | Multi-step domain work with invariants | The only place an account balance is derived |
| `Data/` | DTOs (`spatie/laravel-data`) | The single source of the wire shape |
| `Models/` + `Models/Concerns/` | Eloquent + shared model traits | Relations, casts and scopes; no orchestration |
| `Enums/` | Value types that cross the wire — `TransactionType`, `AccountType` | Transformed to TS alongside `Data/` |
| `Support/` | Pure helpers — `Money` | No framework state |
| `Concerns/` | Traits shared across requests | The validation-rule sets the Settings requests share |

Most of that is a destination. On disk today: `Http/Controllers/` (a base class and
`Settings/`), `Http/Requests/Settings/`, `Actions/Fortify/`, `Concerns/` — the two
validation-rule traits the Settings requests share — `Models/User.php`, `Providers/`, and
`Data/` and `Enums/` holding nothing but a `.gitkeep`.

Those two `.gitkeep` files are load-bearing. `TypeScriptTransformerServiceProvider` points
the transformer at exactly `app_path('Data')` and `app_path('Enums')`, and git tracks no
empty directory — so without them a fresh clone has neither path and
`bun run types:generate` fails before it transforms anything.

`app/Data` is the single source of the wire shape. `php artisan typescript:transform`
turns those DTOs and the enums beside them into `resources/js/types/generated.d.ts`, which
is committed and generated: a field is added to the PHP class, never to the `.d.ts`.
`bun run check:generated-types` transforms into a temp directory and diffs, so a stale
file and a hand-edit fail the same way. Nothing carries `#[TypeScript]` yet, so there is
no `generated.d.ts` in the tree today — the gate's "no classes, no file" branch is the
consistent state until the first Data class lands.

No `Tenancy/`, no `Policies/`, no `Jobs/`. Tenancy because there is one user. Policies
because with one user authorisation *is* ownership, and ownership is a `user_id` column
plus a global scope on every domain model from the first migration — a policy per model
would be the same `where user_id = ?` restated three times, in the place least likely to
be read. `Jobs/` arrives when something is slow enough to want a queue; nothing is.

## The four rules

1. **Size is a signal, not a law.** A page over ~250 lines, or a controller method over ~30,
   means a piece wants extracting — to `_components/` or to an Action. Do it then, not "later".

2. **Dependencies point one way.** `pages → components → ui`. `lib/` imports from neither.
   Nothing in `components/` may import from `pages/`. One module's `_components/` is private
   to that module.

3. **Rule of three for promotion.** A component starts in its module's `_components/`. It
   moves into a shared `components/` group on its **third** consumer — or its second if the
   logic is non-trivial. Don't pre-abstract; don't leave a fourth copy either.

4. **Business logic has exactly one home.** Never in a page component, never in a controller.
   Frontend derivation goes to `lib/`; backend rules go to an Action or a Service. Money is
   the strictest case of this, and it gets its own note.

## Money's home is SQL

Amounts are `decimal(15,2)` in MySQL, cast `decimal:2`, and leave the DTO as
`public string $amount` — so `"12.50"` crosses the wire as a string and JavaScript never
gets the chance to float it. Every sum, balance and aggregate is a SQL expression: this
month's in/out/net, the balance per account, the spending-by-category donut, the six-month
trend. React receives totals; it does not make them.

`lib/money.ts` formats and parses, and deliberately exports no `add()` — there is nothing
for it to do that would not already be wrong. `0.1 + 0.2` is `0.30000000000000004`, and
`toFixed(2)` hides that while the equality check still fails, which surfaces months later
as a balance one cent off and no idea which row did it. `check-structure.sh` rule 5 fails
the commit on money arithmetic in the browser; a genuine exception is marked `money-allow`
on the line.

## Why these boundaries

Each unit should answer three questions on its own: what does it do, how do you use it, and
what does it depend on. If you can't change a component's internals without breaking a
consumer, the boundary is wrong. There is no test suite here and no second reviewer, so the
boundary *is* the safety net — smaller, well-bounded files are the ones still readable in
six months, and the ones an AI agent edits reliably. A 1000-line page is where both humans
and agents make mistakes.

## Enforcement

Structure rules decay unless something checks them, and there is no test suite here.
`scripts/check-structure.sh` runs in the lefthook pre-commit hook and enforces the
mechanical parts. Six errors:

1. `lib/` imports React — it is meant to be pure functions, understandable by reading.
2. `components/` imports from `pages/` — dependencies run `pages → components → ui`.
3. one module reaches into another's `_components/` — private until promoted, which is the
   whole point of the rule of three.
4. a controller runs a raw query — `DB::`, `->join(`, `->leftJoin(`, `selectRaw(`, `whereRaw(`.
5. money arithmetic in the browser, matched in two stages because the operator is rarely next
   to the field: find `amount`, then find the arithmetic or the `reduce(`.
6. a dialog imported from `@/components/ui/dialog` instead of `@/components/feedback/dialog`.

Page size caps are warnings, not errors. 250 lines is a signal that something wants
extracting, and a signal that blocks the commit stops being read as a signal.

**Rule 6 is the reference's dialog rule, kept for a different reason.** There it existed to
translate one button: the vendored `DialogContent` labels its dismiss button "Close" in
hard-coded English, `sr-only`, where no screen catches it. This app is English-only, so that
argument is gone — and the rule survived anyway, because the same button is a bare `size-4`
icon: a **16px** target against WCAG 2.2 (2.5.8)'s 24px minimum, on the one control in a
dialog somebody in a hurry reaches for. `components/feedback/dialog.tsx` turns the
primitive's button off and renders a 36px `Button` in its place, re-exporting everything
else untouched, so switching a call site is a one-line import change.

The failure it guards is invisible on screen — the dialog looks identical either way — which
is precisely why it is a gate rather than a review comment. It was dropped during the port
planning and reinstated when the wrapper landed; money arithmetic keeps slot 5.
`AlertDialog` is a different component with its own markup and is not covered.

Anything a script can decide should be a script, not a review comment — the same reasoning as
`scripts/check-validation-parity.ts`, which reads `app/Http/Requests` non-recursively (which
is what keeps the starter kit's `Settings/` out) and checks that every field the server
validates is one the browser knows too. One thing to know before writing a FormRequest: it
finds rule keys by matching exactly twelve spaces of indentation, the natural depth of an
inline array literal returned from `rules()` and nothing else. A `rules()` that spreads a base
array yields zero fields, and the gate then passes while checking nothing at all. Keep it an
inline literal.
