import * as React from "react";
import { GlobalSearch } from "./GlobalSearch";
import { QuickCreate } from "./QuickCreate";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { CompanySwitcher } from "./CompanySwitcher";
import { Breadcrumbs } from "./Breadcrumbs";
import { cn } from "@/lib/utils";

export interface HeaderProps {
  className?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export function Header({ className }: HeaderProps) {
  return (
    <header className={cn("sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-950/95 dark:supports-[backdrop-filter]:bg-slate-950/60", className)}>
      <div className="container flex h-16 items-center justify-between gap-4 px-4 md:px-8">
        <div className="flex items-center gap-4 flex-1">
          <CompanySwitcher />
          <div className="hidden md:flex">
            <Breadcrumbs />
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-3 flex-1">
          <div className="w-full max-w-sm flex-1 hidden md:block">
            <GlobalSearch />
          </div>
          <QuickCreate />
          <NotificationBell />
        </div>
      </div>
      {/* Breadcrumbs for mobile */}
      <div className="flex md:hidden px-4 pb-2">
        <Breadcrumbs />
      </div>
    </header>
  );
}
