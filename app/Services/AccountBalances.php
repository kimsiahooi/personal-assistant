<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Account;
use App\Support\Money;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * The one place an account balance is derived.
 *
 * A balance is `opening_balance + SUM(transactions.amount)`. Nothing stores it: a
 * cached column would be a second source of truth that every write, edit, delete and
 * transfer has to keep correct, and the moment it drifts there is no way to tell which
 * of the two is lying.
 *
 * The SUM runs in SQL — `withSum` becomes a correlated subquery, so this is one
 * statement for any number of accounts rather than one per row. The only arithmetic in
 * PHP is adding the opening balance, and that goes through bcmath on the decimal
 * strings, never a float.
 */
final class AccountBalances
{
    /**
     * The alias `withSum`/`loadSum` writes the aggregate under.
     *
     * Named once because {@see self::for()} decides whether to run a query by looking for
     * this exact key, and a caller spelling it differently would silently reintroduce the
     * per-row aggregate this class exists to avoid.
     */
    private const SUM = 'transactions as movement';

    private const SUM_KEY = 'movement';

    /**
     * Attach the balance aggregate to a query the caller is building.
     *
     * For a paginated list, which cannot go through {@see self::forAll()} and must not pay
     * for {@see self::for()} per row. Exposed as a method so the alias stays in this file:
     * a controller spelling `'transactions as movement'` itself would work until somebody
     * renamed it here, and would then quietly cost one aggregate per row instead of failing.
     *
     * @param  Builder<Account>  $query
     * @return Builder<Account>
     */
    public function attach(Builder $query): Builder
    {
        return $query->withSum(self::SUM, 'amount');
    }

    /**
     * Every account the user owns, each with its balance as a decimal string.
     *
     * @return Collection<int, Account> each carrying a `balance` attribute
     */
    public function forAll(bool $includeArchived = false): Collection
    {
        return Account::query()
            ->when(! $includeArchived, fn ($query) => $query->active())
            ->withSum(self::SUM, 'amount')
            ->orderBy('name')
            ->get()
            ->each(function (Account $account): void {
                $account->setAttribute('balance', $this->combine($account));
            });
    }

    /**
     * One account's balance, as a decimal string.
     *
     * **Loads the sum only if nobody has already paid for it.** `AccountController::index`
     * attaches `withSum` to its paginated query and then maps each row through here; an
     * unconditional `loadSum` ran a second aggregate per row on top of the one already in
     * the result set — 25 extra queries a page to recompute numbers it was holding.
     *
     * The test is `array_key_exists`, not a null check: `withSum` sets the key to NULL for
     * an account with no transactions, so "loaded and empty" and "never loaded" are the
     * same value and only the key's presence tells them apart.
     */
    public function for(Account $account): string
    {
        if (! array_key_exists(self::SUM_KEY, $account->getAttributes())) {
            $account->loadSum(self::SUM, 'amount');
        }

        return $this->combine($account);
    }

    /**
     * The user's total across every active account.
     *
     * Summed here rather than in SQL because each account's opening balance has already
     * been folded in, and doing it in one query would mean repeating that join.
     *
     * @param  Collection<int, Account>  $accounts
     */
    public function net(Collection $accounts): string
    {
        $total = '0.00';

        foreach ($accounts as $account) {
            $total = Money::add($total, (string) $account->getAttribute('balance'));
        }

        return $total;
    }

    private function combine(Account $account): string
    {
        // `withSum` returns null when an account has no transactions at all.
        $movement = $account->getAttribute(self::SUM_KEY) ?? '0';

        return Money::add($account->opening_balance, (string) $movement);
    }
}
