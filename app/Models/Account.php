<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AccountType;
use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A place money sits: a bank account, cash, an e-wallet, a card.
 *
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property AccountType $type
 * @property string $opening_balance
 * @property string $currency
 * @property string|null $note
 * @property Carbon|null $archived_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Collection<int, Transaction> $transactions
 */
#[Fillable(['name', 'type', 'opening_balance', 'currency', 'note', 'archived_at'])]
class Account extends Model
{
    use BelongsToUser;

    /** @return HasMany<Transaction, $this> */
    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    /**
     * Accounts still in use — the default for pickers and totals.
     *
     * @param  Builder<$this>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->whereNull('archived_at');
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'type' => AccountType::class,
            // `decimal:2` keeps this a string all the way to the DTO, so no float ever
            // touches it. See App\Support\Money.
            'opening_balance' => 'decimal:2',
            'archived_at' => 'datetime',
        ];
    }
}
