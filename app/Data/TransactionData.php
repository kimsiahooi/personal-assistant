<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\TransactionType;
use App\Models\Transaction;
use App\Support\LocalDate;
use App\Support\Money;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * One transaction row, as the ledger sends it.
 *
 * **`amount` is the signed stored value and `magnitude` is what a form shows.** Both
 * are strings. The list needs the sign to colour a row and to line the column up; the
 * edit form needs the unsigned number a person typed, because a form that pre-filled
 * "-25.50" would invite somebody to delete the minus and change nothing. Deriving
 * `magnitude` here rather than in React is the same rule as everywhere else: no money
 * arithmetic in the browser, not even dropping a sign.
 *
 * `account_name` and `category_name` are flattened rather than nested. A list renders
 * a name; nesting the whole related object would send fields nothing displays and make
 * every consumer reach through a relation that may not have been eager-loaded.
 */
#[TypeScript]
final class TransactionData extends Data
{
    public function __construct(
        public int $id,
        public TransactionType $type,
        public string $amount,
        public string $magnitude,
        public string $currency,
        public string $occurred_on,
        public ?string $note,
        public int $account_id,
        public string $account_name,
        public ?int $category_id,
        public ?string $category_name,
        public ?string $category_colour,
        /** Present on both legs of a transfer, null on everything else. */
        public ?string $transfer_group_id,
        /** The other account a transfer touched, resolved for display. */
        public ?string $transfer_counterpart_name,
    ) {}

    /**
     * @param  string  $timezone  The viewer's zone. `occurred_at` is a UTC instant
     *                            standing for a local day, so reading it back without
     *                            this reports the UTC day — the previous one for
     *                            anything recorded before 08:00 in Malaysia.
     */
    public static function fromTransaction(
        Transaction $transaction,
        string $timezone,
        ?string $counterpartName = null,
    ): self {
        return new self(
            id: $transaction->id,
            type: $transaction->type,
            amount: $transaction->amount,
            magnitude: Money::absolute($transaction->amount),
            currency: $transaction->currency,
            // The stored UTC instant, read back as the day the viewer would call it.
            // Y-m-d parses identically on the SSR runtime and in the browser, which is
            // why the wire carries a date rather than the instant.
            occurred_on: LocalDate::toLocalDate($transaction->occurred_at, $timezone),
            note: $transaction->note,
            account_id: $transaction->account_id,
            account_name: $transaction->account->name,
            category_id: $transaction->category_id,
            category_name: $transaction->category?->name,
            category_colour: $transaction->category?->colour,
            transfer_group_id: $transaction->transfer_group_id,
            transfer_counterpart_name: $counterpartName,
        );
    }
}
