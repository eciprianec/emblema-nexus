"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RncInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange?: (value: string) => void;
  onConsult?: (rnc: string) => Promise<boolean>;
}

export const RncInput = React.forwardRef<HTMLInputElement, RncInputProps>(
  ({ className, onChange, onConsult, value, ...props }, ref) => {
    const [isValid, setIsValid] = React.useState<boolean | null>(null);
    const [isConsulting, setIsConsulting] = React.useState(false);

    const formatRnc = (val: string) => {
      return val.replace(/\D/g, "").slice(0, 11);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatRnc(e.target.value);
      setIsValid(null); // Reset validation state on change
      if (onChange) {
        onChange(formatted);
      }
    };

    const handleConsult = async () => {
      if (!onConsult || !value || typeof value !== "string" || value.length < 9) return;
      setIsConsulting(true);
      try {
        const valid = await onConsult(value);
        setIsValid(valid);
      } catch (error) {
        setIsValid(false);
      } finally {
        setIsConsulting(false);
      }
    };

    return (
      <div className="flex w-full items-center space-x-2">
        <div className="relative flex-1">
          <Input
            {...props}
            ref={ref}
            value={value}
            onChange={handleChange}
            placeholder="RNC (9 u 11 dígitos)"
            maxLength={11}
            className={cn(
              "font-mono",
              isValid === true && "border-green-500 focus-visible:ring-green-500",
              isValid === false && "border-red-500 focus-visible:ring-red-500",
              className
            )}
          />
          {isValid === true && <CheckCircle2 className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />}
          {isValid === false && <XCircle className="absolute right-3 top-2.5 h-5 w-5 text-red-500" />}
        </div>
        {onConsult && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleConsult}
            disabled={!value || String(value).length < 9 || isConsulting}
          >
            <Search className="mr-2 h-4 w-4" />
            {isConsulting ? "Consultando..." : "Consultar DGII"}
          </Button>
        )}
      </div>
    );
  }
);
RncInput.displayName = "RncInput";
