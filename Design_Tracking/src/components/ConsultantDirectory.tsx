"use client";

import React, { useState, useMemo } from "react";
import { ConsultantPartner, DesignDiscipline } from "../types";
import { 
  Users, 
  Mail, 
  Phone, 
  Building, 
  Star, 
  Clock, 
  Plus, 
  Search, 
  Trash2, 
  SlidersHorizontal,
  X,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface ConsultantDirectoryProps {
  consultants: ConsultantPartner[];
  onAddConsultant?: (consultant: Omit<ConsultantPartner, "id">) => void;
  onDeleteConsultant?: (id: string) => void;
  availableProjects?: string[];
}

export const ConsultantDirectory: React.FC<ConsultantDirectoryProps> = ({
  consultants,
  onAddConsultant,
  onDeleteConsultant,
  availableProjects = ["Chandak Stella", "Chandak Highscape City", "Chandak GreenAir", "Chandak 34 Park Estate", "Chandak Sparkling Wings"]
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for New Consultant
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DesignDiscipline>("Architectural");
  const [leadContact, setLeadContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [tatDays, setTatDays] = useState("3.0");
  const [rating, setRating] = useState("4.8");
  const [formError, setFormError] = useState("");

  const disciplines: DesignDiscipline[] = [
    "Architectural", 
    "Structural", 
    "MEP", 
    "Landscape", 
    "Interior"
  ];

  const filteredConsultants = useMemo(() => {
    return consultants.filter(c => {
      if (disciplineFilter !== "ALL" && c.category !== disciplineFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          c.name.toLowerCase().includes(q) ||
          c.leadContact.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.activeProjects.some(p => p.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [consultants, disciplineFilter, searchQuery]);

  const handleToggleProject = (proj: string) => {
    setSelectedProjects(prev => 
      prev.includes(proj) ? prev.filter(p => p !== proj) : [...prev, proj]
    );
  };

  const handleCreateConsultant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Please enter the consultant firm name.");
      return;
    }
    if (!leadContact.trim()) {
      setFormError("Please enter the lead contact person.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setFormError("Please enter a valid email address.");
      return;
    }

    if (onAddConsultant) {
      onAddConsultant({
        name: name.trim(),
        category,
        leadContact: leadContact.trim(),
        email: email.trim(),
        phone: phone.trim() || "+91 22 0000 0000",
        activeProjects: selectedProjects.length > 0 ? selectedProjects : ["Chandak Stella"],
        totalDrawingsSubmitted: 0,
        averageTatDays: parseFloat(tatDays) || 3.0,
        rating: parseFloat(rating) || 5.0
      });
    }

    // Reset Form
    setName("");
    setLeadContact("");
    setEmail("");
    setPhone("");
    setSelectedProjects([]);
    setTatDays("3.0");
    setRating("4.8");
    setFormError("");
    setIsAddModalOpen(false);
  };

  const getDisciplineBadge = (cat: string) => {
    switch (cat) {
      case "Architectural": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "Structural": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "MEP": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "Landscape": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "Interior": return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      default: return "bg-slate-100 dark:bg-slate-800 text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header & Action Ribbon */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Consultant Directory
              </h2>
              <p className="text-xs text-muted-foreground">
                Empanelled architects, structural engineers, MEP consultants, and specialized partners
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 text-foreground focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Add Consultant Button */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="h-8 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Consultant</span>
            </button>
          </div>
        </div>

        {/* Filter Ribbon */}
        <div className="pt-2 border-t border-border flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 max-w-full text-xs">
          <span className="text-[11px] font-bold text-muted-foreground mr-1 shrink-0 flex items-center gap-1 whitespace-nowrap">
            <SlidersHorizontal className="h-3 w-3" />
            <span>Discipline:</span>
          </span>
          <button
            type="button"
            onClick={() => setDisciplineFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
              disciplineFilter === "ALL"
                ? "bg-purple-600 text-white shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
            }`}
          >
            All Firms ({consultants.length})
          </button>
          {disciplines.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDisciplineFilter(d)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                disciplineFilter === d
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredConsultants.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface space-y-3">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h4 className="text-sm font-bold text-foreground">No Consultants Found</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            No consultant firms match your active filter. Click &ldquo;Add Consultant&rdquo; above to register a new engineering partner.
          </p>
        </div>
      )}

      {/* Consultant Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredConsultants.map((c) => (
          <div key={c.id} className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-4 hover:border-purple-500/40 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-foreground truncate">{c.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${getDisciplineBadge(c.category)}`}>
                      {c.category}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 whitespace-nowrap">
                    <span>Lead Contact:</span>
                    <strong className="text-foreground">{c.leadContact}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20 whitespace-nowrap">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    <span>{c.rating}</span>
                  </div>

                  {onDeleteConsultant && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove consultant "${c.name}" from directory?`)) {
                          onDeleteConsultant(c.id);
                        }
                      }}
                      className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete consultant"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Contact Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <a 
                  href={`mailto:${c.email}`} 
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground truncate"
                >
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{c.email}</span>
                </a>
                <a 
                  href={`tel:${c.phone}`} 
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground whitespace-nowrap"
                >
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{c.phone}</span>
                </a>
              </div>

              {/* Performance Stats */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px] whitespace-nowrap">Submitted Drawings:</span>
                  <span className="font-mono font-bold text-foreground text-sm">{c.totalDrawingsSubmitted} Sheets</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] whitespace-nowrap">Average TAT:</span>
                  <span className="font-mono font-bold text-foreground text-sm flex items-center gap-1 whitespace-nowrap">
                    <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span>{c.averageTatDays} days</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Active Projects */}
            <div className="pt-2 border-t border-border">
              <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                Active Project Assignments:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {c.activeProjects.map((proj, idx) => (
                  <span 
                    key={idx} 
                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-foreground border border-border flex items-center gap-1 whitespace-nowrap"
                  >
                    <Building className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span>{proj}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Consultant Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>Partner Empanellment</span>
                </span>
                <h3 className="text-base font-bold text-foreground mt-0.5">
                  Register New Consultant Partner
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateConsultant} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">Consultant Firm / Company Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground font-semibold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">Discipline Category *</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as DesignDiscipline)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground font-semibold focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {disciplines.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">Lead Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={leadContact}
                    onChange={e => setLeadContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">Expected TAT (Days)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    value={tatDays}
                    onChange={e => setTatDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">Quality Rating (1 to 5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    value={rating}
                    onChange={e => setRating(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1.5">Assign Active Development Projects</label>
                <div className="flex flex-wrap gap-2 p-2.5 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 max-h-32 overflow-y-auto custom-scrollbar">
                  {availableProjects.map((proj) => {
                    const isSelected = selectedProjects.includes(proj);
                    return (
                      <button
                        key={proj}
                        type="button"
                        onClick={() => handleToggleProject(proj)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                          isSelected
                            ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                            : "bg-surface text-muted-foreground border-border hover:text-foreground"
                        }`}
                      >
                        {proj}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  Register Consultant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
