<?php

declare(strict_types=1);

namespace App\Providers;

use Spatie\LaravelTypeScriptTransformer\TypeScriptTransformerApplicationServiceProvider as BaseServiceProvider;
use Spatie\TypeScriptTransformer\Transformers\AttributedClassTransformer;
use Spatie\TypeScriptTransformer\Transformers\EnumTransformer;
use Spatie\TypeScriptTransformer\TypeScriptTransformerConfigFactory;
use Spatie\TypeScriptTransformer\Writers\GlobalNamespaceWriter;

/**
 * This class IS the transformer's configuration. v3 of the package ships no config
 * file at all — worth stating, because every tutorial and half the internet still
 * describes a `config/typescript-transformer.php` that v3 deleted.
 *
 * It is registered conditionally in bootstrap/providers.php: the package is a dev
 * dependency, so extending its base class would fatal a `composer install --no-dev`
 * boot.
 *
 * Written by hand rather than by `php artisan typescript:install`, whose stub gets
 * three things wrong for this project: it registers Prettier (Biome replaced it), it
 * scans all of `app/`, and it registers itself without the dev-only guard.
 */
class TypeScriptTransformerServiceProvider extends BaseServiceProvider
{
    protected function configure(TypeScriptTransformerConfigFactory $config): void
    {
        $config
            // `AttributedClassTransformer` + `#[TypeScript]`, NOT laravel-data's own
            // `DataTypeScriptTransformer`: that class still ships, but it extends a
            // `DtoTransformer` that v3 removed, so registering it is a fatal rather
            // than a degradation. Opting a class in by attribute is also what keeps a
            // DTO that has no business on the wire (an export payload, say) off it.
            ->transformer(AttributedClassTransformer::class)
            ->transformer(EnumTransformer::class)
            // `app/Data` and `app/Enums` only. The package default walks all of `app/`,
            // which means Roave BetterReflection parsing Models, Http and Providers on
            // every run. Both directories hold nothing BUT wire types, so scanning them
            // costs nothing and forgetting to add one is what silently drops a type.
            ->transformDirectories(app_path('Data'), app_path('Enums'))
            ->outputDirectory($this->outputDirectory())
            // Emits `declare namespace App { namespace Data { … } }` with nothing at
            // file scope. A single top-level `import`/`export` would make the .d.ts a
            // module and the global types would stop resolving everywhere at once.
            ->writer(new GlobalNamespaceWriter('generated.d.ts'));
    }

    /**
     * Normally `resources/js/types` — the path `biome.json` ignores and
     * `check:generated-types` compares against. See config/typescript-transformer.php
     * for why it is overridable at all.
     */
    private function outputDirectory(): string
    {
        $directory = config('typescript-transformer.output_directory');

        return is_string($directory) && $directory !== ''
            ? $directory
            : resource_path('js/types');
    }
}
