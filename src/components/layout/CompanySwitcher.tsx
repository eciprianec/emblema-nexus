"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
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
import { setActiveCompanyAction } from "@/features/billing/actions/billing-actions";

/** Muestra y cambia la misma empresa activa con la que se factura. */
export function CompanySwitcher({
  companies,
  activeCompanyId,
}: {
  companies: { id: string; name: string }[];
  activeCompanyId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const handleSelect = (companyId: string) => {
    setOpen(false);
    if (companyId === activeCompanyId) return;
    startTransition(async () => {
      const result = await setActiveCompanyAction(companyId);
      if (result.success) router.refresh();
      else toast.error(result.error);
    });
  };

  const selectedCompany = companies.find((c) => c.id === activeCompanyId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={pending || companies.length === 0}
          className="w-[280px] min-w-0 shrink justify-between border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
              {selectedCompany?.name ?? "Sin empresa asignada"}
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
                  key={company.id}
                  value={company.name}
                  onSelect={() => handleSelect(company.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      activeCompanyId === company.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {company.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
