<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CategoryKind;
use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * What a transaction was for.
 *
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property CategoryKind $kind
 * @property string|null $colour
 * @property string|null $icon
 * @property Carbon|null $archived_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Collection<int, Transaction> $transactions
 */
#[Fillable(['name', 'kind', 'colour', 'icon', 'archived_at'])]
class Category extends Model
{
    use BelongsToUser;

    /** @return HasMany<Transaction, $this> */
    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    /** @param  Builder<$this>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->whereNull('archived_at');
    }

    /**
     * The categories offerable for a kind of transaction.
     *
     * @param  Builder<$this>  $query
     */
    public function scopeOfKind(Builder $query, CategoryKind $kind): void
    {
        $query->where('kind', $kind);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'kind' => CategoryKind::class,
            'archived_at' => 'datetime',
        ];
    }
}
