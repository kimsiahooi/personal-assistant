<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\AccountData;
use App\Enums\AccountType;
use App\Http\Controllers\Concerns\RendersResourceIndex;
use App\Http\Requests\AccountRequest;
use App\Models\Account;
use App\Services\AccountBalances;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class AccountController
{
    use RendersResourceIndex;

    public function __construct(private readonly AccountBalances $balances) {}

    public function index(Request $request): Response
    {
        $showArchived = $request->query('archived') === '1';

        $list = $this->resourceList(
            request: $request,
            query: Account::query()
                ->when(! $showArchived, fn ($query) => $query->active())
                ->withSum('transactions as movement', 'amount'),
            sortable: ['name', 'type', 'created_at'],
            search: static function (Builder $query, string $term): void {
                $query->where('name', 'like', "%{$term}%");
            },
            extra: array_filter(['archived' => $showArchived ? '1' : '']),
        );

        return Inertia::render('accounts/index', [
            'accounts' => $list['rows']->through(
                fn (Account $account) => AccountData::fromAccount(
                    $account,
                    $this->balances->for($account),
                ),
            ),
            'filters' => $list['filters'],
            'types' => AccountType::values(),
        ]);
    }

    public function store(AccountRequest $request): RedirectResponse
    {
        Account::create($request->validated());

        return back()->with('success', 'Account created.');
    }

    public function update(AccountRequest $request, Account $account): RedirectResponse
    {
        $account->update($request->validated());

        return back()->with('success', 'Account updated.');
    }

    /**
     * Delete an account that has no history.
     *
     * `restrictOnDelete` on `transactions.account_id` means the database refuses to
     * remove an account anything points at, so this catches that case and says the
     * useful thing instead: archive it. An account with transactions is not deletable
     * by design — the transactions still have to name where they happened.
     */
    public function destroy(Account $account): RedirectResponse
    {
        if ($account->transactions()->exists()) {
            return back()->with(
                'error',
                'This account has transactions. Archive it instead of deleting it.',
            );
        }

        $account->delete();

        return back()->with('success', 'Account deleted.');
    }
}
