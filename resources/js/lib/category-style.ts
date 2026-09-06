/**
 * What a category's `colour` and `icon` columns are allowed to say, and what they mean on
 * screen.
 *
 * **`colour` holds a token name — `chart-1` … `chart-5` — not a hex.** That is the whole
 * point: the five chart tokens were validated against the surfaces they sit on (lightness
 * band, chroma floor, 3:1 contrast, adjacent-pair colour-vision separation, and re-stepped
 * rather than flipped for dark mode — see `resources/css/app.css`), and a free-text colour
 * would let any of that be undone one category at a time. A category picks a validated
 * slot; it does not invent a colour. The same value is what the dashboard's donut reads,
 * so a category is the same colour in the list and in the chart without either side
 * knowing about the other.
 *
 * Tailwind cannot see a class assembled at runtime, so both maps are spelled out. A value
 * outside them — a hand-edited row — falls back rather than rendering nothing.
 *
 * Pure data. No React.
 */

/** The five slots a category may take, in the order the picker offers them. */
export const CATEGORY_COLOURS = [
    'chart-1',
    'chart-2',
    'chart-3',
    'chart-4',
    'chart-5',
] as const;

export type CategoryColour = (typeof CATEGORY_COLOURS)[number];

/** Human names for the slots, so the picker is not a list of five identical words. */
export const CATEGORY_COLOUR_LABELS: Record<CategoryColour, string> = {
    'chart-1': 'Blue',
    'chart-2': 'Orange',
    'chart-3': 'Teal',
    'chart-4': 'Bronze',
    'chart-5': 'Raspberry',
};

const SWATCH: Record<CategoryColour, string> = {
    'chart-1': 'bg-chart-1',
    'chart-2': 'bg-chart-2',
    'chart-3': 'bg-chart-3',
    'chart-4': 'bg-chart-4',
    'chart-5': 'bg-chart-5',
};

const INK: Record<CategoryColour, string> = {
    'chart-1': 'text-chart-1',
    'chart-2': 'text-chart-2',
    'chart-3': 'text-chart-3',
    'chart-4': 'text-chart-4',
    'chart-5': 'text-chart-5',
};

/**
 * The foreground utility for a stored colour, for a category's icon.
 *
 * An icon is a *graphical* object, so the bar it has to clear is 3:1 — which is what these
 * five slots were validated against. They are not cleared for 4.5:1 body text, and nothing
 * should use them for words.
 */
export function inkClass(colour: string | null): string {
    return colour !== null && colour in INK
        ? INK[colour as CategoryColour]
        : 'text-muted-foreground';
}

/** The background utility for a stored colour, or a neutral one for anything unknown. */
export function swatchClass(colour: string | null): string {
    return colour !== null && colour in SWATCH
        ? SWATCH[colour as CategoryColour]
        : 'bg-muted-foreground/40';
}

/**
 * The CSS value the same colour has, for a chart series.
 *
 * `var(--chart-1)`, not the resolved colour: the token differs between light and dark, and
 * resolving it here would freeze one of them into the markup.
 */
export function swatchVar(colour: string | null): string {
    return colour !== null && colour in SWATCH
        ? `var(--${colour})`
        : 'var(--muted-foreground)';
}
