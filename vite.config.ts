import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        // Where the built SSR bundle listens, baked in at build time. Both values must
        // match `inertia.ssr.url` in config/inertia.php — see the long note there.
        //
        // `port`: 13715, not the default 13714, because the production box already runs
        // another Inertia app on that port and only one process can hold it.
        //
        // `host`: the plugin's default is `0.0.0.0` (@inertiajs/core, server.js), which
        // would put an unauthenticated render endpoint on a public interface. Laravel
        // only ever posts to it over loopback, so binding it there costs nothing and
        // removes the exposure.
        inertia({ ssr: { host: '127.0.0.1', port: 13715 } }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ],
    server: {
        watch: {
            ignored: [
                '**/.agents/**',
                '**/.claude/**',
                '**/.cursor/**',
                '**/.junie/**',
                '**/vendor/**',
            ],
        },
    },
});
