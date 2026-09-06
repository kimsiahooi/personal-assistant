import { DateRangeFilter } from '@/components/data/date-range-filter';
import { FilterPanel } from '@/components/data/filter-panel';
import { SelectFilter } from '@/components/data/select-filter';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPES } from '@/lib/labels';
import { useLedger } from '@/pages/transactions/_components/ledger-context';
import type { FilterApi } from '@/types';

/**
 * The four things the ledger narrows by: account, category, type and a date range.
 *
 * Every control routes its change back through {@link FilterApi} rather than issuing a
 * visit of its own — that is what keeps "narrowing the results starts again at page 1" in
 * one place. The date range uses `setMany`, because two bounds are one decision.
 *
 * The archived accounts and categories are absent from these lists on purpose: the
 * controller sends only active ones, so a filter cannot offer something that has been put
 * away. A transaction against an archived account still appears in the list — it happened
 * — it just cannot be filtered *to* by name.
 */
export function LedgerFilters({ filter }: { filter: FilterApi }) {
    const ledger = useLedger();

    return (
        <FilterPanel filter={filter}>
            <SelectFilter
                label="Account"
                allLabel="All accounts"
                value={filter.values.account_id ?? ''}
                onChange={(value) => filter.set('account_id', value)}
                options={ledger.accounts.map((account) => ({
                    value: String(account.id),
                    label: account.name,
                }))}
            />

            <SelectFilter
                label="Category"
                allLabel="All categories"
                value={filter.values.category_id ?? ''}
                onChange={(value) => filter.set('category_id', value)}
                options={ledger.categories.map((category) => ({
                    value: String(category.id),
                    label: category.name,
                }))}
            />

            <SelectFilter
                label="Type"
                allLabel="All types"
                value={filter.values.type ?? ''}
                onChange={(value) => filter.set('type', value)}
                options={TRANSACTION_TYPES.map((value) => ({
                    value,
                    label: TRANSACTION_TYPE_LABELS[value],
                }))}
            />

            <DateRangeFilter
                from={filter.values.from ?? ''}
                to={filter.values.to ?? ''}
                today={ledger.today}
                onChange={(range) => filter.setMany(range)}
            />
        </FilterPanel>
    );
}
