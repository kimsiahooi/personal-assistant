import type { ReactNode } from 'react';
import type { ColumnMeta } from '@/components/data/table';

/**
 * A column's heading and its entry in the Columns panel, from one name.
 *
 *     column.accessor('type', {
 *         ...heading('Type', { hideBelow: 'sm' }),
 *         cell: ({ row }) => …,
 *     })
 *
 * **The name is written once on purpose.** Rendering the header takes a `HeaderContext`
 * the panel does not have, so a name declared only inside `header` is unreachable from the
 * menu — and the alternative, repeating it in `meta.label`, is two copies of one truth
 * with nothing to keep them equal. This sets both from the same argument.
 *
 * Spread it *before* any other key, and pass presentation through the second parameter
 * rather than a sibling `meta:` — a later `meta:` would replace the label rather than
 * merge with it, and the column would quietly drop out of the panel.
 */
export function heading(
    label: string,
    meta?: Omit<ColumnMeta, 'label'>,
): { header: () => ReactNode; meta: ColumnMeta } {
    return {
        header: () => label,
        meta: { ...meta, label },
    };
}

/**
 * A heading that exists only for screen readers — the column holding row actions.
 *
 * Not routed through {@link heading}, deliberately: an actions column is an *anchor*, and
 * what makes it one is having no `meta.label`. Giving it a label to render this would put
 * "Actions" in the Columns panel as something to hide, which would take the row menu off
 * every row.
 */
export function ColumnHeader({ label }: { label: string }) {
    return <span className="sr-only">{label}</span>;
}
