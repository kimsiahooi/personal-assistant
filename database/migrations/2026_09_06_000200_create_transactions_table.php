<?php

declare(strict_types=1);

use App\Models\Account;
use App\Models\Category;
use App\Models\User;
use App\Support\LocalDate;
use App\Support\TimeZones;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The ledger. Every movement of money, one row per account it touched.
 *
 * **`amount` is signed, and there is no direction column.** Income is positive, expense
 * is negative. One column rather than two means a balance is `SUM(amount)` and never a
 * CASE, and it makes "in" and "out" impossible to disagree with each other. `type` says
 * what a row *means*; the sign says what it *does*, and the model keeps the two
 * consistent so nothing downstream has to check.
 *
 * **A transfer is two rows, not one.** Moving RM 50 from Maybank to Cash writes −50.00
 * against Maybank and +50.00 against Cash, sharing a `transfer_group_id`. The
 * alternative — one row with a `to_account_id` — reads better in a list and is worse
 * everywhere else: every balance would have to match a row on either of two columns,
 * which is an OR-join MySQL indexes poorly, and it runs on the dashboard, the accounts
 * list and every running balance. With two legs each row belongs to exactly one account,
 * so the balance query is a plain indexed join and is identical for all three types.
 * The cost is real and lands in one place: the all-accounts list shows a transfer twice
 * unless it filters to one leg, and an edit or delete must touch both rows atomically.
 *
 * **`occurred_at` is a UTC timestamp holding a local calendar day.** A person picks
 * 2 September; in Malaysia that is stored as `2026-09-01T16:00:00Z` — the instant their
 * day began. Every column in this database is UTC, and this one is no exception.
 *
 * That standardisation is only coherent because the conversion is not optional at any
 * boundary. {@see LocalDate} owns all of it: a picked date becomes an
 * instant on write, a filter's local range becomes a UTC window, a monthly total groups
 * by the LOCAL month, and a row is read back as the date the viewer would call it. The
 * zone comes from {@see TimeZones}, a server value the browser reports
 * into a cookie before first paint — never `resolvedOptions()` during a render, which
 * would hydrate differently on the server and in the browser.
 *
 * The failure this arrangement has to keep avoiding: a transaction on the 1st of a
 * month is the previous month in UTC. Grouping raw would move it, and the totals it
 * moved between are the two numbers on the dashboard people actually read. Nothing
 * queries this column without going through LocalDate.
 *
 * `created_at` still records when the row was ENTERED, which is a different question
 * and occasionally a useful one.
 *
 * `restrictOnDelete` on the account: deleting an account must never silently erase the
 * history of what moved through it. An account with transactions is archived instead.
 * The category is `nullOnDelete` because a category is a label — removing one should
 * uncategorise its transactions, not destroy them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignIdFor(User::class)->constrained()->cascadeOnDelete();
            $table->foreignIdFor(Account::class)->constrained()->restrictOnDelete();
            // Null for a transfer — moving money between your own accounts is not
            // spending — and null for anything not yet categorised.
            $table->foreignIdFor(Category::class)->nullable()->constrained()->nullOnDelete();
            // App\Enums\TransactionType — income, expense or transfer.
            $table->string('type', 10);
            $table->decimal('amount', 15, 2);
            $table->char('currency', 3)->default('MYR');
            $table->timestamp('occurred_at');
            $table->string('note')->nullable();
            // Shared by the two legs of one transfer, and null for everything else.
            // A ULID rather than a self-referencing id so both legs can be written in
            // one insert without one of them having to exist first.
            $table->ulid('transfer_group_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // The three questions this table is asked, each date-ordered, so the date is
            // part of the index rather than a sort afterwards: "what happened", "what
            // happened in this account", and "what did I spend on this".
            $table->index(['user_id', 'occurred_at']);
            $table->index(['account_id', 'occurred_at']);
            $table->index(['category_id', 'occurred_at']);
            // Finding the other leg, and only that.
            $table->index('transfer_group_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
