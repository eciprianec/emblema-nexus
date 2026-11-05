"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setActiveCompanyAction } from "../actions/billing-actions";
import { fieldClass } from "./format";

export function CompanySelect({
  companies,
  value,
  label = "Facturando para",
}: {
  companies: { id: string; name: string }[];
  value: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (companies.length < 2) return null;

  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      {label}
      <select
        className={`${fieldClass} w-56`}
        value={value}
        disabled={pending}
        onChange={(event) =>
          startTransition(async () => {
            const result = await setActiveCompanyAction(event.target.value);
            if (result.success) router.refresh();
            else toast.error(result.error);
          })
        }
      >
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
    </label>
  );
}
