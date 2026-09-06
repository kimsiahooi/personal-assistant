<?php

use App\Providers\AppServiceProvider;
use App\Providers\FortifyServiceProvider;
use App\Providers\TypeScriptTransformerServiceProvider;
use Spatie\LaravelTypeScriptTransformer\TypeScriptTransformerApplicationServiceProvider;

return array_values(array_filter([
    AppServiceProvider::class,
    FortifyServiceProvider::class,
    // Dev-only, and deliberately guarded: TypeScriptTransformerServiceProvider extends
    // a class from a require-dev package, so listing it unconditionally turns
    // `composer install --no-dev` into a class-not-found fatal at boot.
    class_exists(TypeScriptTransformerApplicationServiceProvider::class)
        ? TypeScriptTransformerServiceProvider::class
        : null,
]));
