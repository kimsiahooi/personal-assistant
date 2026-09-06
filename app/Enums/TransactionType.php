<?php

declare(strict_types=1);

namespace App\Enums;

use App\Models\Transaction;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * What a transaction means.
 *
 * The value lands in `transactions.type`, so these strings are data and cannot be
 * renamed without a migration.
 *
 * `type` says what a row means; the sign of `amount` says what it does. The two are kept
 * consistent by {@see Transaction::signedAmount()} rather than by every
 * caller remembering, because a positive expense would be silently wrong everywhere —
 * a balance, a monthly total and a donut would each simply report a different lie.
 *
 * `#[TypeScript]` emits `App.Enums.TransactionType`, so a type the browser does not know
 * about is a tsc error rather than a row that renders blank.
 */
#[TypeScript]
enum TransactionType: string
{
    /** Money arriving from outside your accounts. Stored positive. */
    case Income = 'income';

    /** Money leaving for outside your accounts. Stored negative. */
    case Expense = 'expense';

    /**
     * Money moving between two of your own accounts. Always a PAIR of rows sharing a
     * `transfer_group_id` — negative on the source, positive on the destination — so
     * one of these alone is a bug. Never carries a category: moving your own money is
     * not spending, and counting it as such would double every total.
     */
    case Transfer = 'transfer';

    /** The sign `amount` must carry for this type on the account it is written against. */
    public function sign(): int
    {
        return $this === self::Income ? 1 : -1;
    }

    /**
     * Types a person picks on the form. All three, today.
     *
     * @return list<string>
     */
    public static function selectable(): array
    {
        return array_map(static fn (self $case): string => $case->value, self::cases());
    }
}
