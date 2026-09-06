import { Head } from '@inertiajs/react';
import { Wallet } from 'lucide-react';
import { ColumnHeader, heading } from '@/components/data/column-header';
import { DataTable } from '@/components/data/data-table';
import { DateCell } from '@/components/data/date-cell';
import { FilterPanel } from '@/components/data/filter-panel';
import { MoneyCell } from '@/components/data/money-cell';
import { NotesCell } from '@/components/data/notes-cell';
import { SelectFilter } from '@/components/data/select-filter';
import { columnsFor } from '@/components/data/table';
import { EmptyState } from '@/components/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { ACCOUNT_TYPE_LABELS } from '@/lib/labels';
import { AccountActions } from '@/pages/accounts/_components/account-actions';
import { NewAccountButton } from '@/pages/accounts/_components/new-account-button';
import { index } from '@/routes/accounts';
import type { Paginated, ResourceFilters } from '@/types';

/** Generated from App\Data\AccountData — `bun run types:generate`. */
type Account = App.Data.AccountData;

type Props = {
    accounts: Paginated<Account>;
    filters: ResourceFilters;
};

/**
 * Built once at module scope: TanStack treats the array as an input, and a fresh one each
 * render rebuilds every column instance. That is also why the row menu owns its own
 * dialogs — see {@link AccountActions} — rather than calling back into page state.
 *
 * A column's id is the column the server would sort by. Which of them are actually
 * clickable is decided by the controller's allow-list, which arrives in `filters.sortable`;
 * nothing here declares it. `balance` and `note` are not on that list — a balance is a
 * computed sum with no column to order by — so their headers render plain.
 */
const column = columnsFor<Account>();

const columns = column.columns([
    column.accessor('name', {
        ...heading('Name'),
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <span className="font-medium">{row.original.name}</span>
                {row.original.is_archived && (
                    <Badge variant="outline" className="text-muted-foreground">
                        Archived
                    </Badge>
                )}
            </div>
        ),
    }),
    column.accessor('type', {
        ...heading('Type', { hideBelow: 'sm' }),
        cell: ({ row }) => (
            <span className="text-muted-foreground">
                {ACCOUNT_TYPE_LABELS[row.original.type]}
            </span>
        ),
    }),
    column.accessor('balance', {
        ...heading('Balance', { align: 'end', numeric: true }),
        cell: ({ row }) => (
            // Summed in SQL — `withSum('transactions', 'amount')` plus the opening balance,
            // added by App\Services\AccountBalances. Nothing here does arithmetic.
            //
            // `signed={false}`: this is what the account holds, not a movement. See
            // MoneyCell — a balance written "+RM 6,200.00" claims it went up by that much.
            <MoneyCell
                amount={row.original.balance}
                currency={row.original.currency}
                signed={false}
            />
        ),
    }),
    column.accessor('opening_balance', {
        ...heading('Opening', {
            align: 'end',
            numeric: true,
            hideBelow: 'lg',
            defaultHidden: true,
        }),
        // Money, so it is formatted like money. It was printing the raw decimal string —
        // "1500.00" beside "RM 1,500.00" in the next column, no symbol and no grouping.
        cell: ({ row }) => (
            <span className="text-muted-foreground">
                <MoneyCell
                    amount={row.original.opening_balance}
                    currency={row.original.currency}
                    signed={false}
                    muted
                />
            </span>
        ),
    }),
    column.accessor('note', {
        ...heading('Note', {
            hideBelow: 'md',
            width: 'max-w-xs truncate',
            defaultHidden: true,
        }),
        cell: ({ row }) => <NotesCell note={row.original.note} />,
    }),
    column.accessor('created_at', {
        ...heading('Added', { hideBelow: 'xl' }),
        cell: ({ row }) => <DateCell iso={row.original.created_at} />,
    }),
    column.display({
        id: 'actions',
        header: () => <ColumnHeader label="Actions" />,
        cell: ({ row }) => <AccountActions account={row.original} />,
        meta: { align: 'end', width: 'w-12' },
    }),
]);

export default function AccountsIndex({ accounts, filters }: Props) {
    return (
        <>
            <Head title="Accounts" />

            <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="font-semibold text-2xl tracking-tight">
                            Accounts
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Every place your money sits, and what each one
                            holds.
                        </p>
                    </div>
                    <NewAccountButton />
                </div>

                <DataTable
                    href={index().url}
                    page={accounts}
                    filters={filters}
                    columns={columns}
                    getRowId={(account) => String(account.id)}
                    only={['accounts']}
                    searchPlaceholder="Search accounts"
                    noMatch={{
                        title: 'No accounts match',
                        description: `Nothing here is called “${filters.search}”.`,
                    }}
                    toolbar={(filter) => (
                        <FilterPanel filter={filter}>
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
                            icon={Wallet}
                            title="No accounts yet"
                            description="Add the places your money sits — a bank account, your wallet — and transactions can start pointing at them."
                            action={<NewAccountButton />}
                        />
                    }
                />
            </div>
        </>
    );
}

AccountsIndex.layout = {
    breadcrumbs: [{ title: 'Accounts', href: index() }],
};
