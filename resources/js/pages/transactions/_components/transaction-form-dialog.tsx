import { useState } from 'react';
import { DateField } from '@/components/form/date-field';
import { ResourceFormDialog } from '@/components/form/resource-form-dialog';
import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPES } from '@/lib/labels';
import { transactionSchema } from '@/lib/validation/schemas/transaction';
import { store, update } from '@/routes/transactions';

type Transaction = App.Data.TransactionData;
type Category = App.Data.CategoryData;
type AccountOption = { id: number; name: string };

/**
 * Which categories a transaction of this type may wear.
 *
 * The same mapping `CategoryKind::forTransaction()` makes server-side, and the server is
 * still the one that enforces it — see `TransactionRequest::rejectMismatchedCategory()`.
 * This is the picker being helpful, not the rule.
 */
const KIND_FOR: Partial<
    Record<App.Enums.TransactionType, App.Enums.CategoryKind>
> = {
    income: 'income',
    expense: 'expense',
};

/**
 * Recording or editing a transaction.
 *
 * **The form changes shape with `type`, and that is the only reason it holds state.** A
 * transfer needs a destination account and must not carry a category; income and expense
 * are the other way round. Rendering the wrong ones is not merely untidy — an unmounted
 * field submits nothing, which is exactly what `Rule::excludeIf` and `Rule::requiredIf`
 * expect on the server, so the shape on screen and the shape on the wire agree by
 * construction.
 *
 * Everything else is uncontrolled and seeded with `defaultValue`; Radix unmounts the
 * dialog's content on close, so an abandoned edit cannot reappear. See
 * {@link ResourceFormDialog}.
 */
export function TransactionFormDialog({
    open,
    onOpenChange,
    accounts,
    categories,
    today,
    transaction,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accounts: AccountOption[];
    categories: Category[];
    /** The viewer's today, from the server — the default date and the latest allowed. */
    today: string;
    /** The row being edited. Absent means this is the create form. */
    transaction?: Transaction;
}) {
    const editing = transaction !== undefined;
    const [type, setType] = useState<string>(transaction?.type ?? 'expense');

    const isTransfer = type === 'transfer';
    const kind = KIND_FOR[type as App.Enums.TransactionType];
    const forKind = categories.filter((category) => category.kind === kind);

    const accountOptions = accounts.map((account) => ({
        value: String(account.id),
        label: account.name,
    }));

    return (
        <ResourceFormDialog
            open={open}
            onOpenChange={onOpenChange}
            action={
                editing
                    ? update.form({ transaction: transaction.id })
                    : store.form()
            }
            // Built per-render from the server's `today`, so the browser refuses the same
            // future date the server would. See the schema for why it is a factory.
            schema={transactionSchema(today)}
            title={editing ? 'Edit transaction' : 'Record a transaction'}
            description={
                editing
                    ? 'Change what happened, or when.'
                    : 'Money in, money out, or a move between two of your own accounts.'
            }
            submit={editing ? 'Save changes' : 'Record it'}
            submitting={editing ? 'Saving…' : 'Recording…'}
            size="lg"
        >
            {({ errors }) => (
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <SelectField
                            name="type"
                            label="Type"
                            placeholder="Choose a type"
                            options={TRANSACTION_TYPES.map((value) => ({
                                value,
                                label: TRANSACTION_TYPE_LABELS[value],
                            }))}
                            defaultValue={type}
                            onValueChange={setType}
                            error={errors.type}
                        />

                        <TextField
                            name="amount"
                            label="Amount"
                            placeholder="25.50"
                            inputMode="decimal"
                            // The magnitude, never the stored signed value: a form
                            // pre-filled "-25.50" invites somebody to delete the minus and
                            // change nothing. The sign belongs to the type — see
                            // Transaction::applySign().
                            defaultValue={transaction?.magnitude}
                            error={errors.amount}
                            autoFocus
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <DateField
                            name="occurred_on"
                            label="Date"
                            max={today}
                            defaultValue={transaction?.occurred_on ?? today}
                            error={errors.occurred_on}
                        />

                        <SelectField
                            name="account_id"
                            label={isTransfer ? 'From account' : 'Account'}
                            placeholder="Choose an account"
                            options={accountOptions}
                            defaultValue={
                                transaction
                                    ? String(transaction.account_id)
                                    : undefined
                            }
                            error={errors.account_id}
                        />
                    </div>

                    {isTransfer ? (
                        <SelectField
                            // Keyed so that switching type remounts it: without a key the
                            // uncontrolled field would keep whatever was picked before, and
                            // a value chosen for one shape would be submitted under another.
                            key="to_account_id"
                            name="to_account_id"
                            label="To account"
                            placeholder="Choose an account"
                            hint="Both legs are written together, and deleting either one removes the pair."
                            options={accountOptions}
                            defaultValue={
                                transaction?.transfer_counterpart_account_id
                                    ? String(
                                          transaction.transfer_counterpart_account_id,
                                      )
                                    : undefined
                            }
                            error={errors.to_account_id}
                        />
                    ) : (
                        <SelectField
                            key={`category_id-${kind}`}
                            name="category_id"
                            label="Category"
                            placeholder={
                                forKind.length === 0
                                    ? `No ${kind} categories yet`
                                    : 'Choose a category'
                            }
                            hint={
                                forKind.length === 0
                                    ? 'Add one on the Categories page, and the dashboard can start breaking this down.'
                                    : undefined
                            }
                            optional
                            options={forKind.map((category) => ({
                                value: String(category.id),
                                label: category.name,
                            }))}
                            defaultValue={
                                // Only when it still belongs to the type on screen:
                                // switching an expense to income must not carry "Groceries"
                                // across, which the server would refuse anyway.
                                transaction?.category_id &&
                                forKind.some(
                                    (c) => c.id === transaction.category_id,
                                )
                                    ? String(transaction.category_id)
                                    : undefined
                            }
                            error={errors.category_id}
                        />
                    )}

                    <TextField
                        name="note"
                        label="Note"
                        placeholder="Weekly groceries at the market"
                        defaultValue={transaction?.note}
                        error={errors.note}
                        optional
                        rows={2}
                    />
                </div>
            )}
        </ResourceFormDialog>
    );
}
