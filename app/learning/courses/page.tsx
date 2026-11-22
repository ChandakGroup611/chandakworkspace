"use client";

import React, { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { GraduationCap, Book, Plus, Trash2, Save, PlayCircle, HelpCircle, GripVertical, Eye, Pencil } from "lucide-react";
import { RecordModeProvider, RecordFieldset, EditOnly, useFlashHighlight, type RecordMode } from "@/components/ui/record";
import { toast } from "react-toastify";

export default function LearningCourseBuilder() {
  const [courses, setCourses] = useState<any[]>([
    {
      id: "course_1",
      title: "Security & compliance onboarding",
      description: "Mandatory training for all new hires regarding GDPR and HIPAA.",
      modules: [
        { id: "mod_1", type: "video", title: "Introduction to data privacy", url: "https://example.com/video1.mp4" },
        { id: "mod_2", type: "quiz", title: "Data privacy quiz", questions: [
          { q: "What does GDPR stand for?", options: ["A", "B", "C"], correct: 0 }
        ]}
      ]
    }
  ]);
  
  const [editingCourse, setEditingCourse] = useState<any>(null);
  // Record standard: a course opens in the same builder, read-only first (view) or editable.
  const [courseMode, setCourseMode] = useState<RecordMode>("create");
  const [highlightId, flashHighlight] = useFlashHighlight();
  const openCourse = (course: any, mode: RecordMode) => { setEditingCourse(course); setCourseMode(mode); };

  const handleCreateNew = () => {
    setCourseMode("create");
    setEditingCourse({
      id: "course_" + Date.now(),
      title: "",
      description: "",
      modules: []
    });
  };

  const handleSave = () => {
    if (!editingCourse.title) {
      toast.error("Course title is required");
      return;
    }
    
    const exists = courses.find(c => c.id === editingCourse.id);
    if (exists) {
      setCourses(courses.map(c => c.id === editingCourse.id ? editingCourse : c));
    } else {
      setCourses([...courses, editingCourse]);
    }
    
    flashHighlight(editingCourse.id);
    setEditingCourse(null);
    toast.success("Course saved successfully!");
  };

  const addModule = (type: 'video' | 'article' | 'quiz') => {
    const newModule = {
      id: "mod_" + Date.now(),
      type,
      title: type === 'quiz' ? 'New Quiz' : 'New Lesson',
      content: "",
      url: "",
      questions: []
    };
    setEditingCourse({ ...editingCourse, modules: [...editingCourse.modules, newModule] });
  };

  const removeModule = (index: number) => {
    const m = [...editingCourse.modules];
    m.splice(index, 1);
    setEditingCourse({ ...editingCourse, modules: m });
  };

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Learning hub builder"
        badge={<AppBadge variant="success">LMS module</AppBadge>}
        actions={
          <AppButton variant="primary" onClick={handleCreateNew} leftIcon={<Plus className="w-4 h-4" />}>
            Create course
          </AppButton>
        }
      />

      {editingCourse ? (
        <RecordModeProvider mode={courseMode}>
        <div className="mt-6 space-y-6 animate-in fade-in">
          <AppCard className="ring-2 ring-ring">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface dark:bg-surface/[0.02]">
              <h3 className="font-semibold text-lg text-accent-soft-text">
                {courseMode === "create" ? "New course" : courseMode === "view" ? editingCourse.title || "Course" : "Course settings"}
              </h3>
              <div className="flex gap-2">
                {courseMode === "view" ? (
                  <>
                    <AppButton variant="outline" onClick={() => setEditingCourse(null)}>Back to courses</AppButton>
                    <AppButton variant="primary" onClick={() => setCourseMode("edit")} leftIcon={<Pencil className="w-4 h-4"/>}>Edit</AppButton>
                  </>
                ) : (
                  <>
                    <AppButton variant="outline" onClick={() => (courseMode === "edit" ? setCourseMode("view") : setEditingCourse(null))}>Cancel</AppButton>
                    <AppButton variant="primary" onClick={handleSave} leftIcon={<Save className="w-4 h-4"/>}>{courseMode === "create" ? "Create course" : "Save course"}</AppButton>
                  </>
                )}
              </div>
            </div>
            <RecordFieldset>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-muted">Course title</label>
                <AppInput 
                  value={editingCourse.title} 
                  onChange={e => setEditingCourse({...editingCourse, title: e.target.value})} 
                  placeholder="e.g. Employee code of conduct" 
                  className="text-lg font-semibold py-2 mt-1" 
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-muted">Description</label>
                <textarea 
                  className="w-full mt-1 p-3 bg-transparent border border-border rounded-lg focus:outline-none focus:border-primary text-sm min-h-[100px]"
                  placeholder="What will employees learn?"
                  value={editingCourse.description}
                  onChange={e => setEditingCourse({...editingCourse, description: e.target.value})}
                />
              </div>
            </div>
            </RecordFieldset>
          </AppCard>

          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Curriculum modules</h3>
            <EditOnly>
            <div className="flex gap-2">
              <AppButton variant="outline" size="sm" onClick={() => addModule('article')} leftIcon={<Book className="w-4 h-4 text-accent"/>}>Add article</AppButton>
              <AppButton variant="outline" size="sm" onClick={() => addModule('video')} leftIcon={<PlayCircle className="w-4 h-4 text-accent"/>}>Add video</AppButton>
              <AppButton variant="outline" size="sm" onClick={() => addModule('quiz')} leftIcon={<HelpCircle className="w-4 h-4 text-success-text"/>}>Add quiz</AppButton>
            </div>
            </EditOnly>
          </div>

          <RecordFieldset className="space-y-4">
            {editingCourse.modules.map((mod: any, index: number) => (
              <AppCard key={mod.id} className="border-l-4 overflow-hidden" style={{ borderLeftColor: mod.type === 'quiz' ? 'var(--success)' : mod.type === 'video' ? 'var(--chart-1)' : 'var(--chart-2)' }}>
                <div className="p-4 bg-surface flex items-center justify-between border-b border-border">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-5 h-5 text-muted cursor-move" />
                    <AppBadge variant={mod.type === 'quiz' ? 'success' : mod.type === 'video' ? 'neutral' : 'info'} className="text-[11px]">
                      {mod.type}
                    </AppBadge>
                    <input 
                      type="text"
                      className="bg-transparent border-none font-semibold focus:outline-none focus:ring-0 text-foreground"
                      value={mod.title}
                      onChange={e => {
                        const m = [...editingCourse.modules];
                        m[index].title = e.target.value;
                        setEditingCourse({...editingCourse, modules: m});
                      }}
                    />
                  </div>
                  <AppButton aria-label="Delete" variant="secondary" onClick={() => removeModule(index)} className="text-muted hover:text-danger-text transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </AppButton>
                </div>
                
                <div className="p-6">
                  {mod.type === 'video' && (
                    <div>
                      <label className="text-sm font-semibold text-muted">Video URL (MP4, YouTube, Vimeo)</label>
                      <AppInput 
                        value={mod.url || ""}
                        onChange={e => {
                          const m = [...editingCourse.modules];
                          m[index].url = e.target.value;
                          setEditingCourse({...editingCourse, modules: m});
                        }}
                        className="mt-1"
                        placeholder="https://"
                      />
                    </div>
                  )}
                  {mod.type === 'article' && (
                    <div>
                      <label className="text-sm font-semibold text-muted">Article content</label>
                      <textarea 
                        className="w-full mt-1 p-3 bg-transparent border border-border rounded-lg focus:outline-none focus:border-info-border text-sm min-h-[150px]"
                        placeholder="Write lesson content here…"
                        value={mod.content || ""}
                        onChange={e => {
                          const m = [...editingCourse.modules];
                          m[index].content = e.target.value;
                          setEditingCourse({...editingCourse, modules: m});
                        }}
                      />
                    </div>
                  )}
                  {mod.type === 'quiz' && (
                    <div className="text-center p-8 border border-border rounded-lg">
                      <HelpCircle className="w-8 h-8 text-success-text mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted font-semibold">Quiz builder UI</p>
                      <p className="text-xs text-muted mt-1">Questions will be added via modal in full implementation.</p>
                      <AppButton variant="outline" size="sm" className="mt-4 text-success-text border-success-border">
                        Add question
                      </AppButton>
                    </div>
                  )}
                </div>
              </AppCard>
            ))}
            
            {editingCourse.modules.length === 0 && (
              <div className="text-center p-12 border border-border rounded-lg text-muted">
                <GraduationCap className="w-12 h-12 text-muted dark:text-subtle mx-auto mb-4" />
                <p>This course is empty. Add modules to build your curriculum.</p>
              </div>
            )}
          </RecordFieldset>
        </div>
        </RecordModeProvider>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {courses.map(course => (
            <AppCard key={course.id} data-record-id={course.id} data-highlight={highlightId === course.id || undefined} className="flex flex-col hover:border-primary transition-colors cursor-pointer" onClick={() => openCourse(course, "view")}>
              <div className="p-6 flex-1">
                <div className="w-10 h-10 rounded-lg bg-accent-soft flex items-center justify-center mb-4">
                  <GraduationCap className="w-5 h-5 text-accent-soft-text" />
                </div>
                <h3 className="font-semibold text-lg leading-tight mb-2">{course.title}</h3>
                <p className="text-sm text-muted line-clamp-2">{course.description}</p>
              </div>
              <div className="p-4 border-t border-border bg-surface dark:bg-surface/[0.02] flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">{course.modules.length} Modules</span>
                <span className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <AppButton aria-label={`View ${course.title}`} title="View" size="icon-sm" variant="ghost" className="text-muted hover:text-foreground" onClick={() => openCourse(course, "view")}>
                    <Eye className="w-4 h-4" />
                  </AppButton>
                  <AppButton aria-label={`Edit ${course.title}`} title="Edit" size="icon-sm" variant="ghost" className="text-muted hover:text-foreground" onClick={() => openCourse(course, "edit")}>
                    <Pencil className="w-4 h-4" />
                  </AppButton>
                </span>
              </div>
            </AppCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
