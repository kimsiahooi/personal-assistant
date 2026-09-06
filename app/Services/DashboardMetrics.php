<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\TransactionType;
use App\Models\Transaction;
use App\Support\LocalDate;
use App\Support\Money;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Every number the dashboard shows, computed in SQL.
 *
 * React receives totals; it never adds money. That is not a style preference — an
 * amount reaches the browser as a decimal string precisely so JavaScript cannot float
 * it, and a `reduce` over those strings would undo the whole arrangement.
 * `scripts/check-structure.sh` rule 5 fails a commit that tries.
 *
 * **Transfers are excluded from every income and expense figure.** Both legs net to
 * zero across all accounts so they cannot move a balance, but counting them would
 * inflate "money in" and "money out" — the two numbers on this page people actually
 * read — by the full amount of every transfer.
 *
 * **Every month here is a LOCAL month, bounded by a UTC window.** `occurred_at` is a UTC
 * instant standing for a local day, so grouping it with `DATE_FORMAT` would file a
 * transaction made on the 1st in Malaysia under the previous month — the exact failure
 * this whole arrangement exists to avoid. Instead each month's boundaries are computed
 * once in PHP by {@see LocalDate::monthRange()} and the query is bounded by them.
 *
 * That makes the trend N small indexed range queries rather than one GROUP BY. It is the
 * deliberate trade: `CONVERT_TZ` would need MySQL's timezone tables loaded (they usually
 * are not) and a fixed offset would be wrong across a daylight-saving boundary. Six
 * bounded queries over an indexed column are cheap and cannot be wrong.
 */
final class DashboardMetrics
{
    public function __construct(private readonly AccountBalances $balances) {}

    /**
     * @param  string  $month  any `Y-m-d` inside the local month being asked about
     * @return array{income: string, expense: string, net: string}
     */
    public function forMonth(string $month, string $timezone): array
    {
        [$from, $to] = LocalDate::monthRange($month, $timezone);

        $totals = Transaction::query()
            ->excludingTransfers()
            ->where('occurred_at', '>=', $from)
            ->where('occurred_at', '<', $to)
            ->selectRaw('COALESCE(SUM(CASE WHEN amount > 0 THEN amount END), 0) as income')
            ->selectRaw('COALESCE(SUM(CASE WHEN amount < 0 THEN -amount END), 0) as expense')
            ->first();

        $income = Money::scale((string) ($totals?->getAttribute('income') ?? '0'));
        $expense = Money::scale((string) ($totals?->getAttribute('expense') ?? '0'));

        return [
            'income' => $income,
            'expense' => $expense,
            'net' => Money::subtract($income, $expense),
        ];
    }

    /**
     * Spending by category for a month, largest first — the donut.
     *
     * Expenses only. Income has its own shape and mixing the two into one ring would
     * make the slices incomparable. Uncategorised spending is returned under a null id
     * rather than dropped, because a donut whose slices do not sum to the expense total
     * is worse than one with an "Uncategorised" wedge.
     *
     * @return list<array{category_id: int|null, name: string, colour: string|null, total: string}>
     */
    public function spendingByCategory(string $month, string $timezone): array
    {
        [$from, $to] = LocalDate::monthRange($month, $timezone);

        // array_values rather than the collection's ->values(): both reindex, but only
        // this one narrows to a list for the type checker.
        return array_values(Transaction::query()
            ->where('type', TransactionType::Expense)
            ->where('occurred_at', '>=', $from)
            ->where('occurred_at', '<', $to)
            ->leftJoin('categories', 'categories.id', '=', 'transactions.category_id')
            ->groupBy('transactions.category_id', 'categories.name', 'categories.colour')
            ->orderByRaw('SUM(-transactions.amount) DESC')
            ->select([
                'transactions.category_id',
                DB::raw('categories.name as name'),
                DB::raw('categories.colour as colour'),
                DB::raw('SUM(-transactions.amount) as total'),
            ])
            // `toBase()` because these rows are aggregates, not Transactions: hydrating
            // a model from `SUM(...) as total` would invent an entity that does not exist
            // and give it attributes the table has no columns for.
            ->toBase()
            ->get()
            ->map(static function (object $row): array {
                // Cast to array rather than reading properties off stdClass: the shape
                // comes from the SELECT above, so there is nothing for a type checker
                // to verify and `$row->total` is only a promise.
                $data = (array) $row;
                $categoryId = $data['category_id'] ?? null;
                $colour = $data['colour'] ?? null;

                return [
                    'category_id' => $categoryId === null ? null : (int) $categoryId,
                    'name' => is_string($data['name'] ?? null) ? (string) $data['name'] : 'Uncategorised',
                    'colour' => is_string($colour) ? $colour : null,
                    'total' => Money::scale((string) ($data['total'] ?? '0')),
                ];
            })
            ->all());
    }

    /**
     * Income and expense for each of the last `$months` LOCAL months, oldest first.
     *
     * One bounded query per month rather than a GROUP BY, for the reason in the class
     * docblock: the month a row belongs to is a local-calendar question and the column
     * is UTC. Months with no activity come back as zero rather than being omitted — a
     * bar chart that silently skips an empty month reads as if time compressed.
     *
     * @param  string  $upTo  any `Y-m-d` inside the most recent local month
     * @return list<array{month: string, income: string, expense: string}>
     */
    public function trend(string $upTo, string $timezone, int $months = 6): array
    {
        $anchor = Carbon::createFromFormat('Y-m-d', $upTo, $timezone)->startOfMonth();
        $series = [];

        for ($i = $months - 1; $i >= 0; $i--) {
            $month = $anchor->copy()->subMonths($i);
            [$from, $to] = LocalDate::monthRange($month->toDateString(), $timezone);

            $row = Transaction::query()
                ->excludingTransfers()
                ->where('occurred_at', '>=', $from)
                ->where('occurred_at', '<', $to)
                ->selectRaw('COALESCE(SUM(CASE WHEN amount > 0 THEN amount END), 0) as income')
                ->selectRaw('COALESCE(SUM(CASE WHEN amount < 0 THEN -amount END), 0) as expense')
                ->first();

            $series[] = [
                'month' => $month->format('Y-m'),
                'income' => Money::scale((string) ($row?->getAttribute('income') ?? '0')),
                'expense' => Money::scale((string) ($row?->getAttribute('expense') ?? '0')),
            ];
        }

        return $series;
    }

    public function balances(): AccountBalances
    {
        return $this->balances;
    }
}
