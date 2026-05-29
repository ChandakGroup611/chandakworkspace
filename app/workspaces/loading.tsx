import React from "react";
import { Loader2 } from "lucide-react";

export default function WorkspacesLoading() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center space-y-4">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full border-2 border-indigo-400 opacity-20"></div>
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
      <div className="flex flex-col items-center space-y-1">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Connecting to Gateway...</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">Synchronizing workspace matrix</p>
      </div>
    </div>
  );
}
