import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addDays, startOfMonth, startOfYear } from '@/lib/format';

/**
 * A from/to range over local calendar days, with the four ranges anyone actually asks for.
 *
 * **Native `<input type="date">`, not a rendered calendar.** SSR is on, and every calendar
 * component has to answer "which month do I open on" — which is `new Date()`, a value the
 * server and the browser compute at different instants and can disagree about across a
 * midnight boundary. `ui-guard.sh` blocks the obvious spelling of that and cannot see the
 * rest. The native control has a real picker on every platform, a real keyboard mode, and
 * needs no answer from us at all.
 *
 * **`today` comes from the server, for the same reason.** The presets are calendar
 * arithmetic and need a starting point; deriving it in the browser would be the ambient
 * clock again, and it would be the *browser's* idea of today rather than the one the
 * server used to convert every row on the page. See `App\Support\LocalDate::today()`.
 *
 * Both bounds change in one visit — see {@link FilterApi.setMany} — so a range is one
 * history entry rather than a half-applied one the back button can land on.
 */
export function DateRangeFilter({
    from,
    to,
    today,
    onChange,
}: {
    /** `Y-m-d`, or `''` for unbounded. */
    from: string;
    to: string;
    /** The viewer's own today, resolved server-side. */
    today: string;
    onChange: (range: { from: string; to: string }) => void;
}) {
    const id = useId();
    const fromId = `${id}-from`;
    const toId = `${id}-to`;

    const presets: { label: string; from: string; to: string }[] = [
        { label: 'This month', from: startOfMonth(today), to: today },
        { label: 'Last 30 days', from: addDays(today, -29), to: today },
        { label: 'This year', from: startOfYear(today), to: today },
        { label: 'All time', from: '', to: '' },
    ];

    const active = (preset: { from: string; to: string }) =>
        preset.from === from && preset.to === to;

    return (
        <div className="space-y-2">
            <span className="font-medium text-sm">Date range</span>

            <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                    <Button
                        key={preset.label}
                        type="button"
                        size="sm"
                        variant={active(preset) ? 'secondary' : 'ghost'}
                        aria-pressed={active(preset)}
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                            onChange({ from: preset.from, to: preset.to })
                        }
                    >
                        {preset.label}
                    </Button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <Label
                        htmlFor={fromId}
                        className="text-muted-foreground text-xs"
                    >
                        From
                    </Label>
                    <Input
                        id={fromId}
                        type="date"
                        value={from}
                        // An open-ended range is legitimate, so neither bound constrains
                        // the other's `max`/`min`: a `to` earlier than `from` simply
                        // matches nothing, which the empty state already explains.
                        max={today}
                        className="h-8"
                        onChange={(event) =>
                            onChange({ from: event.target.value, to })
                        }
                    />
                </div>
                <div className="space-y-1">
                    <Label
                        htmlFor={toId}
                        className="text-muted-foreground text-xs"
                    >
                        To
                    </Label>
                    <Input
                        id={toId}
                        type="date"
                        value={to}
                        max={today}
                        className="h-8"
                        onChange={(event) =>
                            onChange({ from, to: event.target.value })
                        }
                    />
                </div>
            </div>
        </div>
    );
}
