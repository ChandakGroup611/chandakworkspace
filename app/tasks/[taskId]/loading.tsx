import React from "react";
import { Loader2 } from "lucide-react";

export default function TaskLoading() {
  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center space-y-4">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-pulse rounded-full border-2 border-theme-btn-primary opacity-20"></div>
        <Loader2 className="h-8 w-8 animate-spin text-theme-icon" />
      </div>
      <div className="flex flex-col items-center space-y-1">
        <h3 className="text-lg font-bold text-foreground dark:text-white">Decrypting Task Data...</h3>
        <p className="text-sm text-muted dark:text-muted font-mono">Fetching operational intel</p>
      </div>
    </div>
  );
}
