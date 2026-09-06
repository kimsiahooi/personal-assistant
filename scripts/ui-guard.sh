#!/usr/bin/env bash
#
# UI / code-standards guard, run by the lefthook pre-commit hook. Enforces the
# mechanical parts of the project's standards so nothing lands that breaks them:
#
#   1. No edits to vendored / generated (read-only) trees — wrap or compose instead
#      of forking shadcn `ui/**` (see docs/CODING-STANDARDS.md).
#   2. No raw colour literals (#hex / rgb() / hsl()) or inline colour styles in TSX —
#      everything goes through the design tokens (docs/UI-UX-GUIDELINES.md).
#      Escape hatches: a `data:` URI, or a `ui-allow` comment on the line.
#   3. No nondeterministic values in render output — a React #418 hydration mismatch.
#
# This project runs SSR and has NO test suite, so a hydration mismatch would
# otherwise only surface by eye. Rule 3 is the cheapest guard against that.
#
# `resources/css/app.css` is deliberately NOT read-only: it holds the authored design
# tokens. It is excluded from Biome only because Biome cannot parse Tailwind v4
# at-rules (@theme, @utility) — that is a formatting limitation, not a vendored tree.
set -euo pipefail

staged=$(git diff --cached --name-only --diff-filter=ACM)
[ -z "$staged" ] && exit 0

fail=0

# Every path here is either vendored or gitignored, which is what makes "no
# modifications" the right rule for it: a gitignored tree can never appear as MODIFIED
# in a commit, so the rule only ever fires on a genuine hand-edit.
#
# `resources/js/types/generated.d.ts` is deliberately NOT listed here. It is generated
# but COMMITTED, so it is supposed to change in commits — every regeneration would have
# tripped this rule and the only way past would have been to skip the hook. It is
# guarded by staleness instead: `bun run check:generated-types` fails if it does not
# match what `app/Data` would produce, which catches the stale file AND the hand-edit,
# rather than blocking the legitimate case.
readonly_re='^(resources/js/components/ui/|resources/js/routes/|resources/js/actions/|resources/js/wayfinder/|bootstrap/ssr/)'

# 1) Read-only / generated trees — MODIFIED or DELETED only.
# Additions are how vendored code legitimately arrives (`shadcn add`, a Wayfinder
# regeneration, the initial import). Hand-EDITING an existing primitive is the thing
# that breaks other screens, so that is what this blocks.
modified=$(git diff --cached --name-only --diff-filter=MD)
blocked=$(printf '%s\n' "$modified" | grep -E "$readonly_re" || true)
if [ -n "$blocked" ]; then
    # One legitimate way an EXISTING primitive changes: `shadcn add <name> --overwrite`,
    # when a newly added component needs a newer generation of one already vendored
    # (command.tsx needing dialog.tsx's showCloseButton is the case that found this).
    # That is still "from shadcn" — it is not the hand-edit this rule exists to stop.
    #
    # It cannot be told apart by reading the file, so it is told apart by intent:
    # SHADCN_UPDATE=1 says a person meant it. Deliberately NOT `--no-verify`, which
    # would also skip biome, pint, tsc and the design-token checks — the point is to
    # excuse this one rule and keep every other one running.
    ui_only=$(printf '%s\n' "$blocked" | grep -vE '^resources/js/components/ui/' || true)

    if [ "${SHADCN_UPDATE:-}" = "1" ] && [ -z "$ui_only" ]; then
        echo "• vendored shadcn update allowed by SHADCN_UPDATE=1 — check the diff is the registry's, not a hand-edit:" >&2
        printf '   %s\n' "$blocked" >&2
    else
        echo "✗ Edits to vendored/generated (read-only) files are not allowed — wrap/compose instead:" >&2
        printf '   %s\n' "$blocked" >&2
        if [ -z "$ui_only" ]; then
            echo "   If this is a deliberate 'shadcn add --overwrite', re-run with SHADCN_UPDATE=1." >&2
        fi
        fail=1
    fi
fi

# 2/3) Design tokens + SSR determinism, in authored TSX.
# The `(^|[^&])` guard keeps HTML numeric entities out of it: `&#8209;` (a
# non-breaking hyphen) is not a hex colour, and neither is any other `&#nnnn;`.
color_re='(^|[^&])#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\('
ssr_re='Date\.now\(|Math\.random\('
touched_ui=0
# Vendored/generated files are excluded: the policy is "don't edit them", so
# reporting findings inside them is unactionable noise. Known hazards in that tree
# are recorded in docs/ROADMAP.md instead.
for f in $(printf '%s\n' "$staged" | grep -E '\.tsx$' | grep -vE "$readonly_re" || true); do
    [ -f "$f" ] || continue
    touched_ui=1
    hits=$(grep -nE "$color_re" "$f" | grep -vE 'data:|ui-allow' || true)
    if [ -n "$hits" ]; then
        echo "✗ $f uses a raw colour literal — use the design tokens (or mark the line 'ui-allow'):" >&2
        printf '%s\n' "$hits" | sed 's/^/     /' >&2
        fail=1
    fi
    ssr_hits=$(grep -nE "$ssr_re" "$f" | grep -v 'ui-allow' || true)
    if [ -n "$ssr_hits" ]; then
        echo "✗ $f has a nondeterministic value in render (Date.now/Math.random) — compute it in useEffect or pin it, or mark the line 'ui-allow':" >&2
        printf '%s\n' "$ssr_hits" | sed 's/^/     /' >&2
        fail=1
    fi
done

if [ "$touched_ui" -eq 1 ]; then
    echo "• UI checklist: branded (not plain); every state (loading/empty/error/success); light + dark; 375/768/1024." >&2
fi

exit "$fail"
