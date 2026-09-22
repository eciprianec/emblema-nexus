"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function Breadcrumbs() {
  const pathname = usePathname();
  
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm text-slate-500 dark:text-slate-400">
      <Link
        href="/"
        className="flex items-center transition-colors hover:text-slate-900 dark:hover:text-slate-50"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Inicio</span>
      </Link>
      
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");

        return (
          <div key={href} className="flex items-center space-x-1">
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
            {isLast ? (
              <span className="font-medium text-slate-900 dark:text-slate-100" aria-current="page">
                {title}
              </span>
            ) : (
              <Link
                href={href}
                className="transition-colors hover:text-slate-900 dark:hover:text-slate-50"
              >
                {title}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
