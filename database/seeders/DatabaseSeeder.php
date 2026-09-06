<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AccountType;
use App\Enums\CategoryKind;
use App\Models\Account;
use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Registration is disabled — this seeder is the only way an account comes into
     * existence, so it has to be safe to re-run and safe to commit. The credentials
     * come from `config/owner.php` (backed by SEED_USER_* in the gitignored .env):
     * this file is committed, and a password in version control outlives every
     * rotation.
     *
     * `firstOrCreate` keys on the email, so a re-seed after adding demo data leaves the
     * existing account — and its password — alone.
     */
    public function run(): void
    {
        $email = config('owner.email');

        if (! is_string($email) || $email === '') {
            $this->command->warn(
                'SEED_USER_EMAIL is not set — skipping the owner account.',
            );

            return;
        }

        $name = config('owner.name');
        $password = config('owner.password');

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => is_string($name) && $name !== '' ? $name : 'Owner',
                'password' => Hash::make(
                    is_string($password) && $password !== '' ? $password : 'password',
                ),
                'email_verified_at' => now(),
            ],
        );

        $this->command->info($user->wasRecentlyCreated
            ? "Created the owner account for {$email}."
            : "Owner account for {$email} already exists — left untouched.");

        $this->seedStarterData($user);
    }

    /**
     * A starting set of accounts and categories, so the first screen is not empty.
     *
     * `firstOrCreate` on the natural key, so re-seeding never duplicates and never
     * overwrites something the user has since renamed. Amounts stay at zero: a fabricated
     * opening balance would show up in the net-worth figure as money that does not exist.
     */
    private function seedStarterData(User $user): void
    {
        $accounts = [
            ['name' => 'Cash', 'type' => AccountType::Cash],
            ['name' => 'Bank', 'type' => AccountType::Bank],
        ];

        foreach ($accounts as $account) {
            Account::firstOrCreate(
                ['user_id' => $user->id, 'name' => $account['name']],
                ['type' => $account['type'], 'opening_balance' => '0.00'],
            );
        }

        $categories = [
            [CategoryKind::Income, 'Salary', 'chart-1', 'banknote'],
            [CategoryKind::Income, 'Other income', 'chart-2', 'circle-plus'],
            [CategoryKind::Expense, 'Food', 'chart-1', 'utensils'],
            [CategoryKind::Expense, 'Transport', 'chart-2', 'car'],
            [CategoryKind::Expense, 'Bills', 'chart-3', 'receipt'],
            [CategoryKind::Expense, 'Shopping', 'chart-4', 'shopping-bag'],
            [CategoryKind::Expense, 'Other', 'chart-5', 'ellipsis'],
        ];

        foreach ($categories as [$kind, $name, $colour, $icon]) {
            Category::firstOrCreate(
                ['user_id' => $user->id, 'kind' => $kind, 'name' => $name],
                ['colour' => $colour, 'icon' => $icon],
            );
        }

        $this->command->info('Starter accounts and categories are in place.');
    }
}
