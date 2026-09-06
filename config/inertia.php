<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Server Side Rendering
    |--------------------------------------------------------------------------
    |
    | These options configures if and how Inertia uses Server Side Rendering
    | to pre-render each initial request made to your application's pages
    | so that server rendered HTML is delivered for the user's browser.
    |
    | See: https://inertiajs.com/server-side-rendering
    |
    */

    'ssr' => [
        'enabled' => true,

        /*
         * Where Laravel POSTs a page to have it rendered.
         *
         * **13715, not the default 13714**, and it must match
         * `inertia({ ssr: { port } })` in vite.config.ts — that option is what the built
         * bundle binds, and it is baked in at build time. If the two disagree Laravel
         * posts into a closed port, silently falls back to client rendering, and logs
         * nothing at all.
         *
         * 13714 is every Inertia app's default, and the production box already runs one:
         * the multi-tenant ERP at kimsiah.site holds that port. Two SSR processes cannot
         * share one — the second to start dies with EADDRINUSE and pm2 restart-loops it,
         * while its Laravel keeps posting to the port and reaches the OTHER app's render
         * server. Both apps are the same starter kit, so `dashboard`, `auth/login` and
         * `settings/profile` exist in both bundles and can actually resolve there.
         * Whichever process starts first wins, so a reboot decides which app loses SSR.
         *
         * Read from env as well so the port can be moved on the box without a rebuild —
         * though moving it means rebuilding anyway, since the bundle binds what vite
         * compiled in. The env var exists to keep the two halves visible together in
         * `.env`, not to make them independent. See docs/DEPLOYMENT.md.
         */
        'url' => env('INERTIA_SSR_URL', 'http://127.0.0.1:13715'),

        // 'bundle' => base_path('bootstrap/ssr/ssr.mjs'),

    ],

    /*
    |--------------------------------------------------------------------------
    | Pages
    |--------------------------------------------------------------------------
    |
    | These options configure how Inertia discovers page components on the
    | filesystem. The paths and extensions are used to locate components
    | when rendering responses and during testing assertions.
    |
    */

    'pages' => [

        'paths' => [
            resource_path('js/pages'),
        ],

        'extensions' => [
            'js',
            'jsx',
            'svelte',
            'ts',
            'tsx',
            'vue',
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Testing
    |--------------------------------------------------------------------------
    |
    | The values described here are used to locate Inertia components on the
    | filesystem. For instance, when using `assertInertia`, the assertion
    | attempts to locate the component as a file relative to the paths.
    |
    */

    'testing' => [

        'ensure_pages_exist' => true,

    ],

];
