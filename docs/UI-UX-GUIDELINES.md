# UI / UX Guidelines

**The bar is product-grade UI, not plain forms.** Every screen should look considered, use
the design system, work in light + dark, and give real feedback.

Stack: **React 19 + Inertia v3 + Tailwind v4 + shadcn/ui + lucide-react**, toasts via
**sonner**, charts via **recharts 3.8.0** through `ui/chart.tsx`. Formatting/lint is
**Biome 2.5.2**. There is no test suite, so the gates in §9 and your own eyes are the whole
safety net.

## 1. Principles

1. **Not just a plain form.** Cards, sections, icons, spacing, states — never a bare stack
   of `<input>`s.
2. **Never black-and-white only.** Use the brand blue for primary actions, links, focus
   and brand marks; keep large surfaces neutral so the colour reads as an accent.
3. **Always give feedback.** Loading, success, error and empty are designed states.
4. **Accessible + responsive by default.** Labels, focus rings, keyboard reach, mobile-first.
5. **Consistent.** Mirror the established patterns instead of inventing new ones.
6. **Plain language.** Written for the person tracking their own money. No dev jargon —
   no "DTO", "global scope", "decimal cast", "hydration". The domain words are the ones a
   user already has: account, category, transaction, transfer, balance, income, expense.

## 2. Colour & theme (design tokens only)

**Use semantic tokens — never hard-code hex, `zinc-*`, `black`, or `white` for surfaces.**
Tokens live in `resources/css/app.css` and adapt to light/dark automatically.
`scripts/ui-guard.sh` rejects raw `#hex` / `rgb()` / `hsl()` in authored TSX; the escape
hatches are a `data:` URI and a `ui-allow` comment on the line.

| Use | Token classes |
|---|---|
| Primary action / brand | `bg-primary text-primary-foreground` |
| Link text | `text-link` / `hover:text-link-hover` |
| Focus ring | `ring-ring` / `focus-visible:ring-ring` |
| Page / card surfaces | `bg-background`, `bg-card`, `bg-popover` |
| Muted surfaces / hover | `bg-muted`, `bg-muted/50`, `bg-secondary`, `bg-accent` |
| Secondary text | `text-muted-foreground` |
| Borders / inputs | `border-border`, `border-input` |
| Destructive **surface** | `<Button variant="destructive">` — fills with `--destructive` |
| Destructive **text** | `text-destructive` — a red icon or label on an ordinary surface |
| Chart series | `var(--chart-1)` … `var(--chart-5)`, assigned in order |

**A link is `text-link`, not `text-primary`.** `--primary` is a *surface* colour: it is
contrast-checked against `--primary-foreground` sitting on top of it, never against the
page behind it, and in dark mode it is deliberately *darker* than its light counterpart
(0.424 vs 0.488) because a button should recede there. As body text on the 0.145
background that is about 2.8:1, well under the 4.5:1 a link needs. `--link` is the same
hue with its lightness chosen per theme against the background it actually sits on.

**The two destructive tokens are not interchangeable — but only one of them is wired
here.** The vendored components read `--destructive` for both jobs: `bg-destructive` (the
solid button) and `text-destructive` (a red label, icon or menu item). One value serves
two contrast requirements because of where the knock-back lives — `ui/button.tsx` carries
`dark:bg-destructive/60`, so in dark mode the surface is the light red at 60% over the
card, compositing to #A24547 with white on it at **6.03:1**, while `text-destructive` is
that same red at full strength on the card at **6.19:1**. Both AA. In light mode one value
already does both: white on it 4.77:1, it on white 4.77:1.

**Do not copy the reference's dark value.** `laravel-ms-ai-v2` sets `--destructive` to
lightness 0.505 in dark because its `button.tsx` predates `dark:bg-destructive/60` and
renders the token raw, so its palette has to do the darkening. Ours must not: 0.505
knocked back again lands on a muddy #693132. `--destructive-foreground` exists, holds the
light red, and is used by nothing in this app today — it is kept for the components being
ported from the reference, which say `text-destructive-foreground`. **Write
`text-destructive` in new code.** The full reasoning sits beside the tokens in `app.css`;
that file is authoritative, not this table.

**`--radius: 0`.** `--radius-sm/md/lg` all derive from it, so `rounded-sm`, `rounded-md`
and `rounded-lg` are square. `rounded-xl` and up are *not* token-derived and will round —
which is why the starter kit's placeholder dashboard tiles have corners nothing else in
the app has. Replacing them is part of building the real dashboard.

**Dark mode is mandatory.** Because everything uses tokens, both themes work by default.
If you must add a custom colour, add a `dark:` variant or a token.

**Measure contrast rather than trusting it.** shadcn's stock destructive button measured
2.89:1 in dark mode in the reference project — usable-looking, and under AA. Getting a
number takes one `getComputedStyle` and a canvas; guessing costs a release.

## 3. Use shadcn/ui — don't hand-roll

Reach for `resources/js/components/ui/` before writing raw HTML. 62 components are
vendored there and the tree is **read-only** — wrap or compose, never edit
(`scripts/ui-guard.sh` blocks modifications; `shadcn add` of a *new* component is fine).

- **Buttons** — use `variant` + `size`. Icon-only buttons need `aria-label` and usually a
  `Tooltip`. Any button inside a form that doesn't submit needs `type="button"`.
- **Inputs** — `<Input>` + `<Label htmlFor>`, a leading lucide icon for context, a
  placeholder, `truncate` on long values.
- **Forms** — Inertia `<Form>` with the render prop `({ processing, errors })`, plus the
  zod gate (§8). Prefer `disableWhileProcessing`. There is no `react-hook-form` and no
  shadcn `form` component here, and neither is coming.
- **Overlays** — a right-hand **`Sheet`** for multi-field create/edit; a **`Dialog`** for
  focused work; an **`AlertDialog`** for a destructive confirmation. Guard against
  dismissing mid-submit.
- **Tables** — compose the `ui/table` primitives, never a raw `<table>`. `ui/table` brings
  its own `overflow-x-auto`, so a wide transaction list scrolls inside its card and the
  body never does. `@tanstack/react-table` is installed and unused; reach for it when a
  list genuinely needs sorting and column state, not before.
- **Icons** — `lucide-react` only, `size-4`/`size-5`, coloured via `currentColor`.
- **`cn`** — authored code imports it from `@/lib/utils` (clsx + tailwind-merge). 56 of the
  vendored files import the npm `cn` package instead; that is the registry's choice, it is
  left alone, and it does not travel outside `ui/`.

## 4. Money on screen

Amounts arrive from the server as **strings** — `"12.50"`, from a `decimal(15,2)` column
exposed through the DTO as `public string $amount` — precisely so JavaScript never turns
one into a float. Format with `formatMoney` from `lib/money.ts`. That is the single place
a currency symbol and a locale are decided, and the single place the `Intl` formatter is
pinned, which is what keeps the SSR render and the browser render producing the same
characters.

**No arithmetic in a component.** No `+`, no `reduce`, no `Number(row.amount) + …`. Every
sum, balance, net and month-total is a SQL expression and arrives as its own field;
`lib/money.ts` formats and parses and deliberately offers no `add()`.
`scripts/check-structure.sh` rule 5 fails on money and an operator in the same line, and
`money-allow` is the escape hatch — wanting one is almost always the signal that the total
belongs in the query.

Don't let colour carry the sign. A `−` / `+`, or the word *income* / *expense*, does the
work; colour only agrees with it.

## 5. Charts

Charts go through the vendored `ui/chart.tsx`: `ChartContainer` with a `ChartConfig`,
`ChartTooltip` / `ChartTooltipContent`, `ChartLegend` / `ChartLegendContent`.
`ChartContainer` emits every config key's colour as `--color-<key>`, so a series reads
`var(--color-groceries)` and the colour is decided once, in the config.

**Colour comes from `--chart-1` … `--chart-5` and nowhere else.** Never a hex — recharts'
`fill="#0ea5e9"` is exactly the shape `ui-guard.sh` catches. **Assign in fixed order**
(chart-1, then 2, then 3) and **never cycle**: two series in the same colour is a worse
failure than a series in an unexpected one. A sixth series folds into **"Other"** — which
is also the right answer for a spending-by-category donut over eleven categories.

**Every chart carries a legend and direct labels.** The five hues are anchored on the
brand blue, spaced around the wheel, and each slot was run through a validator against the
background it actually sits on — lightness band, chroma floor (nothing reads grey), 3:1
contrast, and the colour-vision-deficiency floor on **adjacent** pairs: worst is
raspberry↔bronze at ΔE 8.7 deutan in light, teal↔orange at ΔE 11.9 protan in dark. The
dark ramp is re-stepped against `#171717`, not flipped from light. Adjacent pairs are what
clears — **no five-hue set clears the floor across *all* pairs**. So identity is never
colour alone: label the slice, label the last point of the line, keep the legend. A reader
with deutan vision should be able to name every series with the colours removed.

**No dual-axis charts.** Two scales on one plot invite a comparison the geometry does not
support — where the lines cross is an artifact of the two ranges. Two stacked plots sharing
an x-axis say the same thing honestly.

**Sequential data is one hue, light → dark.** `--chart-1..5` is a *qualitative* set: five
hues meant to be told apart at a glance, not five steps of a ramp. Six months of a trend
are ordered, not categorical — one series, and the x-axis carries the order.

**The numbers on a chart are the server's.** Parse a decimal string to a number for the
geometry (a bar needs a number to be tall) and print the server's string in the tooltip,
the axis and the total beside it. Never sum the series in the browser to produce the
figure above the chart.

Charts render under SSR like everything else: no `Date.now()` for a "today" marker, no
`Math.random()` for a key. The range comes in as a prop.

## 6. UX patterns (required)

- **Loading** — disable the submit, show a `Spinner` and a "…" label. Never leave a click
  with no response.
- **Empty states** — `Empty` + `EmptyMedia` + `EmptyTitle` + `EmptyDescription` +
  `EmptyContent` from `ui/empty.tsx`: icon tile, heading, one line of explanation, one
  primary CTA. Not a bare "No items." A fresh install of this app is *nothing but* empty
  states — no accounts, no categories, no transactions this month — so they are the first
  screens anyone sees, not an edge case.
- **Validation errors** — render under each field with `<InputError>`, paired with
  `aria-invalid` + `aria-describedby` (+ `role="alert"`). Form-level errors go to
  `<AlertError errors={[…]} />`, which dedupes and renders a destructive `Alert`.
- **Success / failure** — flash it from the controller:
  `Inertia::flash('toast', ['type' => 'success', 'message' => 'Transaction saved.'])`.
  `useFlashToast` is mounted once inside the `Toaster` and turns it into a sonner toast, so
  a page never wires this up itself. Then close the overlay and reflect the change.
- **Destructive actions** — confirm first with an `AlertDialog`, style the action
  `destructive`, and name the thing being deleted in the prompt.
- **Lists** — search/filter with a live count, and a "no results" state distinct from the
  empty state. "No transactions match *rent*" is not "You have no transactions yet."
- **Timestamps** — relative ("2h ago") with the absolute time on hover. Compute the
  relative part after mount; `Date.now()` in render is a hydration mismatch and
  `ui-guard.sh` blocks it.
- **Responsive** — mobile-first; the body must **never** scroll horizontally. The sidebar
  is a drawer below `lg` and pinned at `lg`+; the content area carries `min-w-0
  overflow-x-clip` so a wide child clips inside its own box instead of pushing the page.
  Verify at 375 / 768 / 1024.
- **Keyboard & a11y** — labels bound to inputs, visible `focus-visible` rings, icon buttons
  labelled, and respect reduced-motion. Never use a **positive** `tabIndex`; DOM order is
  the tab order.
- **SSR safety** — SSR is on (`config/inertia.php`). Anything derived from
  `Date`/`window`/timezone is computed post-mount, and `Intl` is pinned rather than left to
  the runtime's default locale. This is a hard rule because nothing else catches a
  hydration mismatch — there are no tests and no per-phase browser pass.
- **Honesty** — only show data that actually exists. No invented metrics, no placeholder
  charts left in as decoration, no action without a backing endpoint. The starter kit's
  `PlaceholderPattern` tiles on the dashboard are placeholders to *delete*, not a pattern
  to copy.

## 7. Layout & shell

- Authenticated areas use the shadcn **inset sidebar** shell: `AppShell` →`AppSidebar`
  (`variant="inset"`, `collapsible="icon"`) → `AppContent` (a `SidebarInset`) with
  `AppSidebarHeader` on top — sidebar trigger, breadcrumbs, user menu.
- **Pages do not import a layout.** `app.tsx` assigns one by page name: `auth/*` gets
  `AuthLayout`, `settings/*` gets `[AppLayout, SettingsLayout]`, `welcome` gets none, and
  everything else gets `AppLayout`. A new module under `pages/` is wrapped automatically.
- Auth pages currently render the **simple** variant — `layouts/auth-layout.tsx` points at
  `auth/auth-simple-layout`. The card and split-screen variants are vendored beside it;
  switching is a one-line import change in that file, not a per-page decision.
- Pages own their `<Head title>` and declare breadcrumbs on the component:
  `Dashboard.layout = { breadcrumbs: [{ title: 'Dashboard', href: dashboard() }] }`, with
  the `href` from Wayfinder — never a hand-written string.

## 8. Validation is two-layer

Every form has a Laravel FormRequest (the source of truth) **and** a zod schema that
refuses the same thing in the browser before the request is sent. Wire it with
`useZodGate(schema)` spread onto the Inertia `<Form>` (with `noValidate` — without it the
browser's own bubble fires first and the gate never runs). zod's issue paths match
Inertia's error-bag keys, so one `<InputError>` per field renders whichever source failed.

Messages are **plain English strings written in the schema**. There is no translation key
indirection here and no `t()` — when porting a schema from the reference, replace
`'validation.attributes.name'` and friends with the sentence you actually want the user to
read.

Schemas are found by convention: `app/Http/Requests/CategoryRequest.php` →
`resources/js/lib/validation/schemas/category.ts`, exporting something ending in `Schema`.
`bun run check:validation` fails the build if a server-validated field has no browser-side
counterpart. Adding a FormRequest without a schema is a build failure, by design.

**One trap worth knowing before you write a `rules()`.** The gate finds rule keys by
matching **exactly twelve spaces of indentation** — the natural depth of an inline array
literal returned from `rules()`, and nothing else. A `rules()` that spreads a base array,
or is formatted differently, yields *zero* fields, and the gate then passes while checking
nothing at all. Keep `rules()` an inline literal, and if you change its shape, delete a zod
key on purpose and confirm the gate still goes red.

## 9. Before finalizing a UI change

1. `bun run check` to write fixes, then `bun run check:ci` — **0 errors**.
2. `bun run types:check` passes.
3. `bun run check:structure` — and `bun run check:validation` if a form or FormRequest was
   touched, `bun run check:generated-types` if an `app/Data` class was.
4. `bash scripts/ui-guard.sh` runs at pre-commit over staged files; run it by hand while
   you are still deep in TSX rather than discovering a hex literal at commit time.
5. `vendor/bin/pint --test` and `vendor/bin/phpstan analyse` (level 7, no baseline) if any
   PHP moved; `bun run build` before handing over.
6. Eyeball it in **both** light and dark.
7. Check it at **375 / 768 / 1024** — no horizontal scroll on the body — and tab through it.

**The browser pass is not per phase.** There is exactly **one** end-to-end Playwright run
over every feature, at the end of slice 1, when the user asks for it. Do not drive the
browser during a phase; that rule came from the reference project and it does not apply
here. Get the gates green, leave the changes in the working tree, and stop.
