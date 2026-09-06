import type { RowData } from '@tanstack/react-table';
import {
    columnOrderingFeature,
    columnVisibilityFeature,
    createColumnHelper,
    metaHelper,
    rowPaginationFeature,
    rowSortingFeature,
    tableFeatures,
} from '@tanstack/react-table';

/**
 * The table vocabulary every list in the app shares: which TanStack features are
 * registered, and what a column may say about itself beyond its cell.
 *
 * v9 registers nothing by default — `table.setPageSize` and
 * `column.getToggleSortingHandler` do not exist until their feature is listed here.
 *
 * Note what is *absent*: `createSortedRowModel` and `createPaginatedRowModel`, the
 * client-side processing stages. Sorting and paging happen in SQL, so `data` is already
 * the right page in the right order; registering those models would re-sort the rows on
 * screen and call it a global sort.
 *
 * Visibility and ordering are the exception, and the reason they *are* registered: which
 * columns you look at and in what order is a question about the screen, not about the
 * query. SQL has no opinion on it and no round trip could answer it better.
 */
export const features = tableFeatures({
    rowSortingFeature,
    rowPaginationFeature,
    columnVisibilityFeature,
    columnOrderingFeature,
    columnMeta: metaHelper<ColumnMeta>(),
});

/** Which breakpoint a column appears at. Below it, the column is not rendered. */
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Presentation a column declares about itself, rather than each cell repeating the same
 * Tailwind by hand. Naming the intent — `numeric`, `hideBelow: 'sm'` — makes it checkable
 * that two columns with the same purpose behave the same way, which free-text classes do
 * not.
 */
export type ColumnMeta = {
    /**
     * This column's name, somewhere the Columns panel can read it.
     *
     * **Its presence is what makes a column configurable at all.** A column with a label
     * can be hidden and reordered; one without is an *anchor* — always rendered, fixed
     * where it was declared. That is why the `actions` column needs no flag saying so: it
     * has no name worth listing, and pinning it is the same fact.
     *
     * Set it through {@link heading}, never by hand, so the name the header renders and
     * the name the panel lists cannot drift apart.
     */
    label?: string;
    /**
     * Off until somebody asks for it.
     *
     * For a column worth having and not worth the width by default — free text that would
     * crush the columns carrying numbers, a secondary date. Distinct from `hideBelow`,
     * which is about the screen rather than about the reader.
     */
    defaultHidden?: boolean;
    /** Hide below this breakpoint. A phone should not scroll to read the first column. */
    hideBelow?: Breakpoint;
    /** Right-align — money, counts, and anything read by its last digit. */
    align?: 'end';
    /** Lining figures, so digits stack in a column instead of wandering. */
    numeric?: boolean;
    /** A width utility for a column that should not stretch, e.g. `w-12` for actions. */
    width?: string;
};

/**
 * Column definitions for a row type.
 *
 *     const column = columnsFor<Account>();
 *     const columns = column.columns([
 *         column.accessor('name', { ...heading('Name'), cell: … }),
 *     ]);
 *
 * **A column's id is the column the server sorts by.** `accessor('name', …)` is sortable
 * as `name` if — and only if — the controller's allow-list contains it; the table reads
 * that list from `filters.sortable` and makes exactly those headers clickable. Nothing in
 * the page decides it.
 */
export function columnsFor<TRow extends RowData>() {
    return createColumnHelper<typeof features, TRow>();
}

/** Tailwind cannot see a class it has to build at runtime, so the map is spelled out. */
const HIDE_BELOW: Record<Breakpoint, string> = {
    sm: 'hidden sm:table-cell',
    md: 'hidden md:table-cell',
    lg: 'hidden lg:table-cell',
    xl: 'hidden xl:table-cell',
};

/** The classes a column's meta asks for, for both its header and its cells. */
export function columnClasses(meta: ColumnMeta | undefined): string {
    if (!meta) {
        return '';
    }

    return [
        meta.hideBelow ? HIDE_BELOW[meta.hideBelow] : '',
        meta.align === 'end' ? 'text-right' : '',
        meta.numeric ? 'tabular-nums' : '',
        meta.width ?? '',
    ]
        .filter(Boolean)
        .join(' ');
}
