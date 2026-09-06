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
export const transactionSchema = z
    .object({
        type: choice('Type', ['income', 'expense', 'transfer']),
        amount: money('Amount'),
        occurred_on: pastDate('Date'),
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
