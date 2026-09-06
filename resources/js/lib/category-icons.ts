import type { LucideIcon } from 'lucide-react';
import {
    Banknote,
    Bus,
    Car,
    CirclePlus,
    Ellipsis,
    Gift,
    HeartPulse,
    House,
    Plane,
    Receipt,
    ShoppingBag,
    Smartphone,
    Sparkles,
    Utensils,
    Wallet,
} from 'lucide-react';

/**
 * The icons a category may wear.
 *
 * **A fixed map, not a lookup into the whole of lucide.** Resolving an arbitrary name at
 * runtime means importing every icon in the library — some 1,600 of them — and the
 * bundler cannot tree-shake what an index expression might reach. Fifteen named imports
 * cost fifteen icons.
 *
 * The keys are lucide's own kebab-case names, so `icon` in the database reads as what it
 * is, and adding one here is the only step needed to offer it.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
    banknote: Banknote,
    bus: Bus,
    car: Car,
    'circle-plus': CirclePlus,
    ellipsis: Ellipsis,
    gift: Gift,
    'heart-pulse': HeartPulse,
    house: House,
    plane: Plane,
    receipt: Receipt,
    'shopping-bag': ShoppingBag,
    smartphone: Smartphone,
    sparkles: Sparkles,
    utensils: Utensils,
    wallet: Wallet,
};

/** The names the picker offers, alphabetically — which is how someone scans a list. */
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS).sort();
