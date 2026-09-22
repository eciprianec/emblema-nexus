"use client";

import * as React from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const companies = [
  {
    value: "emblema-principal",
    label: "Emblema Nexus / Oficina Principal",
  },
  {
    value: "emblema-norte",
    label: "Emblema Nexus / Zona Norte",
  },
  {
    value: "emblema-este",
    label: "Emblema Nexus / Zona Este",
  },
];

export function CompanySwitcher() {
  const [open, setOpen] = React.useState(false);
  const [activeCompany, setActiveCompany] = React.useState(companies[0].value);

  React.useEffect(() => {
    const saved = localStorage.getItem("activeCompany");
    if (saved) {
      setActiveCompany(saved);
    }
  }, []);

  const handleSelect = (currentValue: string) => {
    setActiveCompany(currentValue);
    localStorage.setItem("activeCompany", currentValue);
    setOpen(false);
    // Idealmente recargar o limpiar contexto de datos
    // window.location.reload();
  };

  const selectedCompany = companies.find((c) => c.value === activeCompany);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 text-slate-500" />
            <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
              {selectedCompany?.label || "Seleccionar empresa..."}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Buscar empresa..." />
          <CommandList>
            <CommandEmpty>No se encontró la empresa.</CommandEmpty>
            <CommandGroup>
              {companies.map((company) => (
                <CommandItem
                  key={company.value}
                  value={company.value}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      activeCompany === company.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {company.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
