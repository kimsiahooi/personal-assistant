import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { invalidatePrefetchOnWrite } from '@/lib/prefetch-cache';

// The fallback matters: VITE_ vars are inlined at BUILD time, so a bundle built without
// one is titled by this string forever. The scaffold left "Laravel" here.
const appName = import.meta.env.VITE_APP_NAME || 'Personal Assistant';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        // A token, not the starter kit's fixed grey. Inertia interpolates this straight
        // into a stylesheet it appends to `<body>` — `background: ${color}`, plus a
        // box-shadow and the spinner's border — so a `var()` resolves against `:root` and
        // the bar follows the theme instead of staying one fixed grey in both.
        //
        // `--link`, not `--primary`: `--primary` is a *surface* colour, contrast-checked
        // against what sits on top of it and deliberately darker in dark mode, where a
        // 2px bar against the page would nearly disappear. See docs/UI-UX-GUIDELINES.md.
        color: 'var(--link)',
    },
});

// Nav links prefetch on hover, and a write in between would otherwise be invisible.
invalidatePrefetchOnWrite();

// This will set light / dark mode on load...
initializeTheme();
