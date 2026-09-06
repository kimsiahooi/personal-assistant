import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLedger } from '@/pages/transactions/_components/ledger-context';
import { TransactionFormDialog } from '@/pages/transactions/_components/transaction-form-dialog';

/**
 * The one way to record a transaction, used in the page heading and in the empty state.
 *
 * **Renders nothing when there are no accounts.** A transaction has to say where it
 * happened, so the form would open onto an empty required picker with no way forward; the
 * empty state says to add an account first, which is the actual next step.
 */
export function NewTransactionButton({
    variant,
}: {
    variant?: 'default' | 'outline';
}) {
    const ledger = useLedger();
    const [open, setOpen] = useState(false);

    if (ledger.accounts.length === 0) {
        return null;
    }

    return (
        <>
            <Button variant={variant} onClick={() => setOpen(true)}>
                <Plus className="size-4" />
                Record a transaction
            </Button>

            <TransactionFormDialog
                open={open}
                onOpenChange={setOpen}
                accounts={ledger.accounts}
                categories={ledger.categories}
                today={ledger.today}
            />
        </>
    );
}
