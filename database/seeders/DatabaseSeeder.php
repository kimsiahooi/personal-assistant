<?php

namespace Database\Seeders;

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
     * come from the environment rather than from this file: `.env` is gitignored,
     * this file is not, and a password in version control outlives every rotation.
     *
     * `firstOrCreate` keys on the email so a re-seed after adding demo data leaves
     * the existing account, and its password, alone.
     */
    public function run(): void
    {
        $email = env('SEED_USER_EMAIL');

        if (blank($email)) {
            $this->command?->warn('SEED_USER_EMAIL is not set — skipping the owner account.');

            return;
        }

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => env('SEED_USER_NAME', 'Owner'),
                'password' => Hash::make(env('SEED_USER_PASSWORD', 'password')),
                'email_verified_at' => now(),
            ],
        );

        $this->command?->info($user->wasRecentlyCreated
            ? "Created the owner account for {$email}."
            : "Owner account for {$email} already exists — left untouched.");
    }
}
