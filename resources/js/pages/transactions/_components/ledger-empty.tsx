import { ReceiptText } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { useLedger } from '@/pages/transactions/_components/ledger-context';
import { NewTransactionButton } from '@/pages/transactions/_components/new-transaction-button';

/**
 * Nothing recorded yet — which has two versions, because a transaction cannot exist
 * without somewhere for it to have happened.
 *
 * With no accounts there is no action to offer: the button would open a form onto an empty
 * required picker. Saying what to do instead is more use than a control that cannot work.
 */
export function LedgerEmpty() {
    const ledger = useLedger();

    if (ledger.accounts.length === 0) {
        return (
            <EmptyState
                icon={ReceiptText}
                title="Add an account first"
                description="A transaction has to say where it happened. Add a bank account or a wallet, and this is where everything that moves will be listed."
            />
        );
    }

    return (
        <EmptyState
            icon={ReceiptText}
            title="No transactions yet"
            description="Record what you earn and what you spend, and the dashboard will start filling in."
            action={<NewTransactionButton />}
        />
    );
}
