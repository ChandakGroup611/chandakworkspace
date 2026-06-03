"use client";

import React from "react";
import { LearningModule } from "@/lib/data/learning-data";
import { useTheme } from "@/components/theme/ThemeProvider";
import { 
  CheckCircle2, 
  Info, 
  Terminal, 
  BookOpen, 
  ListChecks, 
  Settings2,
  ArrowRight
} from "lucide-react";

export default function ModuleRenderer({ module }: { module: LearningModule }) {
  const { theme } = useTheme();
  const isLight = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);

  if (!module) return null;

  return (
    <div className={`w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12`}>
      
      {/* 1. Where to Start (Header & Overview) */}
      <section className={`p-6 rounded-2xl border shadow-sm ${isLight ? "bg-white border-gray-200" : "bg-[#0A0D14] border-white/10"}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-xl ${isLight ? "bg-blue-50 text-blue-600" : "bg-blue-500/10 text-blue-400"}`}>
            <module.icon className="h-8 w-8" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}>
              {module.title}
            </h1>
            <p className={isLight ? "text-gray-500" : "text-gray-400"}>{module.description}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex gap-2">
            <Info className={`h-5 w-5 shrink-0 ${isLight ? "text-indigo-500" : "text-indigo-400"}`} />
            <div>
              <h3 className={`font-semibold text-sm ${isLight ? "text-gray-900" : "text-gray-200"}`}>Where to Start / Overview</h3>
              <p className={`text-sm mt-1 leading-relaxed ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                {module.startInfo.overview}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <ListChecks className={`h-5 w-5 shrink-0 ${isLight ? "text-emerald-500" : "text-emerald-400"}`} />
            <div>
              <h3 className={`font-semibold text-sm ${isLight ? "text-gray-900" : "text-gray-200"}`}>Prerequisites</h3>
              <ul className={`text-sm mt-1 space-y-1 list-disc pl-4 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                {module.startInfo.prerequisites.map((req, idx) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Field to Field Information */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Settings2 className={`h-5 w-5 ${isLight ? "text-gray-700" : "text-gray-300"}`} />
          <h2 className={`text-lg font-bold tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}>Field to Field Information</h2>
        </div>
        <div className={`rounded-2xl border overflow-hidden ${isLight ? "bg-white border-gray-200" : "bg-[#0A0D14] border-white/10"}`}>
          <table className="w-full text-left text-sm">
            <thead className={`border-b text-xs uppercase font-semibold ${isLight ? "bg-gray-50 text-gray-500" : "bg-white/5 text-gray-400 border-white/10"}`}>
              <tr>
                <th className="px-6 py-4">Field Name</th>
                <th className="px-6 py-4">Input Type</th>
                <th className="px-6 py-4">Requirement</th>
                <th className="px-6 py-4">Detailed Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {module.fields.map((field, idx) => (
                <tr key={idx} className={`transition-colors ${isLight ? "hover:bg-gray-50" : "hover:bg-white/5"}`}>
                  <td className={`px-6 py-4 font-medium whitespace-nowrap ${isLight ? "text-gray-900" : "text-white"}`}>{field.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${isLight ? "bg-gray-100 text-gray-600" : "bg-white/10 text-gray-300"}`}>
                      {field.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {field.isRequired ? (
                      <span className="text-[10px] font-bold uppercase text-rose-500 bg-rose-500/10 px-2 py-1 rounded">Required</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase text-gray-500 bg-gray-500/10 px-2 py-1 rounded">Optional</span>
                    )}
                  </td>
                  <td className={`px-6 py-4 leading-relaxed ${isLight ? "text-gray-600" : "text-gray-400"}`}>{field.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Steps Navigation */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <BookOpen className={`h-5 w-5 ${isLight ? "text-gray-700" : "text-gray-300"}`} />
          <h2 className={`text-lg font-bold tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}>Step-by-Step Navigation</h2>
        </div>
        <div className="space-y-3">
          {module.steps.map((step, idx) => (
            <div key={idx} className={`relative flex items-start gap-4 p-5 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md ${isLight ? "bg-white border-gray-200" : "bg-[#0A0D14] border-white/10"}`}>
              <div className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 font-bold text-sm ${isLight ? "bg-blue-100 text-blue-700" : "bg-blue-500/20 text-blue-400"}`}>
                {idx + 1}
              </div>
              <div>
                <h3 className={`font-bold text-base ${isLight ? "text-gray-900" : "text-white"}`}>{step.title}</h3>
                <p className={`text-sm mt-1 leading-relaxed ${isLight ? "text-gray-600" : "text-gray-400"}`}>{step.instruction}</p>
              </div>
              {idx < module.steps.length - 1 && (
                <div className="absolute left-8 top-12 bottom-0 w-px bg-gray-200 dark:bg-white/10 -ml-px h-8 hidden sm:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 4. Results & Technical Outcomes */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Terminal className={`h-5 w-5 ${isLight ? "text-gray-700" : "text-gray-300"}`} />
          <h2 className={`text-lg font-bold tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}>System Results & Technical Details</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {module.results.map((result, idx) => (
            <div key={idx} className={`p-5 rounded-2xl border flex flex-col h-full ${isLight ? "bg-gray-50 border-gray-200" : "bg-white/[0.02] border-white/10"}`}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <h3 className={`font-bold text-sm truncate ${isLight ? "text-gray-900" : "text-white"}`}>{result.action}</h3>
              </div>
              <p className={`text-sm mb-4 flex-1 ${isLight ? "text-gray-600" : "text-gray-300"}`}>
                <span className="font-semibold mr-1">Outcome:</span>
                {result.outcome}
              </p>
              <div className={`p-3 rounded-xl border text-[11px] font-mono leading-relaxed mt-auto ${isLight ? "bg-gray-800 text-gray-300 border-gray-900" : "bg-black/50 text-gray-400 border-white/5"}`}>
                <span className="text-purple-400 mr-2">$</span>
                {result.technicalDetail}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
