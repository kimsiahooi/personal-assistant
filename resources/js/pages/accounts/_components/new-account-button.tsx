import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AccountFormDialog } from '@/pages/accounts/_components/account-form-dialog';

/**
 * The one way to start a new account, used in two places: the page heading, and the empty
 * state — where it is the only thing on screen worth clicking.
 */
export function NewAccountButton({
    variant,
}: {
    variant?: 'default' | 'outline';
}) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button variant={variant} onClick={() => setOpen(true)}>
                <Plus className="size-4" />
                New account
            </Button>

            <AccountFormDialog open={open} onOpenChange={setOpen} />
        </>
    );
}
