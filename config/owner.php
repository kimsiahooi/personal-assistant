<?php

declare(strict_types=1);

/*
| The single account this app is for.
|
| Registration is disabled, so `php artisan db:seed` is the only way an account comes
| into existence. The values live here rather than in the seeder because `env()` returns
| null once `php artisan config:cache` has run — a seeder reading it directly would
| quietly create nothing on a configured machine, which is the failure you notice last.
*/

return [
    'name' => env('SEED_USER_NAME', 'Owner'),
    'email' => env('SEED_USER_EMAIL'),
    'password' => env('SEED_USER_PASSWORD'),
];
