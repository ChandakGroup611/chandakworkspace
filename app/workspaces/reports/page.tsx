import { Metadata } from "next";
import ReportsClient from "@/components/reports/ReportsClient";

export const metadata: Metadata = {
  title: "Reports & Analytics | ADIOS",
  description: "Comprehensive reporting and analytics for execution tracking.",
};

export default function ReportsPage() {
  return (
    <div className="w-full space-y-6 animate-in fade-in-50 duration-500">
      <header className="border-b border-white/5 pb-4">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-xs text-gray-400 mt-1">Generate filtered analytical reports for workspaces and tasks with export capabilities.</p>
      </header>

      <main>
        <ReportsClient />
      </main>
    </div>
  );
}
