"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn, validateCedula } from "@/lib/utils";

interface CedulaInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange?: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
}

export const CedulaInput = React.forwardRef<HTMLInputElement, CedulaInputProps>(
  ({ className, onChange, onValidChange, value, ...props }, ref) => {
    const formatCedula = (val: string) => {
      const numbers = val.replace(/\D/g, "");
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 10) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 10)}-${numbers.slice(10, 11)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCedula(e.target.value);
      if (onChange) {
        onChange(formatted);
      }
      if (onValidChange) {
        const raw = formatted.replace(/\D/g, "");
        onValidChange(raw.length === 11 ? validateCedula(raw) : false);
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        value={value}
        onChange={handleChange}
        placeholder="000-0000000-0"
        maxLength={13}
        className={cn("font-mono tracking-wider", className)}
      />
    );
  }
);
CedulaInput.displayName = "CedulaInput";
