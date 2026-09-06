import { Head } from '@inertiajs/react';
import { Tags } from 'lucide-react';
import { CategoryBadge } from '@/components/data/category-badge';
import { ColumnHeader, heading } from '@/components/data/column-header';
import { DataTable } from '@/components/data/data-table';
import { DateCell } from '@/components/data/date-cell';
import { FilterPanel } from '@/components/data/filter-panel';
import { SelectFilter } from '@/components/data/select-filter';
import { columnsFor } from '@/components/data/table';
import { EmptyState } from '@/components/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { CATEGORY_KIND_LABELS, CATEGORY_KINDS } from '@/lib/labels';
import { CategoryActions } from '@/pages/categories/_components/category-actions';
import { NewCategoryButton } from '@/pages/categories/_components/new-category-button';
import { index } from '@/routes/categories';
import type { Paginated, ResourceFilters } from '@/types';

/** Generated from App\Data\CategoryData — `bun run types:generate`. */
type Category = App.Data.CategoryData;

type Props = {
    categories: Paginated<Category>;
    filters: ResourceFilters;
};

/**
 * Built once at module scope — see {@link AccountsIndex} for why.
 *
 * The list is deliberately flat: there is no `parent_id`, so there is no tree to render
 * and no depth column. Sub-categories are recorded in docs/ROADMAP.md as a thing to add
 * only if the flat list stops being enough.
 */
const column = columnsFor<Category>();

const columns = column.columns([
    column.accessor('name', {
        ...heading('Name'),
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <CategoryBadge
                    name={row.original.name}
                    colour={row.original.colour}
                    icon={row.original.icon}
                    className="font-medium"
                />
                {row.original.is_archived && (
                    <Badge variant="outline" className="text-muted-foreground">
                        Archived
                    </Badge>
                )}
            </div>
        ),
    }),
    column.accessor('kind', {
        ...heading('Kind'),
        cell: ({ row }) => (
            <span className="text-muted-foreground">
                {CATEGORY_KIND_LABELS[row.original.kind]}
            </span>
        ),
    }),
    column.accessor('created_at', {
        ...heading('Added', { hideBelow: 'md' }),
        cell: ({ row }) => <DateCell iso={row.original.created_at} />,
    }),
    column.display({
        id: 'actions',
        header: () => <ColumnHeader label="Actions" />,
        cell: ({ row }) => <CategoryActions category={row.original} />,
        meta: { align: 'end', width: 'w-12' },
    }),
]);

export default function CategoriesIndex({ categories, filters }: Props) {
    return (
        <>
            <Head title="Categories" />

            <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="font-semibold text-2xl tracking-tight">
                            Categories
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            What money was earned from, and what it was spent
                            on.
                        </p>
                    </div>
                    <NewCategoryButton />
                </div>

                <DataTable
                    href={index().url}
                    page={categories}
                    filters={filters}
                    columns={columns}
                    getRowId={(category) => String(category.id)}
                    only={['categories']}
                    searchPlaceholder="Search categories"
                    noMatch={{
                        title: 'No categories match',
                        description: `Nothing here is called “${filters.search}”.`,
                    }}
                    toolbar={(filter) => (
                        <FilterPanel filter={filter}>
                            <SelectFilter
                                label="Kind"
                                allLabel="Income and expense"
                                value={filter.values.kind ?? ''}
                                onChange={(value) => filter.set('kind', value)}
                                options={CATEGORY_KINDS.map((value) => ({
                                    value,
                                    label: CATEGORY_KIND_LABELS[value],
                                }))}
                            />

                            <SelectFilter
                                label="Archived"
                                allLabel="Active only"
                                value={filter.values.archived ?? ''}
                                onChange={(value) =>
                                    filter.set('archived', value)
                                }
                                options={[
                                    { value: '1', label: 'Include archived' },
                                ]}
                            />
                        </FilterPanel>
                    )}
                    emptyState={
                        <EmptyState
                            icon={Tags}
                            title="No categories yet"
                            description="Add a few labels — Food, Transport, Salary — and the dashboard can start showing where the money goes."
                            action={<NewCategoryButton />}
                        />
                    }
                />
            </div>
        </>
    );
}

CategoriesIndex.layout = {
    breadcrumbs: [{ title: 'Categories', href: index() }],
};
