<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Reports the browser's IANA time zone so the SERVER can format dates in it.
             Timestamps are stored and sent in UTC; only the rendering is local. The
             server has to know the zone before it renders, because under SSR the same
             markup is produced twice and a zone the client picked for itself would make
             the two disagree — a React #418 hydration mismatch. Same reasoning, and the
             same before-first-paint placement, as the appearance script above. --}}
        <script>
            (function() {
                function stored() {
                    const match = document.cookie.match(/(?:^|;\s*)timezone=([^;]*)/);

                    return match ? decodeURIComponent(match[1]) : null;
                }

                try {
                    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

                    if (!zone || stored() === zone) {
                        return;
                    }

                    document.cookie = 'timezone=' + encodeURIComponent(zone)
                        + ';path=/;max-age=31536000;samesite=lax';

                    // This page was rendered before the server knew the zone, so its
                    // dates are in the wrong one. Reload from <head>, before anything
                    // is painted — that costs one request on a browser's first visit
                    // and nothing afterwards, and it beats a visible flash of UTC.
                    //
                    // Guarded on the write actually landing: with cookies blocked it
                    // never does, and reloading on that would spin forever.
                    if (stored() === zone) {
                        window.location.reload();
                    }
                } catch (e) {
                    // No Intl, or cookies refused. Dates stay in UTC, which is what the
                    // database holds anyway — degraded, not broken.
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
