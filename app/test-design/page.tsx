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
      <div className="flex items-center justify-between pb-4 mb-4 shrink-0 border-b border-border dark:border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-[1.2rem] font-bold text-foreground dark:text-white truncate max-w-2xl leading-tight">
            <span className="text-muted mr-2 uppercase text-sm tracking-wider">DSGN-1001</span>
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

      <div className="bg-surface dark:bg-[#050505] rounded-lg border border-border/50 dark:border-border p-4 shadow-sm mb-10">
        
        {/* MAIN ANALYSIS-STYLE CONTENT BLOCK */}
        <div className="space-y-6 animate-in fade-in duration-300 pt-2 pb-10">
          
          {/* SECTION 1 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 pb-2 border-b text-theme-icon dark:text-theme-icon border-border dark:border-border">
              <Briefcase className="h-4 w-4" /> Strategic & Business Design
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Design Category <span className="text-danger">*</span></label>
                <select className="w-full h-10 px-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white">
                  <option>Select Category</option>
                  <option>Architecture</option>
                  <option>UI / UX</option>
                  <option>Database</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Priority Level <span className="text-danger">*</span></label>
                <select className="w-full h-10 px-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white">
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Target Value</label>
                <select className="w-full h-10 px-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white">
                  <option>Customer Experience</option>
                  <option>Operational Efficiency</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="space-y-2">
                <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Executive Summary</label>
                <textarea 
                  className="w-full p-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 min-h-[100px] bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white"
                  placeholder="Provide a high-level summary of the design..."
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Key Constraints</label>
                <textarea 
                  className="w-full p-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 min-h-[100px] bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white"
                  placeholder="Outline any budget, time, or technical constraints..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Design Rationale & Notes <span className="text-danger">*</span></label>
                <textarea 
                   className="w-full p-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 min-h-[120px] bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white" 
                   placeholder="Detailed justification and extra notes..."
                />
              </div>
            </div>
          </div>

          {/* SECTION 2 */}
          <div className="space-y-4 pt-6">
            <h3 className="text-sm font-bold flex items-center gap-2 pb-2 border-b text-success dark:text-success border-border dark:border-border">
              <Server className="h-4 w-4" /> Technical Specifications
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Functional Scope <span className="text-danger">*</span></label>
                <textarea 
                  className="w-full p-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[140px] bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white"
                  placeholder="Describe the functional features and user stories..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Technical Scope <span className="text-danger">*</span></label>
                <textarea 
                  className="w-full p-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[140px] bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white"
                  placeholder="Describe APIs, database tables, and system components..."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
               <div>
                  <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Framework / Tech Stack</label>
                  <input type="text" className="w-full h-10 px-3 rounded-md border text-sm bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white" placeholder="e.g. Next.js, Postgres" />
               </div>
               <div>
                  <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Deployment Target</label>
                  <input type="text" className="w-full h-10 px-3 rounded-md border text-sm bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white" placeholder="e.g. AWS, Vercel" />
               </div>
               <div>
                  <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Integration Points</label>
                  <input type="text" className="w-full h-10 px-3 rounded-md border text-sm bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white" placeholder="e.g. Stripe, Sendgrid" />
               </div>
            </div>
          </div>

          {/* SECTION 3 */}
          <div className="space-y-4 pt-6">
            <h3 className="text-sm font-bold flex items-center gap-2 pb-2 border-b text-cyan-600 dark:text-cyan-400 border-border dark:border-border">
              <Target className="h-4 w-4" /> Planning & Resources
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Start Date</label>
                <input type="date" className="w-full h-10 px-3 rounded-md border text-sm bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white focus:ring-2 focus:ring-cyan-500/50" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Target Due Date</label>
                <input type="date" className="w-full h-10 px-3 rounded-md border text-sm bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white focus:ring-2 focus:ring-cyan-500/50" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Estimated Effort (Days)</label>
                <input type="number" className="w-full h-10 px-3 rounded-md border text-sm bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white focus:ring-2 focus:ring-cyan-500/50" placeholder="e.g. 10" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Est. Resources Needed</label>
                <input type="number" className="w-full h-10 px-3 rounded-md border text-sm bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white focus:ring-2 focus:ring-cyan-500/50" placeholder="e.g. 2" />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-bold mb-1.5 uppercase tracking-wider text-muted">Budget Impact / Hardware Costs</label>
              <textarea 
                className="w-full p-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 min-h-[80px] bg-surface dark:bg-[#0a0d14] border-border dark:border-border text-foreground dark:text-white"
                placeholder="List any software licenses, hardware, or third-party API costs expected..."
              />
            </div>
          </div>

          {/* ACTION PANEL */}
          <div className="pt-8 border-t border-border dark:border-border mt-6 flex justify-end gap-3">
             <AppButton variant="outline">Cancel</AppButton>
             <AppButton variant="secondary">Save Draft</AppButton>
             <AppButton variant="primary">Submit Design for Review</AppButton>
          </div>

        </div>
      </div>
    </PageContainer>
  );
}
