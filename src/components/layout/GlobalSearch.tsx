"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Users, FileText, Briefcase, FileSignature } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    []
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "relative inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 w-full md:w-64 lg:w-80 transition-colors"
        )}
      >
        <Search className="h-4 w-4" />
        <span>Buscar en el sistema...</span>
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border border-slate-200 bg-slate-100 px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar clientes, expedientes, facturas, tareas..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          <CommandGroup heading="Módulos Principales">
            <CommandItem onSelect={() => runCommand(() => router.push("/clientes"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Clientes</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/expedientes"))}>
              <Briefcase className="mr-2 h-4 w-4" />
              <span>Expedientes</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/facturas"))}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Facturas</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/tareas"))}>
              <FileSignature className="mr-2 h-4 w-4" />
              <span>Tareas</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
