import { Head } from '@inertiajs/react';
import { ArrowLeftRight } from 'lucide-react';
import { CategoryBadge } from '@/components/data/category-badge';
import { ColumnHeader, heading } from '@/components/data/column-header';
import { DataTable } from '@/components/data/data-table';
import { DayCell } from '@/components/data/date-cell';
import { MoneyCell } from '@/components/data/money-cell';
import { NotesCell } from '@/components/data/notes-cell';
import { columnsFor } from '@/components/data/table';
import { TRANSACTION_TYPE_LABELS } from '@/lib/labels';
import { LedgerProvider } from '@/pages/transactions/_components/ledger-context';
import { LedgerEmpty } from '@/pages/transactions/_components/ledger-empty';
import { LedgerFilters } from '@/pages/transactions/_components/ledger-filters';
import { NewTransactionButton } from '@/pages/transactions/_components/new-transaction-button';
import { TransactionActions } from '@/pages/transactions/_components/transaction-actions';
import { index } from '@/routes/transactions';
import type { Paginated, ResourceFilters } from '@/types';

/** Generated from App\Data — `bun run types:generate`. */
type Transaction = App.Data.TransactionData;
type Category = App.Data.CategoryData;

type Props = {
    transactions: Paginated<Transaction>;
    filters: ResourceFilters;
    accounts: { id: number; name: string }[];
    categories: Category[];
    /** The viewer's today, resolved server-side. See `LocalDate::today()`. */
    today: string;
};

/**
 * Built once at module scope — see {@link AccountsIndex}.
 *
 * **Two ids here do not match their fields, on purpose.** A column's id is the column the
 * server sorts by, and the ledger sorts by `occurred_at` (the stored UTC instant) while it
 * *renders* `occurred_on` (the local day derived from it). Naming the column after the
 * field would make the header un-clickable, because `occurred_on` is not in the
 * controller's allow-list and never can be — there is no such column to order by.
 */
const column = columnsFor<Transaction>();

const columns = column.columns([
    column.accessor('occurred_on', {
        id: 'occurred_at',
        ...heading('Date', { numeric: true }),
        cell: ({ row }) => <DayCell day={row.original.occurred_on} />,
    }),
    column.accessor('account_name', {
        ...heading('Account'),
        cell: ({ row }) =>
            row.original.type === 'transfer' ? (
                // A transfer is one event across two accounts, and the list shows the leg
                // the money left. Naming both is what stops "Maybank -RM 200" reading as
                // money that simply vanished.
                <span className="inline-flex min-w-0 items-center gap-1.5">
                    <span className="truncate">
                        {row.original.account_name}
                    </span>
                    <ArrowLeftRight
                        aria-hidden
                        className="size-3.5 shrink-0 text-muted-foreground"
                    />
                    <span className="truncate text-muted-foreground">
                        {row.original.transfer_counterpart_name ?? '—'}
                    </span>
                </span>
            ) : (
                row.original.account_name
            ),
    }),
    column.accessor('category_name', {
        ...heading('Category', { hideBelow: 'md' }),
        cell: ({ row }) =>
            row.original.type === 'transfer' ? (
                // Not "uncategorised" — a transfer never has one. Moving your own money is
                // not spending, and counting it as such would double every total.
                <span className="text-muted-foreground text-xs">Transfer</span>
            ) : (
                <CategoryBadge
                    name={row.original.category_name}
                    colour={row.original.category_colour}
                    icon={row.original.category_icon}
                />
            ),
    }),
    column.accessor('type', {
        ...heading('Type', { hideBelow: 'xl', defaultHidden: true }),
        cell: ({ row }) => (
            <span className="text-muted-foreground">
                {TRANSACTION_TYPE_LABELS[row.original.type]}
            </span>
        ),
    }),
    column.accessor('note', {
        ...heading('Note', { hideBelow: 'lg', width: 'max-w-xs truncate' }),
        cell: ({ row }) => <NotesCell note={row.original.note} />,
    }),
    column.accessor('amount', {
        ...heading('Amount', { align: 'end', numeric: true }),
        cell: ({ row }) => (
            <MoneyCell
                amount={row.original.amount}
                currency={row.original.currency}
                muted={row.original.type === 'transfer'}
            />
        ),
    }),
    column.display({
        id: 'actions',
        header: () => <ColumnHeader label="Actions" />,
        cell: ({ row }) => <TransactionActions transaction={row.original} />,
        meta: { align: 'end', width: 'w-12' },
    }),
]);

export default function TransactionsIndex({
    transactions,
    filters,
    accounts,
    categories,
    today,
}: Props) {
    return (
        <LedgerProvider
            accounts={accounts}
            categories={categories}
            today={today}
        >
            <Head title="Transactions" />

            <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="font-semibold text-2xl tracking-tight">
                            Transactions
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Everything that moved, newest first.
                        </p>
                    </div>
                    <NewTransactionButton />
                </div>

                <DataTable
                    href={index().url}
                    page={transactions}
                    filters={filters}
                    columns={columns}
                    getRowId={(transaction) => String(transaction.id)}
                    only={['transactions']}
                    searchPlaceholder="Search notes"
                    noMatch={{
                        title: 'No transactions match',
                        description: `No note mentions “${filters.search}”.`,
                    }}
                    toolbar={(filter) => <LedgerFilters filter={filter} />}
                    emptyState={<LedgerEmpty />}
                />
            </div>
        </LedgerProvider>
    );
}

TransactionsIndex.layout = {
    breadcrumbs: [{ title: 'Transactions', href: index() }],
};
