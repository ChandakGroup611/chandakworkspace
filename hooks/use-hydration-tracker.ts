'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { useEffect, useState } from 'react';

class HydrationTrackerStore {
  public fcp: number = 0;
  public ttqb: number = 0;
  public lcp: number = 0;
  public hydrationMismatch: boolean = false;
  
  private isProduction = process.env.NODE_ENV === 'production';

  public logMetric(name: string, value: number) {
    if (name === 'FCP') this.fcp = value;
    if (name === 'LCP') this.lcp = value;
    if (name === 'TTFB') this.ttqb = value;
  }
}

export const hydrationStore = new HydrationTrackerStore();

export function useHydrationTracker() {
  const [mounted, setMounted] = useState(false);

  useReportWebVitals((metric) => {
    hydrationStore.logMetric(metric.name, metric.value);
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hydration mismatch detection (rudimentary)
  // If the server renders something and client tries to patch it, React throws errors to console.
  // We can't catch them all easily without a global error handler, but we can track if mounted.
  return { mounted };
}

export function HydrationTrackerProvider() {
  useHydrationTracker();
  return null;
}
