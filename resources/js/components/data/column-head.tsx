import type { Header, RowData } from '@tanstack/react-table';
import { FlexRender } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { columnClasses, type features } from '@/components/data/table';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ResourceFilters } from '@/types';

/**
 * One heading in the table's header row, and the sort control when the column has one.
 *
 * **Which headings are clickable comes from the server.** `filters.sortable` is the same
 * allow-list that guards `ORDER BY` — `RendersResourceIndex` interpolates the column name
 * into `orderBy`, so the whitelist is a security control rather than a convenience — and
 * echoing it to the client means there is no second copy to disagree with it. A page
 * declares no sortability at all.
 *
 * Uses the standalone `FlexRender` rather than the `table.FlexRender` bound to an
 * instance, which is what lets this live away from the table that owns the instance.
 */
export function ColumnHead<TRow extends RowData>({
    header,
    filters,
}: {
    // `any` is the library's own signature for a heterogeneous header — a column array
    // keeps each cell's value type, and one header cannot name all of them.
    header: Header<typeof features, TRow, any>;
    filters: ResourceFilters;
}) {
    const meta = header.column.columnDef.meta;
    const sortable = filters.sortable.includes(header.column.id);
    const active = sortable && filters.sort === header.column.id;

    return (
        <TableHead
            colSpan={header.colSpan}
            aria-sort={
                active
                    ? filters.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                    : undefined
            }
            className={cn(
                'h-11 font-medium text-muted-foreground text-xs first:pl-4 last:pr-4',
                columnClasses(meta),
            )}
        >
            {header.isPlaceholder ? null : sortable ? (
                <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                        'group -mx-2 inline-flex items-center gap-1 rounded-sm px-2 py-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        // The arrow follows the text to the outside edge, so a
                        // right-aligned number column keeps its digits against the gutter.
                        meta?.align === 'end' && 'flex-row-reverse',
                        active && 'text-foreground',
                    )}
                >
                    <FlexRender header={header} />
                    <SortIcon direction={active ? filters.direction : null} />
                </button>
            ) : (
                <FlexRender header={header} />
            )}
        </TableHead>
    );
}

/**
 * The sort arrow. An inactive column still renders one, dimmed, so a header does not
 * change width the moment it is clicked.
 */
function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
    if (direction === 'asc') {
        return <ArrowUp className="size-3.5" />;
    }

    if (direction === 'desc') {
        return <ArrowDown className="size-3.5" />;
    }

    return (
        <ArrowUpDown className="size-3.5 opacity-40 transition-opacity group-hover:opacity-100" />
    );
}
