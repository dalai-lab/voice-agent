"use client";

import { useEffect, useRef, useState } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Split value into array of characters
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const rawVal = e.target.value;
    if (!rawVal) return;

    // Filter to alphanumeric and uppercase
    const char = rawVal.replace(/[^a-zA-Z0-9]/g, "").slice(-1).toUpperCase();
    if (!char) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    const nextVal = newDigits.join("");
    onChange(nextVal);

    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }

    if (nextVal.length === length && onComplete) {
      onComplete(nextVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newDigits = [...digits];

      if (digits[index]) {
        // Clear current
        newDigits[index] = "";
        onChange(newDigits.join(""));
      } else if (index > 0) {
        // Move back and clear previous
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain").trim();
    const cleaned = pasted.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, length);
    if (!cleaned) return;

    onChange(cleaned);

    const focusTarget = Math.min(cleaned.length, length - 1);
    inputRefs.current[focusTarget]?.focus();
    setFocusedIndex(focusTarget);

    if (cleaned.length === length && onComplete) {
      onComplete(cleaned);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-2.5">
      {Array.from({ length }, (_, i) => {
        const isCurrentFocused = focusedIndex === i;
        const hasValue = !!digits[i];

        return (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="text"
            pattern="[a-zA-Z0-9]*"
            maxLength={1}
            value={digits[i]}
            disabled={disabled}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            onFocus={() => setFocusedIndex(i)}
            className={`h-12 w-10 sm:h-13 sm:w-11 rounded-lg text-center text-lg font-mono font-semibold tracking-wider transition-all outline-hidden
              ${
                isCurrentFocused
                  ? "border-orange-500 ring-2 ring-orange-500/30 bg-background shadow-xs"
                  : hasValue
                  ? "border-border bg-background/80 text-foreground"
                  : "border-border/80 bg-background/40 text-muted-foreground"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text hover:border-border"}
              border
            `}
          />
        );
      })}
    </div>
  );
}
