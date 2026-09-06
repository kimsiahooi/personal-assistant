<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\RecordTransfer;
use App\Data\CategoryData;
use App\Data\TransactionData;
use App\Enums\TransactionType;
use App\Http\Controllers\Concerns\RendersResourceIndex;
use App\Http\Requests\TransactionRequest;
use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use App\Support\LocalDate;
use App\Support\TimeZones;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class TransactionController
{
    use RendersResourceIndex;

    public function __construct(private readonly RecordTransfer $transfers) {}

    /**
     * The ledger.
     *
     * **Only the outbound leg of a transfer is listed** unless the list is filtered to
     * one account. Across all accounts a transfer is one event, and showing both legs
     * would read as two; inside one account both legs are genuinely separate movements
     * of that account's money, and hiding one would make the running balance jump.
     */
    public function index(Request $request): Response
    {
        $accountId = $this->ownedId($request, 'account_id', Account::class);
        $categoryId = $this->ownedId($request, 'category_id', Category::class);
        $type = TransactionType::tryFrom((string) $request->query('type', ''));
        $timezone = TimeZones::resolve($request);
        [$from, $to] = $this->dateRange($request);
        // A local range becomes a half-open UTC window. Comparing the raw local strings
        // against a UTC column would drop the first day of any range for a viewer east
        // of UTC, and add an extra one for a viewer west of it.
        [$fromUtc, $toUtc] = $from !== null && $to !== null
            ? LocalDate::range($from, $to, $timezone)
            : [null, null];

        $query = Transaction::query()
            ->with(['account:id,name', 'category:id,name,colour'])
            ->when($accountId !== null, fn ($q) => $q->where('account_id', $accountId))
            ->when($categoryId !== null, fn ($q) => $q->where('category_id', $categoryId))
            ->when($type !== null, fn ($q) => $q->where('type', $type))
            ->when($fromUtc !== null, fn ($q) => $q->where('occurred_at', '>=', $fromUtc))
            ->when($toUtc !== null, fn ($q) => $q->where('occurred_at', '<', $toUtc))
            // One row per transfer when looking across accounts; both when inside one.
            ->when(
                $accountId === null,
                fn ($q) => $q->where(fn ($inner) => $inner
                    ->where('type', '!=', TransactionType::Transfer)
                    ->orWhere('amount', '<', 0)),
            );

        $list = $this->resourceList(
            request: $request,
            query: $query,
            sortable: ['occurred_at', 'amount', 'created_at'],
            search: static function (Builder $query, string $term): void {
                $query->where('note', 'like', "%{$term}%");
            },
            extra: array_filter([
                'account_id' => $accountId === null ? '' : (string) $accountId,
                'category_id' => $categoryId === null ? '' : (string) $categoryId,
                'type' => $type->value ?? '',
                'from' => $from ?? '',
                'to' => $to ?? '',
            ]),
            defaultDirection: 'desc',
        );

        return Inertia::render('transactions/index', [
            'transactions' => $list['rows']->through(
                fn (Transaction $t) => TransactionData::fromTransaction(
                    $t,
                    $timezone,
                    $this->counterpartName($t),
                ),
            ),
            'filters' => $list['filters'],
            'accounts' => Account::query()->active()->orderBy('name')
                ->get(['id', 'name'])->map->only(['id', 'name'])->all(),
            'categories' => Category::query()->active()->orderBy('name')->get()
                ->map(CategoryData::fromCategory(...))->all(),
        ]);
    }

    public function store(TransactionRequest $request): RedirectResponse
    {
        $data = $request->validated();

        if ($request->isTransfer()) {
            $this->transfers->handle(
                (int) $data['account_id'],
                (int) $data['to_account_id'],
                (string) $data['amount'],
                $request->occurredAt(),
                $data['note'] ?? null,
            );

            return back()->with('success', 'Transfer recorded.');
        }

        Transaction::create($request->transactionAttributes());

        return back()->with('success', 'Transaction recorded.');
    }

    public function update(TransactionRequest $request, Transaction $transaction): RedirectResponse
    {
        $data = $request->validated();

        // A transfer is a pair, so editing one is replacing both — and changing a row
        // between transfer and not means the pair has to be unmade or made.
        if ($request->isTransfer() || $transaction->isTransfer()) {
            $this->transfers->replace(
                $transaction,
                (int) $data['account_id'],
                (int) ($data['to_account_id'] ?? $data['account_id']),
                (string) $data['amount'],
                $request->occurredAt(),
                $data['note'] ?? null,
            );

            return back()->with('success', 'Transfer updated.');
        }

        $transaction->update($request->transactionAttributes());

        return back()->with('success', 'Transaction updated.');
    }

    public function destroy(Transaction $transaction): RedirectResponse
    {
        if ($transaction->isTransfer()) {
            $this->transfers->deletePair($transaction);

            return back()->with('success', 'Transfer deleted.');
        }

        $transaction->delete();

        return back()->with('success', 'Transaction deleted.');
    }

    /** The account at the other end of a transfer, for the list to name. */
    private function counterpartName(Transaction $transaction): ?string
    {
        if (! $transaction->isTransfer()) {
            return null;
        }

        return $transaction->counterpart()->with('account:id,name')->first()?->account->name;
    }

    /** A query id, kept only if it resolves to one of the user's own rows. */
    private function ownedId(Request $request, string $key, string $model): ?int
    {
        $value = (int) $request->query($key, 0);

        return $value > 0 && $model::query()->whereKey($value)->exists() ? $value : null;
    }

    /** @return array{0: ?string, 1: ?string} */
    private function dateRange(Request $request): array
    {
        $valid = static function (mixed $value): ?string {
            $date = is_string($value) ? trim($value) : '';

            return preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) === 1 ? $date : null;
        };

        return [$valid($request->query('from')), $valid($request->query('to'))];
    }
}
