"use client";

import { useState, useEffect } from "react";

/**
 * Enterprise standard debounce hook for preventing instant API firing.
 * Recommended thresholds:
 * - global search -> 300ms
 * - mentions -> 250ms
 * - filters -> 300ms
 * - live search -> 400ms
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
