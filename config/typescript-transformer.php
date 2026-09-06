<?php

declare(strict_types=1);

/*
| NOT the package's config file. spatie/laravel-typescript-transformer v3 ships none
| at all — its configuration is a service provider, App\Providers\
| TypeScriptTransformerServiceProvider. Every v2-era tutorial describing a big
| published file under this name is describing a version that no longer exists.
|
| This is ours, and it holds one key, because a value that has to be overridable at
| run time has to live somewhere `config()` can cache.
*/

return [
    /*
    | Where `php artisan typescript:transform` writes generated.d.ts.
    |
    | The override exists for `bun run check:generated-types`, which transforms into a
    | temp directory to see whether the committed file is stale. A staleness check that
    | writes where it is checking leaves a modified tree behind when it fails, and the
    | next run then reports staleness for a reason unrelated to the change under test —
    | `lang:export --output` exists for exactly the same reason.
    */
    'output_directory' => env('TS_TRANSFORMER_OUTPUT_DIR', resource_path('js/types')),
];
