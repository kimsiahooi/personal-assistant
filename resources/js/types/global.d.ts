import type { Auth } from '@/types/auth';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            /**
             * The IANA zone this visit is rendered in, resolved by `App\Support\TimeZones`
             * from a cookie the browser sets before first paint. Shared rather than read
             * from `Intl` in the browser: the server has already formatted this page's
             * dates against one zone, and both sides have to name the same one or
             * hydration diverges. See `useTimeZone`.
             */
            timezone: string;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
