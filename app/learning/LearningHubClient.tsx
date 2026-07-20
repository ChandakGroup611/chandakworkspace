"use client";

import React, { useState } from "react";
import { AppButton } from '@/components/ui/AppButton';
import { learningModules } from "@/lib/data/learning-data";
import ModuleRenderer from "@/components/learning/ModuleRenderer";
import { useTheme } from "@/components/theme/ThemeProvider";
import { GraduationCap, ChevronDown } from "lucide-react";

export default function LearningHubClient() {
  const { theme } = useTheme();
  const isLight = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
  
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedModule = learningModules.find(m => m.id === selectedModuleId);

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] p-6 md:p-12 relative flex flex-col items-center">
      
      {/* Hero / Selection Header */}
      <div className={`w-full max-w-3xl mx-auto text-center space-y-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-500`}>
        <div className="flex justify-center">
          <div className={`p-4 rounded-3xl bg-gradient-to-tr from-blue-100 to-indigo-100 text-accent shadow-xl shadow-blue-500/10`}>
            <GraduationCap className="h-12 w-12" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className={`text-4xl md:text-5xl font-extrabold tracking-tight text-foreground`}>
            Enterprise Learning Hub
          </h1>
          <p className={`text-lg md:text-xl max-w-2xl mx-auto text-muted-foreground`}>
            Master the core concepts of the Chandak Workspace platform. Select a module below to begin your detailed learning journey.
          </p>
        </div>

        {/* Custom Dropdown Selector */}
        <div className="relative w-full max-w-md mx-auto mt-8 z-20">
          <AppButton variant="secondary"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`w-full flex items-center justify-between px-6 h-auto py-4 rounded-2xl border-2 text-left transition-all ${
              "bg-surface border-blue-100 hover:border-accent/30 shadow-lg text-foreground"
            } ${isDropdownOpen ? ("border-accent ring-4 ring-accent/10") : ""}`}
            rightIcon={<ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`} />}
          >
            <div className="flex items-center gap-3">
              {selectedModule ? (
                <>
                  <selectedModule.icon className={`h-6 w-6 text-accent`} />
                  <span className="font-bold text-lg">{selectedModule.title}</span>
                </>
              ) : (
                <span className={`font-semibold text-lg text-muted-foreground`}>Select a Learning Module...</span>
              )}
            </div>
          </AppButton>

          {isDropdownOpen && (
            <div className={`absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 ${
              "bg-surface/90 border-border"
            }`}>
              <div className="space-y-1">
                {learningModules.map((module) => (
                  <AppButton variant="secondary"
                    key={module.id}
                    onClick={() => {
                      setSelectedModuleId(module.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-start justify-start gap-4 px-4 h-auto py-3 rounded-xl transition-all border border-transparent ${
                      selectedModuleId === module.id
                        ? ("bg-accent/10 border-accent/20 text-accent font-bold")
                        : ("hover:bg-elevated hover:border-border text-foreground")
                    }`}
                    leftIcon={
                      <div className={`p-2 rounded-lg shrink-0 ${
                        selectedModuleId === module.id 
                          ? ("bg-accent/20 text-accent")
                          : ("bg-surface border border-border text-muted-foreground")
                      }`}>
                        <module.icon className="h-5 w-5" />
                      </div>
                    }
                  >
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-semibold text-sm">{module.title}</div>
                      <div className={`text-[11px] mt-0.5 text-muted-foreground leading-snug font-normal`}>{module.description}</div>
                    </div>
                  </AppButton>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Module Content Area */}
      <div className="w-full flex-1 relative z-10">
        {selectedModule ? (
          <ModuleRenderer module={selectedModule} />
        ) : (
          <div className={`flex flex-col items-center justify-center py-20 animate-in fade-in duration-1000 text-gray-400`}>
            <div className="relative">
              <GraduationCap className="h-24 w-24 opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ChevronDown className="h-8 w-8 animate-bounce opacity-50" />
              </div>
            </div>
            <p className="mt-6 font-medium tracking-wide">Awaiting module selection...</p>
          </div>
        )}
      </div>

    </div>
  );
}
