import { CheckboxField } from '@/components/form/checkbox-field';
import { ResourceFormDialog } from '@/components/form/resource-form-dialog';
import { SelectField } from '@/components/form/select-field';
import { TextField } from '@/components/form/text-field';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES } from '@/lib/labels';
import { accountSchema } from '@/lib/validation/schemas/account';
import { store, update } from '@/routes/accounts';

type Account = App.Data.AccountData;

/**
 * Four fields and the words around them. The dialog, the submission, the gate and the
 * footer belong to {@link ResourceFormDialog}; the label/error/aria wiring belongs to the
 * field components.
 *
 * Create and edit are one component: the only difference is which route the form posts to
 * and which four strings it shows.
 */
export function AccountFormDialog({
    open,
    onOpenChange,
    account,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The row being edited. Absent means this is the create form. */
    account?: Account;
}) {
    const editing = account !== undefined;

    return (
        <ResourceFormDialog
            open={open}
            onOpenChange={onOpenChange}
            action={
                editing ? update.form({ account: account.id }) : store.form()
            }
            schema={accountSchema}
            title={editing ? `Edit ${account.name}` : 'New account'}
            description={
                editing
                    ? 'Change what this account is called or how it is classified.'
                    : 'Somewhere money sits — a bank account, your wallet, an e-wallet.'
            }
            submit={editing ? 'Save changes' : 'Add account'}
            submitting={editing ? 'Saving…' : 'Adding…'}
        >
            {({ errors }) => (
                <div className="space-y-4">
                    <TextField
                        name="name"
                        label="Name"
                        placeholder="Maybank savings"
                        defaultValue={account?.name}
                        error={errors.name}
                        autoFocus
                    />

                    <SelectField
                        name="type"
                        label="Type"
                        placeholder="Choose a type"
                        options={ACCOUNT_TYPES.map((value) => ({
                            value,
                            label: ACCOUNT_TYPE_LABELS[value],
                        }))}
                        defaultValue={account?.type}
                        error={errors.type}
                    />

                    <TextField
                        name="opening_balance"
                        label="Opening balance"
                        placeholder="0.00"
                        inputMode="decimal"
                        hint={
                            editing
                                ? 'What the account held before the first transaction here. Changing it shifts the balance by the same amount.'
                                : 'What the account holds right now, before you record anything.'
                        }
                        defaultValue={account?.opening_balance}
                        error={errors.opening_balance}
                    />

                    <TextField
                        name="note"
                        label="Note"
                        placeholder="Salary goes in here"
                        defaultValue={account?.note}
                        error={errors.note}
                        optional
                        rows={2}
                    />

                    {/*
                        Only when editing. A brand-new account nobody has used yet has no
                        reason to be archived, and offering it would be a control whose
                        only effect is to hide the thing being created.
                    */}
                    {editing && (
                        <CheckboxField
                            name="archived"
                            label="Archived"
                            hint="Keeps its history but takes it out of the pickers and the balance list."
                            defaultChecked={account.is_archived}
                            error={errors.archived}
                        />
                    )}
                </div>
            )}
        </ResourceFormDialog>
    );
}
