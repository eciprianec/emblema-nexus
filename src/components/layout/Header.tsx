import * as React from "react";
import { GlobalSearch } from "./GlobalSearch";
import { QuickCreate } from "./QuickCreate";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { CompanySwitcher } from "./CompanySwitcher";
import { Breadcrumbs } from "./Breadcrumbs";
import { cn } from "@/lib/utils";

export interface HeaderProps {
  className?: string;
  /** Las empresas del usuario, de sus membresías. */
  companies?: { id: string; name: string }[];
  activeCompanyId?: string | null;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export function Header({ className, companies = [], activeCompanyId = null }: HeaderProps) {
  return (
    <header className={cn("sticky top-0 z-50 w-full min-w-0 border-b print:hidden border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-950/95 dark:supports-[backdrop-filter]:bg-slate-950/60", className)}>
      {/* min-w-0 en cada grupo: si no, su contenido ensancha la cabecera y desplaza toda la página. */}
      <div className="flex h-16 w-full min-w-0 items-center justify-between gap-4 px-4 md:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <CompanySwitcher companies={companies} activeCompanyId={activeCompanyId} />
          <div className="hidden min-w-0 overflow-hidden md:flex">
            <Breadcrumbs />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <div className="hidden w-full min-w-0 max-w-sm flex-1 md:block">
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
