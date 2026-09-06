import { useState } from 'react';
import { RowActions } from '@/components/data/row-actions';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { useResourceDelete } from '@/hooks/use-resource-delete';
import { formatDay } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { useLedger } from '@/pages/transactions/_components/ledger-context';
import { TransactionFormDialog } from '@/pages/transactions/_components/transaction-form-dialog';
import { destroy } from '@/routes/transactions';

type Transaction = App.Data.TransactionData;

/**
 * What one row can do.
 *
 * The confirmation names the amount and the date rather than saying "this transaction",
 * because a ledger is a column of near-identical rows and the row that opened the dialog
 * is no longer distinguishable once the dialog is over it.
 *
 * A transfer says outright that both legs go. It is one event stored as two rows, and
 * deleting half of it would leave a balance that silently does not add up — see
 * `RecordTransfer::deletePair()`.
 */
export function TransactionActions({
    transaction,
}: {
    transaction: Transaction;
}) {
    const ledger = useLedger();
    const [editing, setEditing] = useState(false);
    const remove = useResourceDelete(
        destroy({ transaction: transaction.id }).url,
    );

    const isTransfer = transaction.type === 'transfer';
    const money = formatMoney(transaction.magnitude, transaction.currency);
    const day = formatDay(transaction.occurred_on);

    return (
        <>
            <RowActions
                name={`${money} on ${day}`}
                onEdit={() => setEditing(true)}
                onDelete={remove.ask}
            />

            <TransactionFormDialog
                open={editing}
                onOpenChange={setEditing}
                accounts={ledger.accounts}
                categories={ledger.categories}
                today={ledger.today}
                transaction={transaction}
            />

            <ConfirmDialog
                open={remove.confirming}
                onOpenChange={remove.onOpenChange}
                title={
                    isTransfer
                        ? `Delete the ${money} transfer on ${day}?`
                        : `Delete the ${money} on ${day}?`
                }
                description={
                    isTransfer
                        ? 'Both sides of the transfer go together — the money leaving one account and arriving in the other.'
                        : 'The balance of the account it touched will change to match.'
                }
                confirmLabel={
                    isTransfer ? 'Delete transfer' : 'Delete transaction'
                }
                busyLabel="Deleting…"
                variant="destructive"
                processing={remove.processing}
                onConfirm={remove.confirm}
            />
        </>
    );
}
