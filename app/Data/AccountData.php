<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\AccountType;
use App\Models\Account;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * One account, as a listing sends it.
 *
 * snake_case property names are the wire format — matching the JSON exactly is what
 * lets the generated TypeScript be read straight off the page props with no renaming
 * pass in between.
 *
 * **Both money fields are `string`.** They are `decimal(15,2)` in MySQL, cast
 * `decimal:2`, and they leave here as `"1074.50"` so JavaScript never gets the chance
 * to turn one into a float. `balance` is computed in SQL by the caller and passed in;
 * it is not derived here, because a DTO that queried would run one per row.
 */
#[TypeScript]
final class AccountData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
        public AccountType $type,
        public string $opening_balance,
        public string $balance,
        public string $currency,
        public ?string $note,
        public bool $is_archived,
        public string $created_at,
    ) {}

    /**
     * @param  string|null  $balance  `opening_balance + SUM(transactions.amount)`,
     *                                already totalled by the query. Null means the
     *                                caller did not ask for it, and the opening balance
     *                                is the honest answer rather than a fabricated zero.
     */
    public static function fromAccount(Account $account, ?string $balance = null): self
    {
        return new self(
            id: $account->id,
            name: $account->name,
            type: $account->type,
            opening_balance: $account->opening_balance,
            balance: $balance ?? $account->opening_balance,
            currency: $account->currency,
            note: $account->note,
            is_archived: $account->isArchived(),
            // ISO 8601 at the boundary. The client formats dates itself and only ever
            // needs a string both renders parse identically — see CLAUDE.md on SSR.
            created_at: $account->created_at->toIso8601String(),
        );
    }
}
