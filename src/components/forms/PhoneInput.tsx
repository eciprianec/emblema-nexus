"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange?: (value: string) => void;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, onChange, value, ...props }, ref) => {
    const formatPhone = (val: string) => {
      const numbers = val.replace(/\D/g, "");
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhone(e.target.value);
      if (onChange) {
        onChange(formatted);
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder="(809) 000-0000"
        maxLength={14}
        className={cn("font-mono", className)}
      />
    );
  }
);
PhoneInput.displayName = "PhoneInput";
