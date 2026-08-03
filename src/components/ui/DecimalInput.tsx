import { useEffect, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { parseDecimalInput } from "../../utils/decimalInput";
import { Input } from "./Input";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "inputMode" | "onChange" | "type" | "value"> & {
  value: number;
  onValueChange?: (value: number) => void;
};

function displayValue(value: number): string {
  return Number.isFinite(value) && value !== 0 ? String(value) : "";
}

export function DecimalInput({ value, onValueChange, readOnly = false, ...props }: Props) {
  const [inputValue, setInputValue] = useState(displayValue(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) setInputValue(displayValue(value));
  }, [isEditing, value]);

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      readOnly={readOnly}
      value={inputValue}
      onFocus={() => setIsEditing(true)}
      onBlur={() => setIsEditing(false)}
      onChange={(event) => {
        const nextValue = event.target.value;
        if (!/^-?\d*(?:\.\d*)?$/.test(nextValue)) return;
        setInputValue(nextValue);
        onValueChange?.(parseDecimalInput(nextValue));
      }}
    />
  );
}
