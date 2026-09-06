import { Link } from '@inertiajs/react';
import { LayoutGrid, ReceiptText, Tags, Wallet } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as accounts } from '@/routes/accounts';
import { index as categories } from '@/routes/categories';
import { index as transactions } from '@/routes/transactions';
import type { NavItem } from '@/types';

/**
 * In the order the app is used: the dashboard summarises, the ledger is where the day's
 * work happens, and accounts and categories are the two lists it points at.
 */
const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Transactions',
        href: transactions(),
        icon: ReceiptText,
    },
    {
        title: 'Accounts',
        href: accounts(),
        icon: Wallet,
    },
    {
        title: 'Categories',
        href: categories(),
        icon: Tags,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            {/*
                The starter kit's two links to Laravel's own docs are gone: they are
                scaffolding, and a personal ledger has nothing to say about the framework
                it happens to be built on. NavFooter stays available for whatever earns a
                place there later.
            */}
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
