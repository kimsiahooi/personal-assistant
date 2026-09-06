import { z } from 'zod';
import {
    choice,
    money,
    optionalReference,
    optionalText,
    pastDate,
    reference,
} from '@/lib/validation/primitives';

/**
 * Mirrors `App\Http\Requests\TransactionRequest`.
 *
 * **A factory, not a constant, because one rule needs a value only the server knows.**
 * `before_or_equal` is compared against the VIEWER's today — at 09:00 in Kuala Lumpur the
 * server's own UTC clock still says yesterday — so the bound arrives as a page prop and is
 * passed in here. Reading `new Date()` instead would disagree with the server around
 * midnight and, under SSR, disagree with itself.
 *
 * `scripts/check-validation-parity.ts` builds it through FACTORY_ARGS to read its keys.
 *
 * The two conditional rules are `superRefine`d rather than expressed in the shape,
 * because both depend on `type` and zod object keys cannot see their siblings. They
 * restate what the request checks server-side — a destination account is required for a
 * transfer and forbidden otherwise, and the two accounts must differ — so the browser
 * refuses the same thing the server would.
 *
 * What is NOT restated: that a category's kind must match the transaction's type. That
 * needs a lookup the browser does not have, and the picker only offers matching
 * categories anyway. The server owns it.
 */
export const transactionSchema = (today: string) =>
    z
        .object({
            type: choice('Type', ['income', 'expense', 'transfer']),
            amount: money('Amount'),
            occurred_on: pastDate('Date', today),
            account_id: reference('Account'),
            to_account_id: optionalReference(),
            category_id: optionalReference(),
            note: optionalText({ label: 'Note', max: 255 }),
        })
        .superRefine((values, ctx) => {
            const isTransfer = values.type === 'transfer';
            const destination = `${values.to_account_id ?? ''}`.trim();

            if (isTransfer && destination === '') {
                ctx.addIssue({
                    code: 'custom',
                    path: ['to_account_id'],
                    message: 'Destination account is required for a transfer.',
                });
            }

            if (
                isTransfer &&
                destination !== '' &&
                destination === `${values.account_id}`
            ) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['to_account_id'],
                    message:
                        'A transfer must move money between two different accounts.',
                });
            }
        });
