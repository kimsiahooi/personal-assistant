import { useState } from 'react';
import { RowActions } from '@/components/data/row-actions';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { useResourceDelete } from '@/hooks/use-resource-delete';
import { AccountFormDialog } from '@/pages/accounts/_components/account-form-dialog';
import { destroy } from '@/routes/accounts';

type Account = App.Data.AccountData;

/**
 * What one row can do. The row owns both of its dialogs rather than reaching for state on
 * the page, which is what lets the column definitions stay at module scope — TanStack
 * treats the array as an input, and a cell that closed over page state would force it to
 * be rebuilt on every render.
 *
 * The delete confirmation says what will happen and stops there. Whether the account
 * *can* be deleted is the database's answer — `transactions.account_id` is
 * `restrictOnDelete` — and the controller turns the refusal into an error toast telling
 * you to archive instead. Guessing at it here would need a count on every row, and would
 * still be a guess by the time the button was pressed.
 */
export function AccountActions({ account }: { account: Account }) {
    const [editing, setEditing] = useState(false);
    const remove = useResourceDelete(destroy({ account: account.id }).url);

    return (
        <>
            <RowActions
                name={account.name}
                onEdit={() => setEditing(true)}
                onDelete={remove.ask}
            />

            <AccountFormDialog
                open={editing}
                onOpenChange={setEditing}
                account={account}
            />

            <ConfirmDialog
                open={remove.confirming}
                onOpenChange={remove.onOpenChange}
                title={`Delete ${account.name}?`}
                description="An account with transactions cannot be deleted — archive it instead, and its history stays where it is."
                confirmLabel="Delete account"
                busyLabel="Deleting…"
                variant="destructive"
                processing={remove.processing}
                onConfirm={remove.confirm}
            />
        </>
    );
}
