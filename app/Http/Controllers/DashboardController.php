<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Data\AccountData;
use App\Models\Account;
use App\Services\AccountBalances;
use App\Services\DashboardMetrics;
use App\Support\LocalDate;
use App\Support\TimeZones;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Every number on this page is computed in SQL by DashboardMetrics and sent as a
 * decimal string. React lays it out and formats it; it does not add.
 */
final class DashboardController
{
    public function __construct(
        private readonly DashboardMetrics $metrics,
        private readonly AccountBalances $balances,
    ) {}

    public function __invoke(Request $request): Response
    {
        // The viewer's today, resolved on the SERVER from the zone their browser
        // reported into a cookie before first paint. Never derived in render: the SSR
        // pass and the client would disagree, which is a hydration mismatch — and at
        // 09:00 in Kuala Lumpur the server's own UTC clock still says yesterday.
        $timezone = TimeZones::resolve($request);
        $today = LocalDate::today($timezone);
        $accounts = $this->balances->forAll();

        return Inertia::render('dashboard', [
            'month' => substr($today, 0, 7),
            'timezone' => $timezone,
            'totals' => $this->metrics->forMonth($today, $timezone),
            'net_worth' => $this->balances->net($accounts),
            'accounts' => $accounts->map(
                fn (Account $account) => AccountData::fromAccount(
                    $account,
                    (string) $account->getAttribute('balance'),
                ),
            )->all(),
            'spending' => $this->metrics->spendingByCategory($today, $timezone),
            'trend' => $this->metrics->trend($today, $timezone),
        ]);
    }
}
