import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: ReactNode;
};

/**
 * The designed empty state: icon tile, heading, one line of explanation, and a way
 * forward. Used for both "nothing here yet" and "your search matched nothing" — the two
 * say different things, so callers pass different copy.
 */
export function EmptyState({ icon: Icon, title, description, action }: Props) {
    return (
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Icon className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
                <p className="font-medium">{title}</p>
                <p className="mx-auto max-w-sm text-muted-foreground text-sm">
                    {description}
                </p>
            </div>
            {action}
        </div>
    );
}
