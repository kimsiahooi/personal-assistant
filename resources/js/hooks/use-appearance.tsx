import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

const listeners = new Set<() => void>();
let currentAppearance: Appearance = 'system';

const prefersDark = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    // biome-ignore lint/suspicious/noDocumentCookie: SSR reads this cookie to render the correct theme on the first paint.
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const getStoredAppearance = (): Appearance => {
    if (typeof window === 'undefined') {
        return 'system';
    }

    return (localStorage.getItem('appearance') as Appearance) || 'system';
};

const isDarkMode = (appearance: Appearance): boolean => {
    return appearance === 'dark' || (appearance === 'system' && prefersDark());
};

/**
 * What the theme currently resolves to, cached so React can subscribe to it.
 *
 * `useSyncExternalStore` compares snapshots by identity and bails when nothing changed —
 * so deriving "is it dark right now" at render time put it outside the store entirely, and
 * a `notify()` carrying an unchanged `currentAppearance` (still `'system'`) would not have
 * re-rendered anything anyway. Keeping it here gives the OS theme its own observable value.
 */
let currentResolved: ResolvedAppearance = 'light';

const applyTheme = (appearance: Appearance): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const isDark = isDarkMode(appearance);

    currentResolved = isDark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => {
    listeners.forEach((listener) => {
        listener();
    });
};

const mediaQuery = (): MediaQueryList | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.matchMedia('(prefers-color-scheme: dark)');
};

/**
 * The OS theme changed while the app is following it.
 *
 * `notify()` is the half that was missing: `applyTheme` toggled the `dark` class, so
 * everything driven by CSS followed, and everything driven by React did not. The 2FA
 * modal picks its QR colours from `resolvedAppearance`, so a system flip while it was open
 * left the code drawn for the old theme — unreadable, on the one screen where being
 * unreadable costs you the recovery codes.
 */
const handleSystemThemeChange = (): void => {
    applyTheme(currentAppearance);
    notify();
};

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    if (!localStorage.getItem('appearance')) {
        localStorage.setItem('appearance', 'system');
        setCookie('appearance', 'system');
    }

    currentAppearance = getStoredAppearance();
    applyTheme(currentAppearance);

    // Set up system theme change listener
    mediaQuery()?.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance(): UseAppearanceReturn {
    const appearance: Appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'system',
    );

    // Read from the store, not derived at render: see `currentResolved`. The server
    // snapshot is 'light' because the SSR pass has no media query to ask, and the
    // pre-paint script in app.blade.php has already put the real class on <html> by the
    // time anything is visible.
    const resolvedAppearance: ResolvedAppearance = useSyncExternalStore(
        subscribe,
        () => currentResolved,
        () => 'light',
    );

    const updateAppearance = (mode: Appearance): void => {
        currentAppearance = mode;

        // Store in localStorage for client-side persistence...
        localStorage.setItem('appearance', mode);

        // Store in cookie for SSR...
        setCookie('appearance', mode);

        applyTheme(mode);
        notify();
    };

    return { appearance, resolvedAppearance, updateAppearance } as const;
}
