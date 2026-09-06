<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\RecordTransfer;
use App\Data\CategoryData;
use App\Data\TransactionData;
use App\Enums\TransactionType;
use App\Http\Controllers\Concerns\RendersResourceIndex;
use App\Http\Controllers\Concerns\RespondsWithToast;
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
    use RespondsWithToast;

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
        // Each bound converts on its own, so half a range still narrows the list. Binding
        // them together meant a `from` with no `to` counted towards the Filters badge and
        // changed nothing — a filter that says it is on and is not.
        //
        // A local day becomes a UTC instant here because the column is UTC: comparing the
        // raw local string against it would drop the first day of any range for a viewer
        // east of UTC and add an extra one for a viewer west of it. The upper bound is
        // half-open — the start of the day *after* `$to` — because the alternative needs a
        // "last representable instant", and `23:59:59` silently drops the final second.
        $fromUtc = $from === null ? null : LocalDate::toUtc($from, $timezone);
        $toUtc = $to === null ? null : LocalDate::toUtc($to, $timezone)->addDay();

        $query = Transaction::query()
            ->with(['account:id,name', 'category:id,name,colour,icon'])
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
                    $this->counterpart($t),
                ),
            ),
            'filters' => $list['filters'],
            'accounts' => Account::query()->active()->orderBy('name')
                ->get(['id', 'name'])->map->only(['id', 'name'])->all(),
            'categories' => Category::query()->active()->orderBy('name')->get()
                ->map(CategoryData::fromCategory(...))->all(),
            // The viewer's own today, so the form can default to it and the range presets
            // have something to count back from. Sent rather than derived in the browser:
            // `new Date()` there is the ambient clock, which is the one thing SSR cannot
            // agree on — and it would be the browser's idea of today rather than the one
            // this page's rows were converted against.
            'today' => LocalDate::today($timezone),
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

            $this->toast('Transfer recorded.');

            return back();
        }

        Transaction::create($request->transactionAttributes());

        $this->toast('Transaction recorded.');

        return back();
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

            $this->toast('Transfer updated.');

            return back();
        }

        $transaction->update($request->transactionAttributes());

        $this->toast('Transaction updated.');

        return back();
    }

    public function destroy(Transaction $transaction): RedirectResponse
    {
        if ($transaction->isTransfer()) {
            $this->transfers->deletePair($transaction);

            $this->toast('Transfer deleted.');

            return back();
        }

        $transaction->delete();

        $this->toast('Transaction deleted.');

        return back();
    }

    /**
     * The other leg of a transfer, with its account loaded — the list names it and the
     * edit form pre-selects it.
     *
     * One query per transfer row, which is a genuine N+1 and is accepted here: only
     * transfers pay it, a page holds at most 100 rows, and the alternative is a second
     * self-join keyed on `transfer_group_id` that would complicate every other read of
     * this list. Recorded in docs/ROADMAP.md rather than pretended away.
     */
    private function counterpart(Transaction $transaction): ?Transaction
    {
        if (! $transaction->isTransfer()) {
            return null;
        }

        return $transaction->counterpart()->with('account:id,name')->first();
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
