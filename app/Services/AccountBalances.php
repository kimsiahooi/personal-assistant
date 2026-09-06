<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Account;
use App\Support\Money;
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
     * Every account the user owns, each with its balance as a decimal string.
     *
     * @return Collection<int, Account> each carrying a `balance` attribute
     */
    public function forAll(bool $includeArchived = false): Collection
    {
        return Account::query()
            ->when(! $includeArchived, fn ($query) => $query->active())
            ->withSum('transactions as movement', 'amount')
            ->orderBy('name')
            ->get()
            ->each(function (Account $account): void {
                $account->setAttribute('balance', $this->combine($account));
            });
    }

    /** One account's balance, as a decimal string. */
    public function for(Account $account): string
    {
        $account->loadSum('transactions as movement', 'amount');

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
        $movement = $account->getAttribute('movement') ?? '0';

        return Money::add($account->opening_balance, (string) $movement);
    }
}
