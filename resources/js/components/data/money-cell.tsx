import { formatMoney, formatSignedMoney, signOf } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * An amount, in a column of amounts.
 *
 * **`signed` is the distinction that matters, and it is the difference between a movement
 * and a state.** A ledger row is a movement: money came in or went out, direction is the
 * first thing anyone reads, and an explicit `+`/`-` is what makes the column parse in
 * greyscale, on a printout, and for a reader who cannot separate the green from the red —
 * the one pair colour-vision deficiency confuses most often. A balance is a state: "RM
 * 6,200.00" is what the account *holds*, and writing it "+RM 6,200.00" says it went up by
 * six thousand, which is not what the column means. Nothing "gained" a balance.
 *
 * So a balance drops the plus and keeps the minus — an overdrawn account is genuinely
 * negative, and `-RM 32.80` is how a person writes that. Colour follows: a negative
 * balance is money you do not have, which is the one case worth marking.
 *
 * Zero stays muted either way rather than being painted as income: nothing has no
 * direction.
 *
 * Formats only — no arithmetic. The amount is a decimal string the server has already
 * signed and, where it is a total, already summed. See the `--income` token in
 * `resources/css/app.css` for the contrast pairing, and docs/UI-UX-GUIDELINES.md section 4.
 */
export function MoneyCell({
    amount,
    currency,
    muted,
    signed = true,
}: {
    amount: string;
    currency: string;
    /** For a transfer, where money moved but nothing was earned or spent. */
    muted?: boolean;
    /**
     * Whether to write the `+` on a positive value. True for a movement, false for a
     * balance. Defaults to true, so the ledger — where the sign is load-bearing — gets it
     * without asking, and only a balance column has to say otherwise.
     */
    signed?: boolean;
}) {
    const sign = signOf(amount);

    return (
        <span
            className={cn(
                'font-medium tabular-nums',
                muted || sign === 0
                    ? 'text-muted-foreground'
                    : sign < 0
                      ? 'text-destructive'
                      : // A positive balance is simply the normal state of an account, and
                        // painting every one of them green would make the colour mean
                        // nothing by the time it is needed.
                        signed
                        ? 'text-income'
                        : 'text-foreground',
            )}
        >
            {signed
                ? formatSignedMoney(amount, currency)
                : formatMoney(amount, currency)}
        </span>
    );
}
