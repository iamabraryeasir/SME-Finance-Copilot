"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import type * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    "value" | "defaultValue" | "onValueChange"
  > {
  value?: number | number[];
  defaultValue?: number | number[];
  onValueChange?: (value: number) => void;
  className?: string;
}

function Slider({
  className,
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  disabled,
  ...props
}: SliderProps) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "number"
      ? [value]
      : Array.isArray(defaultValue)
        ? defaultValue
        : [defaultValue ?? min];

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      value={value}
      defaultValue={defaultValue}
      min={min}
      max={max}
      step={step}
      onValueChange={(val) => {
        if (typeof val === "number") {
          onValueChange?.(val);
        } else if (Array.isArray(val) && val.length > 0) {
          onValueChange?.(val[0]);
        }
      }}
      disabled={disabled}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Control
        data-slot="slider-control"
        className="relative flex w-full items-center py-2 cursor-pointer disabled:cursor-not-allowed group"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted border border-border/40"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-indicator"
            className="h-full bg-primary"
          />
        </SliderPrimitive.Track>
        {values.map((val, index) => (
          <SliderPrimitive.Thumb
            key={`thumb-${index}-${val}`}
            index={index}
            data-slot="slider-thumb"
            className="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-xs transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
export type { SliderProps };
