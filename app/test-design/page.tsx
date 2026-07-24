"use client";

import React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Briefcase, Server, CheckCircle, Target, ArrowLeft } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";

export default function LargeDesignMockupPage() {
  // Using true to mimic light mode for the standard generic styling
  const isLightMode = true; 

  return (
    <PageContainer strict={false} className="px-4 pb-4 pt-2">
      {/* HEADER ROW */}
      <div className="flex items-center justify-between pb-4 mb-4 shrink-0 border-b border-gray-200 dark:border-white/5">
        <div className="flex items-center gap-3">
          <h1 className="text-[1.2rem] font-bold text-gray-900 dark:text-white truncate max-w-2xl leading-tight">
            <span className="text-gray-500 mr-2 uppercase text-sm tracking-wider">DSGN-1001</span>
            Sample Large Design Mockup
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <AppButton variant="outline" size="sm" leftIcon={<ArrowLeft className="h-3.5 w-3.5"/>}>
            Back
          </AppButton>
          <AppButton variant="primary" size="sm" leftIcon={<CheckCircle className="h-4 w-4"/>}>
            Submit Design
          </AppButton>
        </div>
      </div>

      <div className="bg-surface dark:bg-[#050505] rounded-lg border border-gray-100 dark:border-white/5 p-4 shadow-sm mb-10">
        
        {/* MAIN ANALYSIS-STYLE CONTENT BLOCK */}
        <div className="space-y-6 animate-in fade-in duration-300 pt-2 pb-10">
          
          {/* SECTION 1 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 pb-2 border-b text-accent dark:text-accent border-gray-200 dark:border-white/10">
              <Briefcase className="h-4 w-4" /> Strategic & Business Design
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Design Category <span className="text-red-500">*</span></label>
                <select className="w-full h-10 px-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
                  <option>Select Category</option>
                  <option>Architecture</option>
                  <option>UI / UX</option>
                  <option>Database</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Priority Level <span className="text-red-500">*</span></label>
                <select className="w-full h-10 px-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Target Value</label>
                <select className="w-full h-10 px-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
                  <option>Customer Experience</option>
                  <option>Operational Efficiency</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="space-y-2">
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Executive Summary</label>
                <textarea 
                  className="w-full p-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[100px] bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                  placeholder="Provide a high-level summary of the design..."
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Key Constraints</label>
                <textarea 
                  className="w-full p-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[100px] bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                  placeholder="Outline any budget, time, or technical constraints..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Design Rationale & Notes <span className="text-red-500">*</span></label>
                <textarea 
                   className="w-full p-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[120px] bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white" 
                   placeholder="Detailed justification and extra notes..."
                />
              </div>
            </div>
          </div>

          {/* SECTION 2 */}
          <div className="space-y-4 pt-6">
            <h3 className="text-sm font-bold flex items-center gap-2 pb-2 border-b text-emerald-500 dark:text-emerald-400 border-gray-200 dark:border-white/10">
              <Server className="h-4 w-4" /> Technical Specifications
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Functional Scope <span className="text-red-500">*</span></label>
                <textarea 
                  className="w-full p-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[140px] bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                  placeholder="Describe the functional features and user stories..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Technical Scope <span className="text-red-500">*</span></label>
                <textarea 
                  className="w-full p-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[140px] bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                  placeholder="Describe APIs, database tables, and system components..."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
               <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Framework / Tech Stack</label>
                  <input type="text" className="w-full h-10 px-3 rounded-md border text-sm bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white" placeholder="e.g. Next.js, Postgres" />
               </div>
               <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Deployment Target</label>
                  <input type="text" className="w-full h-10 px-3 rounded-md border text-sm bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white" placeholder="e.g. AWS, Vercel" />
               </div>
               <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Integration Points</label>
                  <input type="text" className="w-full h-10 px-3 rounded-md border text-sm bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white" placeholder="e.g. Stripe, Sendgrid" />
               </div>
            </div>
          </div>

          {/* SECTION 3 */}
          <div className="space-y-4 pt-6">
            <h3 className="text-sm font-bold flex items-center gap-2 pb-2 border-b text-cyan-600 dark:text-cyan-400 border-gray-200 dark:border-white/10">
              <Target className="h-4 w-4" /> Planning & Resources
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Start Date</label>
                <input type="date" className="w-full h-10 px-3 rounded-md border text-sm bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500/50" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Target Due Date</label>
                <input type="date" className="w-full h-10 px-3 rounded-md border text-sm bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500/50" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Estimated Effort (Days)</label>
                <input type="number" className="w-full h-10 px-3 rounded-md border text-sm bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500/50" placeholder="e.g. 10" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Est. Resources Needed</label>
                <input type="number" className="w-full h-10 px-3 rounded-md border text-sm bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500/50" placeholder="e.g. 2" />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500">Budget Impact / Hardware Costs</label>
              <textarea 
                className="w-full p-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 min-h-[80px] bg-surface dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                placeholder="List any software licenses, hardware, or third-party API costs expected..."
              />
            </div>
          </div>

          {/* ACTION PANEL */}
          <div className="pt-8 border-t border-gray-200 dark:border-white/10 mt-6 flex justify-end gap-3">
             <AppButton variant="outline">Cancel</AppButton>
             <AppButton variant="secondary">Save Draft</AppButton>
             <AppButton variant="primary">Submit Design for Review</AppButton>
          </div>

        </div>
      </div>
    </PageContainer>
  );
}
