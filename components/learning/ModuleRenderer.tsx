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
import { Clock, PlayCircle, FileText, Lock, ListTodo, Presentation, Play } from "lucide-react";
import { AppTableContainer, AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";

export default function ModuleRenderer({ module }: { module: LearningModule }) {
  const { theme } = useTheme();
  const isLight = ["light-neumorphic", "glassmorphism", "pure-white"].includes(theme);

  if (!module) return null;

  return (
    <div className={`w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12`}>
      
      {/* 1. Where to Start (Header & Overview) */}
      <section className={`p-6 rounded-2xl shadow-sm theme-card-structural`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-xl bg-accent/10 text-accent`}>
            <module.icon className="h-8 w-8" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold tracking-tight text-foreground`}>
              {module.title}
            </h1>
            <p className={"text-muted"}>{module.description}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex gap-2">
            <Info className={`h-5 w-5 shrink-0 text-accent`} />
            <div>
              <h3 className={`font-semibold text-sm text-foreground`}>Where to Start / Overview</h3>
              <p className={`text-sm mt-1 leading-relaxed text-muted`}>
                {module.startInfo.overview}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <ArrowRight className={`h-5 w-5 shrink-0 text-blue-500`} />
            <div>
              <h3 className={`font-semibold text-sm text-foreground`}>Navigation Flow</h3>
              <p className={`text-sm mt-1 leading-relaxed text-muted font-mono font-semibold`}>
                {module.startInfo.navigation}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <ListChecks className={`h-5 w-5 shrink-0 text-emerald-500`} />
            <div>
              <h3 className={`font-semibold text-sm text-foreground`}>Prerequisites</h3>
              <ul className={`text-sm mt-1 space-y-1 list-disc pl-4 text-muted`}>
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
          <Settings2 className={`h-5 w-5 text-muted`} />
          <h2 className={`text-lg font-bold tracking-tight text-foreground`}>Field to Field Information</h2>
        </div>
        <div className={`rounded-2xl overflow-hidden theme-card-structural`}>
          <AppTableContainer><AppTable className="w-full text-left text-base">
            <AppTableHeader className={`border-b text-xs uppercase font-semibold bg-elevated text-muted`}>
              <AppTableRow>
                <AppTableHead className="px-6 py-4">Field Name</AppTableHead>
                <AppTableHead className="px-6 py-4">Input Type</AppTableHead>
                <AppTableHead className="px-6 py-4">Requirement</AppTableHead>
                <AppTableHead className="px-6 py-4">Detailed Description</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody className="divide-y divide-gray-200 dark:divide-white/5">
              {module.fields.map((field, idx) => (
                <AppTableRow key={idx} className={`transition-colors hover:bg-elevated`}>
                  <AppTableCell className={`px-6 py-4 font-medium whitespace-nowrap text-foreground`}>{field.name}</AppTableCell>
                  <AppTableCell className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-mono font-bold bg-elevated text-muted`}>
                      {field.type}
                    </span>
                  </AppTableCell>
                  <AppTableCell className="px-6 py-4">
                    {field.isRequired ? (
                      <span className="text-[10px] font-bold uppercase text-rose-500 bg-rose-500/10 px-2 py-1 rounded">Required</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase text-gray-500 bg-gray-500/10 px-2 py-1 rounded">Optional</span>
                    )}
                  </AppTableCell>
                  <AppTableCell className={`px-6 py-4 leading-relaxed text-muted`}>{field.description}</AppTableCell>
                </AppTableRow>
              ))}
            </AppTableBody>
          </AppTable></AppTableContainer>
        </div>
      </section>

      {/* 3. Steps Navigation */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <BookOpen className={`h-5 w-5 text-muted`} />
          <h2 className={`text-lg font-bold tracking-tight text-foreground`}>Step-by-Step Navigation</h2>
        </div>
        <div className="space-y-3">
          {module.steps.map((step, idx) => (
            <div key={idx} className={`relative flex items-start gap-4 p-5 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-md theme-card-structural`}>
              <div className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 font-bold text-sm bg-accent/10 text-accent`}>
                {idx + 1}
              </div>
              <div>
                <h3 className={`font-bold text-base text-foreground`}>{step.title}</h3>
                <p className={`text-sm mt-1 leading-relaxed text-muted`}>{step.instruction}</p>
              </div>
              {idx < module.steps.length - 1 && (
                <div className="absolute left-8 top-12 bottom-0 w-px bg-gray-200 dark:bg-surface/10 -ml-px h-8 hidden sm:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 4. Results & Technical Outcomes */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Terminal className={`h-5 w-5 text-muted`} />
          <h2 className={`text-lg font-bold tracking-tight text-foreground`}>System Results & Technical Details</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {module.results.map((result, idx) => (
            <div key={idx} className={`p-5 rounded-2xl border flex flex-col h-full bg-elevated border-border`}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <h3 className={`font-bold text-sm truncate text-foreground`}>{result.action}</h3>
              </div>
              <p className={`text-sm mb-4 flex-1 text-muted`}>
                <span className="font-semibold mr-1">Outcome:</span>
                {result.outcome}
              </p>
              <div className={`p-3 rounded-xl border text-[11px] font-mono leading-relaxed mt-auto bg-gray-800 text-gray-300 border-gray-900`}>
                <span className="text-accent mr-2">$</span>
                {result.technicalDetail}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

