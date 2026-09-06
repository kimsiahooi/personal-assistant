<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AccountType;
use App\Enums\CategoryKind;
use App\Models\Account;
use App\Models\Category;
use App\Models\User;
use App\Providers\AppServiceProvider;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use RuntimeException;

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
     * The account is looked up before it is created, rather than going through
     * `firstOrCreate`, so that {@see self::ownerPassword()} is consulted only when a
     * password is actually about to be written. Re-seeding a live box to pick up new
     * starter data then does not demand SEED_USER_PASSWORD be put back into `.env`.
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

        $user = User::firstWhere('email', $email);

        if ($user === null) {
            $name = config('owner.name');

            $user = User::create([
                'name' => is_string($name) && $name !== '' ? $name : 'Owner',
                'email' => $email,
                'password' => Hash::make($this->ownerPassword()),
            ]);

            // `forceFill`, because `email_verified_at` is not in User's #[Fillable] —
            // passing it to create() looks like it works and is silently discarded,
            // which is what this seeder used to do. Nothing reads the column today
            // (verification is disabled and User does not implement MustVerifyEmail),
            // but it is stamped anyway: the day verification is switched back on, the
            // owner would be sent a verification email and MAIL_MAILER has nowhere to
            // deliver one.
            $user->forceFill(['email_verified_at' => now()])->save();

            $this->command->info("Created the owner account for {$email}.");
        } else {
            $this->command->info(
                "Owner account for {$email} already exists — left untouched.",
            );
        }

        $this->seedStarterData($user);
    }

    /**
     * The password for a brand-new owner account — refused, never weakened, in production.
     *
     * Outside production an unset SEED_USER_PASSWORD falls back to `password`, which is
     * what makes a fresh clone usable in one command. In production that same fallback
     * would put a publicly-known password on a public URL, print "Created the owner
     * account" as though nothing were wrong, and — because registration is disabled —
     * leave nobody with a reason to look. Being the only door in is exactly why this one
     * cannot be left unlocked.
     *
     * Validated against `Password::defaults()` rather than a rule list written here, so
     * the owner is held to the same bar as every password the app accepts through a form:
     * in production 12 characters, mixed case, a number, a symbol, and not found in a
     * known breach (see {@see AppServiceProvider}). One definition, so
     * the two cannot drift apart.
     *
     * Throws rather than warns. `db:seed --force` runs unattended, and a warning on the
     * stdout of a deploy is a warning nobody reads.
     */
    private function ownerPassword(): string
    {
        $configured = config('owner.password');
        $password = is_string($configured) ? $configured : '';

        if (! app()->isProduction()) {
            return $password !== '' ? $password : 'password';
        }

        $validator = Validator::make(
            ['password' => $password],
            ['password' => ['required', 'string', Password::defaults()]],
        );

        if ($validator->fails()) {
            throw new RuntimeException(
                'SEED_USER_PASSWORD is not usable in production: '
                .implode(' ', $validator->errors()->all())
                .' Nothing was created — set it in .env and run the seeder again.',
            );
        }

        return $password;
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
