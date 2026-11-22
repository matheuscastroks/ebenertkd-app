"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { applyInputMask, MASK_DEFAULTS, type InputMaskType } from "@/lib/input-masks";

export type MaskedInputProps = Omit<ComponentProps<typeof Input>, "value" | "defaultValue"> & {
  mask: InputMaskType;
  defaultValue?: string | number | null;
};

export function MaskedInput({
  mask,
  defaultValue,
  onChange,
  placeholder,
  inputMode,
  maxLength,
  ...props
}: MaskedInputProps) {
  const [rawValue, setRawValue] = useState(() => String(defaultValue ?? ""));
  const displayValue = mask === "none" ? rawValue : applyInputMask(mask, rawValue);
  const defaults = MASK_DEFAULTS[mask];

  return (
    <Input
      {...props}
      value={displayValue}
      placeholder={placeholder ?? defaults.placeholder}
      inputMode={inputMode ?? defaults.inputMode}
      maxLength={maxLength ?? defaults.maxLength}
      onChange={(event) => {
        const nextValue =
          mask === "none" ? event.target.value : applyInputMask(mask, event.target.value);
        setRawValue(nextValue);
        if (onChange) {
          event.target.value = nextValue;
          onChange(event);
        }
      }}
    />
  );
}
