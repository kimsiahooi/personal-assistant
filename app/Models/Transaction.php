<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\TransactionType;
use App\Models\Concerns\BelongsToUser;
use App\Support\Money;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * One movement of money, against exactly one account.
 *
 * `amount` is SIGNED and there is no direction column — income positive, expense
 * negative, and the two legs of a transfer negative then positive. A balance is
 * therefore `SUM(amount)` and never a CASE.
 *
 * The sign is not the caller's to remember. {@see self::applySign()} derives it from
 * `type` on every save, so a positive expense cannot be written even by a seeder — it
 * would otherwise be silently wrong in the balance, the monthly total and the donut, in
 * three different directions.
 *
 * @property int $id
 * @property int $user_id
 * @property int $account_id
 * @property int|null $category_id
 * @property TransactionType $type
 * @property string $amount
 * @property string $currency
 * @property Carbon $occurred_at
 * @property string|null $note
 * @property string|null $transfer_group_id
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Account $account
 * @property-read Category|null $category
 */
#[Fillable(['account_id', 'category_id', 'type', 'amount', 'currency', 'occurred_at', 'note'])]
class Transaction extends Model
{
    use BelongsToUser;
    use SoftDeletes;

    /**
     * `booted`, not `bootTransaction`: the `boot{Name}` convention belongs to TRAITS,
     * and a `bootTransaction` on the model itself is never called by anything. Written
     * that way once here, and the first probe wrote a positive expense.
     */
    protected static function booted(): void
    {
        static::saving(static function (self $transaction): void {
            $transaction->applySign();
        });
    }

    /** @return BelongsTo<Account, $this> */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * The other half of a transfer.
     *
     * A transfer is two rows sharing a `transfer_group_id`; this finds the one that is
     * not `$this`. Null for income and expense, and null for a transfer whose partner
     * has been deleted — which should not happen, because both legs are written and
     * removed together.
     *
     * @return Builder<self>
     */
    public function counterpart(): Builder
    {
        return self::query()
            ->where('transfer_group_id', $this->transfer_group_id)
            ->whereKeyNot($this->getKey());
    }

    public function isTransfer(): bool
    {
        return $this->type === TransactionType::Transfer;
    }

    /**
     * Rows that move money out of an account: expenses and outbound transfer legs.
     *
     * @param  Builder<$this>  $query
     */
    public function scopeOutflow(Builder $query): void
    {
        $query->where('amount', '<', 0);
    }

    /**
     * Rows that move money in: income and inbound transfer legs.
     *
     * @param  Builder<$this>  $query
     */
    public function scopeInflow(Builder $query): void
    {
        $query->where('amount', '>', 0);
    }

    /**
     * Exclude transfers from a total.
     *
     * Both legs of a transfer net to zero across all accounts, so they cannot change a
     * balance — but they would inflate "money in" and "money out" for a month, which
     * are the two numbers on the dashboard people actually read.
     *
     * @param  Builder<$this>  $query
     */
    public function scopeExcludingTransfers(Builder $query): void
    {
        $query->where('type', '!=', TransactionType::Transfer);
    }

    /**
     * Force `amount` to carry the sign its type implies.
     *
     * A transfer is the exception: its two legs are equal and opposite, so the sign is
     * set by whoever writes the pair and is preserved here rather than overwritten.
     */
    private function applySign(): void
    {
        $amount = $this->getAttribute('amount');

        if (! is_string($amount) && ! is_numeric($amount)) {
            return;
        }

        if ($this->type === TransactionType::Transfer) {
            $this->setAttribute('amount', Money::scale((string) $amount));

            return;
        }

        $this->setAttribute(
            'amount',
            Money::signed((string) $amount, $this->type->sign()),
        );
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'type' => TransactionType::class,
            // `decimal:2` keeps this a string end to end — see App\Support\Money.
            'amount' => 'decimal:2',
            // A UTC instant standing for a local calendar day. Read it back through
            // App\Support\LocalDate, never with ->toDateString() on the raw value:
            // that reports the UTC day, which is the previous one for anything recorded
            // before 08:00 in Malaysia.
            'occurred_at' => 'datetime',
        ];
    }
}
