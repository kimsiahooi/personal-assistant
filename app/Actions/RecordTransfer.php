<?php

declare(strict_types=1);

namespace App\Actions;

use App\Enums\TransactionType;
use App\Models\Transaction;
use App\Support\Money;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Move money between two of the user's own accounts.
 *
 * A transfer is TWO rows sharing a `transfer_group_id` — negative on the source,
 * positive on the destination — so that every row belongs to exactly one account and a
 * balance stays `SUM(amount)`. One row with a `to_account_id` would read better in a
 * list and would make every balance an OR-join; see the migration for the full argument.
 *
 * Both legs are written inside a transaction, and the pair is the invariant this class
 * exists to protect: a single leg is money created or destroyed. Nothing else in the
 * app may write a row of type `transfer`.
 */
final class RecordTransfer
{
    /**
     * @param  string  $amount  The magnitude a person typed. The sign is applied here.
     * @param  CarbonInterface  $occurredAt  The UTC instant standing for the picked local day —
     *                                       already converted by TransactionRequest::occurredAt().
     * @return array{0: Transaction, 1: Transaction} The outbound leg, then the inbound.
     */
    public function handle(
        int $fromAccountId,
        int $toAccountId,
        string $amount,
        CarbonInterface $occurredAt,
        ?string $note = null,
    ): array {
        $magnitude = Money::absolute($amount);
        $group = (string) Str::ulid();

        return DB::transaction(function () use (
            $fromAccountId, $toAccountId, $magnitude, $occurredAt, $note, $group
        ): array {
            $out = $this->leg($fromAccountId, Money::negate($magnitude), $occurredAt, $note, $group);
            $in = $this->leg($toAccountId, $magnitude, $occurredAt, $note, $group);

            return [$out, $in];
        });
    }

    /**
     * Replace an existing transfer in place.
     *
     * Delete-then-write rather than update-both: an edit can change which accounts are
     * involved, and reassigning a leg to a different account is the same amount of work
     * as writing a new one with more ways to leave the pair inconsistent. Soft deletes
     * mean the old pair is recoverable if this is ever wrong.
     *
     * @return array{0: Transaction, 1: Transaction}
     */
    public function replace(
        Transaction $existing,
        int $fromAccountId,
        int $toAccountId,
        string $amount,
        CarbonInterface $occurredAt,
        ?string $note = null,
    ): array {
        return DB::transaction(function () use (
            $existing, $fromAccountId, $toAccountId, $amount, $occurredAt, $note
        ): array {
            $this->deletePair($existing);

            return $this->handle($fromAccountId, $toAccountId, $amount, $occurredAt, $note);
        });
    }

    /**
     * Turn a transfer back into an ordinary row: drop the other leg, and release this one
     * from the pair.
     *
     * For an edit that changes a transfer into an income or an expense. The surviving row
     * keeps its id — the caller then updates it like any other transaction — so a note, a
     * date and anything referencing it survive a change of mind.
     *
     * `transfer_group_id` is cleared here rather than by the caller for the same reason it
     * is not fillable: a row that still names a group it is no longer part of would be
     * collected by {@see self::deletePair()} on some later, unrelated delete.
     */
    public function unmake(Transaction $leg): void
    {
        DB::transaction(function () use ($leg): void {
            if ($leg->transfer_group_id !== null) {
                Transaction::query()
                    ->where('transfer_group_id', $leg->transfer_group_id)
                    ->whereKeyNot($leg->getKey())
                    ->delete();
            }

            $leg->transfer_group_id = null;
            $leg->save();
        });
    }

    /** Remove both legs, or neither. */
    public function deletePair(Transaction $leg): void
    {
        DB::transaction(function () use ($leg): void {
            if ($leg->transfer_group_id !== null) {
                Transaction::query()
                    ->where('transfer_group_id', $leg->transfer_group_id)
                    ->delete();

                return;
            }

            $leg->delete();
        });
    }

    private function leg(
        int $accountId,
        string $signedAmount,
        CarbonInterface $occurredAt,
        ?string $note,
        string $group,
    ): Transaction {
        $leg = new Transaction([
            'account_id' => $accountId,
            'type' => TransactionType::Transfer,
            'amount' => $signedAmount,
            'occurred_at' => $occurredAt,
            'note' => $note,
        ]);

        // Not fillable: a request must not be able to place a row into someone else's
        // transfer group by posting an id.
        $leg->transfer_group_id = $group;
        $leg->save();

        return $leg;
    }
}
