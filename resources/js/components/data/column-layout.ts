import type { ColumnMeta } from '@/components/data/table';

/**
 * What the Columns panel does to a set of column definitions, as pure functions.
 *
 * Beside `table.ts` rather than in `lib/`, for the same reason `table.ts` is: it is the
 * table's own vocabulary, and it needs {@link ColumnMeta}. `lib/` reaching into
 * `components/` would run the dependency arrow backwards — the rule that matters more
 * here than "pure code lives in lib/", which this file satisfies anyway. Nothing in it
 * imports React.
 *
 * **The central idea is the anchor.** A column with a `meta.label` is configurable: the
 * reader can hide it and move it. A column without one is an anchor — always rendered, and
 * always at the index where it was declared. Row actions are the anchor that exists today;
 * a future select-checkbox column would be one at the *other* end, which is why anchors
 * are re-inserted at their declared index rather than pushed to the back.
 */

/** The part of a column definition this module reads. */
type Described = {
    id?: string;
    accessorKey?: unknown;
    meta?: ColumnMeta;
};

/** A column the reader is allowed to hide and move. */
export type ConfigurableColumn = {
    id: string;
    label: string;
    /** Set when the column also disappears on narrow screens, so the panel can say so. */
    hideBelow?: ColumnMeta['hideBelow'];
};

/** What the reader has decided, over and above the declarations. */
export type ColumnLayout = {
    /** Configurable ids, in the order they should appear. */
    order: string[];
    /** Configurable ids the reader turned off. */
    hidden: string[];
};

/**
 * A column's id, by the same rule TanStack uses: an explicit `id` wins, otherwise the
 * accessor key. Every column in the app has one or the other — there are no
 * accessor-function columns — so this never returns an empty string in practice.
 */
function columnId(column: Described): string {
    return column.id ?? String(column.accessorKey ?? '');
}

/** The columns the panel lists, in declaration order. */
export function configurableColumns(
    columns: readonly Described[],
): ConfigurableColumn[] {
    const found: ConfigurableColumn[] = [];

    for (const column of columns) {
        const label = column.meta?.label;

        if (label !== undefined) {
            found.push({
                id: columnId(column),
                label,
                hideBelow: column.meta?.hideBelow,
            });
        }
    }

    return found;
}

/** The layout the columns declare for themselves, before anyone touches the panel. */
export function defaultLayout(columns: readonly Described[]): ColumnLayout {
    const order: string[] = [];
    const hidden: string[] = [];

    for (const column of columns) {
        if (column.meta?.label === undefined) {
            continue;
        }

        const id = columnId(column);
        order.push(id);

        if (column.meta.defaultHidden === true) {
            hidden.push(id);
        }
    }

    return { order, hidden };
}

/**
 * The full order TanStack wants: the reader's configurable columns, with every anchor put
 * back where it was declared.
 *
 * Anchors are applied in ascending declared index, which is what makes the running
 * `splice` land each one on the right slot — by the time an anchor at index *i* is
 * inserted, every anchor before it is already in place.
 */
export function toColumnOrder(
    layout: ColumnLayout,
    columns: readonly Described[],
): string[] {
    const declared = columns.map(columnId);
    const configurable = new Set(configurableColumns(columns).map((c) => c.id));

    // The reader's order, minus anything that no longer exists. A layout outlives the
    // columns it names: a deploy removes one, renames one, adds one, and the layout has to
    // survive all three without the table losing a column or throwing.
    const ordered = layout.order.filter((id) => configurable.has(id));

    // Anything declared since goes back where it was declared — just after the nearest
    // earlier column that is still there — rather than on the end. Appending is the
    // obvious thing and it is subtly wrong: a column added between two others would sit
    // last for anyone who had touched the panel and in its proper place for everyone else.
    let previous: string | null = null;

    for (const id of declared) {
        if (!configurable.has(id)) {
            continue;
        }

        if (!ordered.includes(id)) {
            const after = previous === null ? -1 : ordered.indexOf(previous);

            ordered.splice(after + 1, 0, id);
        }

        previous = id;
    }

    declared.forEach((id, index) => {
        if (!configurable.has(id)) {
            ordered.splice(index, 0, id);
        }
    });

    return ordered;
}

/**
 * The visibility map, which names only what is *off*. Anchors never appear in it — a
 * column the panel cannot reach is a column it cannot hide.
 */
export function toColumnVisibility(
    layout: ColumnLayout,
): Record<string, boolean> {
    return Object.fromEntries(layout.hidden.map((id) => [id, false]));
}

/** Move one column, for both the drag and the up/down buttons. */
export function moveColumn(
    order: readonly string[],
    from: number,
    to: number,
): string[] {
    if (from === to || from < 0 || to < 0 || from >= order.length) {
        return [...order];
    }

    const next = [...order];
    const [moved] = next.splice(from, 1);

    if (moved === undefined) {
        return next;
    }

    next.splice(Math.min(to, next.length), 0, moved);

    return next;
}

/** Whether there is anything for Reset to undo. */
export function isDefaultLayout(
    layout: ColumnLayout,
    columns: readonly Described[],
): boolean {
    const base = defaultLayout(columns);

    if (layout.order.length !== base.order.length) {
        return false;
    }

    if (!layout.order.every((id, index) => id === base.order[index])) {
        return false;
    }

    // "Which columns are off" is a set, not a sequence: two readers who arrived at the
    // same columns by different routes have not made different choices.
    const off = new Set(layout.hidden);

    return (
        off.size === base.hidden.length &&
        base.hidden.every((id) => off.has(id))
    );
}
