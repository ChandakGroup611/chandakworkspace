"use client";

import React, { useState } from "react";
import { learningModules } from "@/lib/data/learning-data";
import ModuleRenderer from "@/components/learning/ModuleRenderer";
import { useTheme } from "@/components/theme/ThemeProvider";
import { GraduationCap, ChevronDown } from "lucide-react";

export default function LearningHubClient() {
  const { theme } = useTheme();
  const isLight = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);
  
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedModule = learningModules.find(m => m.id === selectedModuleId);

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] p-6 md:p-12 relative flex flex-col items-center">
      
      {/* Hero / Selection Header */}
      <div className={`w-full max-w-3xl mx-auto text-center space-y-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-500`}>
        <div className="flex justify-center">
          <div className={`p-4 rounded-3xl ${isLight ? "bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-600 shadow-xl shadow-blue-500/10" : "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-500/20"}`}>
            <GraduationCap className="h-12 w-12" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className={`text-4xl md:text-5xl font-extrabold tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}>
            Enterprise Learning Hub
          </h1>
          <p className={`text-lg md:text-xl max-w-2xl mx-auto ${isLight ? "text-gray-600" : "text-gray-400"}`}>
            Master the core concepts of the ADIOS platform. Select a module below to begin your detailed learning journey.
          </p>
        </div>

        {/* Custom Dropdown Selector */}
        <div className="relative w-full max-w-md mx-auto mt-8 z-20">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border-2 text-left transition-all ${
              isLight 
                ? "bg-white border-blue-100 hover:border-blue-300 shadow-lg text-gray-900" 
                : "bg-[#0A0D14] border-white/10 hover:border-blue-500/50 shadow-2xl text-white"
            } ${isDropdownOpen ? (isLight ? "border-blue-500 ring-4 ring-blue-500/10" : "border-blue-500 ring-4 ring-blue-500/20") : ""}`}
          >
            <div className="flex items-center gap-3">
              {selectedModule ? (
                <>
                  <selectedModule.icon className={`h-6 w-6 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
                  <span className="font-bold text-lg">{selectedModule.title}</span>
                </>
              ) : (
                <span className={`font-semibold text-lg ${isLight ? "text-gray-400" : "text-gray-500"}`}>Select a Learning Module...</span>
              )}
            </div>
            <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isDropdownOpen && (
            <div className={`absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 ${
              isLight ? "bg-white/90 border-gray-200" : "bg-[#0A0D14]/90 border-white/10"
            }`}>
              <div className="space-y-1">
                {learningModules.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => {
                      setSelectedModuleId(module.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                      selectedModuleId === module.id
                        ? (isLight ? "bg-blue-50 text-blue-700 font-bold" : "bg-blue-500/20 text-blue-400 font-bold")
                        : (isLight ? "hover:bg-gray-100 text-gray-700" : "hover:bg-white/5 text-gray-300")
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      selectedModuleId === module.id 
                        ? (isLight ? "bg-blue-100 text-blue-700" : "bg-blue-500/30 text-blue-400")
                        : (isLight ? "bg-gray-100 text-gray-500" : "bg-white/5 text-gray-400")
                    }`}>
                      <module.icon className="h-5 w-5" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold">{module.title}</div>
                      <div className={`text-[11px] truncate mt-0.5 ${isLight ? "text-gray-500" : "text-gray-500"}`}>{module.description}</div>
                    </div>
                  </button>
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
          <div className={`flex flex-col items-center justify-center py-20 animate-in fade-in duration-1000 ${isLight ? "text-gray-400" : "text-gray-600"}`}>
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
