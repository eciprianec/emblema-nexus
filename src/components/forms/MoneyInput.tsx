"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: number;
  onChange?: (value: number | undefined) => void;
  currency?: "DOP" | "USD";
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, value, onChange, currency = "DOP", ...props }, ref) => {
    const formatValue = (val: number | undefined) => {
      if (val === undefined || isNaN(val)) return "";
      return new Intl.NumberFormat("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);
    };

    const [displayValue, setDisplayValue] = React.useState(formatValue(value));

    React.useEffect(() => {
      setDisplayValue(formatValue(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value.replace(/[^0-9.,-]/g, "");
      // Reemplazar coma por punto para parsing interno si es necesario, 
      // pero Intl.NumberFormat usa punto o coma según el locale. 
      // Manejo simplificado:
      inputValue = inputValue.replace(/,/g, ""); // quitamos las comas de miles (simplificado)
      setDisplayValue(e.target.value);

      if (inputValue === "" || inputValue === "-") {
        onChange?.(undefined);
        return;
      }

      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        onChange?.(numValue);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (value !== undefined) {
        setDisplayValue(formatValue(value));
      }
      props.onBlur?.(e);
    };

    const prefix = currency === "DOP" ? "RD$" : "US$";

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">
          {prefix}
        </span>
        <Input
          {...props}
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn("pl-10 text-right font-mono", className)}
        />
      </div>
    );
  }
);
MoneyInput.displayName = "MoneyInput";
