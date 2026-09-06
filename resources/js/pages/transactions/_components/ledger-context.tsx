import { createContext, type ReactNode, useContext, useMemo } from 'react';

type Category = App.Data.CategoryData;
type AccountOption = { id: number; name: string };

export type Ledger = {
    accounts: AccountOption[];
    categories: Category[];
    /** The viewer's today, resolved server-side. */
    today: string;
};

const LedgerContext = createContext<Ledger | null>(null);

/**
 * The page props a row's Edit dialog needs, made reachable from inside a table cell.
 *
 * **The problem this solves is that column definitions live at module scope.** TanStack
 * treats the column array as an input and rebuilds every column instance when it changes,
 * so a cell cannot close over anything the page component holds — which is exactly where
 * `accounts`, `categories` and `today` arrive. Threading them through the table as a prop
 * would mean `DataTable` knowing about one resource's payload.
 *
 * A context is the smallest thing that bridges it: the page provides, the cell consumes,
 * and neither the table nor the column definitions are involved.
 *
 * Not `usePage()`, deliberately: that is typed against the *shared* props, and reading a
 * page-specific one from it needs a cast that would compile whatever the server actually
 * sent. This is checked.
 */
export function LedgerProvider({
    accounts,
    categories,
    today,
    children,
}: Ledger & { children: ReactNode }) {
    // A stable object, so every consuming cell does not re-render because the page did.
    const value = useMemo(
        () => ({ accounts, categories, today }),
        [accounts, categories, today],
    );

    return (
        <LedgerContext.Provider value={value}>
            {children}
        </LedgerContext.Provider>
    );
}

export function useLedger(): Ledger {
    const value = useContext(LedgerContext);

    if (value === null) {
        // A row rendered outside the provider would otherwise fail later and further away
        // — an empty account picker, or a date field defaulting to nothing.
        throw new Error('useLedger must be used inside <LedgerProvider>.');
    }

    return value;
}
