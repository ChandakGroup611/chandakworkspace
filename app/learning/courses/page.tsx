"use client";

import React, { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { GraduationCap, Book, Plus, Trash2, Save, PlayCircle, HelpCircle, GripVertical } from "lucide-react";
import { toast } from "react-toastify";

export default function LearningCourseBuilder() {
  const [courses, setCourses] = useState<any[]>([
    {
      id: "course_1",
      title: "Security & Compliance Onboarding",
      description: "Mandatory training for all new hires regarding GDPR and HIPAA.",
      modules: [
        { id: "mod_1", type: "video", title: "Introduction to Data Privacy", url: "https://example.com/video1.mp4" },
        { id: "mod_2", type: "quiz", title: "Data Privacy Quiz", questions: [
          { q: "What does GDPR stand for?", options: ["A", "B", "C"], correct: 0 }
        ]}
      ]
    }
  ]);
  
  const [editingCourse, setEditingCourse] = useState<any>(null);

  const handleCreateNew = () => {
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
        title="Learning Hub Builder"
        description="Author employee training courses, video lessons, and compliance quizzes."
        badge={<AppBadge variant="success">LMS Module</AppBadge>}
        actions={
          <AppButton variant="primary" onClick={handleCreateNew} leftIcon={<Plus className="w-4 h-4" />}>
            Create Course
          </AppButton>
        }
      />

      {editingCourse ? (
        <div className="mt-6 space-y-6 animate-in fade-in">
          <AppCard className="ring-2 ring-accent">
            <div className="p-6 border-b border-border flex justify-between items-center bg-gray-50 dark:bg-white/[0.02]">
              <h3 className="font-bold text-lg text-accent">Course Settings</h3>
              <div className="flex gap-2">
                <AppButton variant="outline" onClick={() => setEditingCourse(null)}>Cancel</AppButton>
                <AppButton variant="primary" onClick={handleSave} leftIcon={<Save className="w-4 h-4"/>}>Save Course</AppButton>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Course Title</label>
                <AppInput 
                  value={editingCourse.title} 
                  onChange={e => setEditingCourse({...editingCourse, title: e.target.value})} 
                  placeholder="e.g. Employee Code of Conduct" 
                  className="text-lg font-bold py-2 mt-1" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                <textarea 
                  className="w-full mt-1 p-3 bg-transparent border border-border rounded-lg focus:outline-none focus:border-accent text-sm min-h-[100px]"
                  placeholder="What will employees learn?"
                  value={editingCourse.description}
                  onChange={e => setEditingCourse({...editingCourse, description: e.target.value})}
                />
              </div>
            </div>
          </AppCard>

          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">Curriculum Modules</h3>
            <div className="flex gap-2">
              <AppButton variant="outline" size="sm" onClick={() => addModule('article')} leftIcon={<Book className="w-4 h-4 text-blue-500"/>}>Add Article</AppButton>
              <AppButton variant="outline" size="sm" onClick={() => addModule('video')} leftIcon={<PlayCircle className="w-4 h-4 text-purple-500"/>}>Add Video</AppButton>
              <AppButton variant="outline" size="sm" onClick={() => addModule('quiz')} leftIcon={<HelpCircle className="w-4 h-4 text-emerald-500"/>}>Add Quiz</AppButton>
            </div>
          </div>

          <div className="space-y-4">
            {editingCourse.modules.map((mod: any, index: number) => (
              <AppCard key={mod.id} className="border-l-4 overflow-hidden" style={{ borderLeftColor: mod.type === 'quiz' ? '#10b981' : mod.type === 'video' ? '#a855f7' : '#3b82f6' }}>
                <div className="p-4 bg-gray-50 dark:bg-[#0A0D14] flex items-center justify-between border-b border-border">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                    <AppBadge variant={mod.type === 'quiz' ? 'success' : mod.type === 'video' ? 'neutral' : 'info'} className="uppercase text-[10px]">
                      {mod.type}
                    </AppBadge>
                    <input 
                      type="text"
                      className="bg-transparent border-none font-bold focus:outline-none focus:ring-0 text-foreground"
                      value={mod.title}
                      onChange={e => {
                        const m = [...editingCourse.modules];
                        m[index].title = e.target.value;
                        setEditingCourse({...editingCourse, modules: m});
                      }}
                    />
                  </div>
                  <AppButton variant="secondary" onClick={() => removeModule(index)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </AppButton>
                </div>
                
                <div className="p-6">
                  {mod.type === 'video' && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Video URL (MP4, YouTube, Vimeo)</label>
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
                      <label className="text-xs font-bold text-gray-500 uppercase">Article Content</label>
                      <textarea 
                        className="w-full mt-1 p-3 bg-transparent border border-border rounded-lg focus:outline-none focus:border-blue-500 text-sm min-h-[150px]"
                        placeholder="Write lesson content here..."
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
                    <div className="text-center p-8 border-2 border-dashed border-border rounded-lg">
                      <HelpCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-gray-500 font-bold">Quiz Builder UI</p>
                      <p className="text-xs text-gray-400 mt-1">Questions will be added via modal in full implementation.</p>
                      <AppButton variant="outline" size="sm" className="mt-4 text-emerald-600 border-emerald-200">
                        Add Question
                      </AppButton>
                    </div>
                  )}
                </div>
              </AppCard>
            ))}
            
            {editingCourse.modules.length === 0 && (
              <div className="text-center p-12 border-2 border-dashed border-border rounded-2xl text-gray-500">
                <GraduationCap className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <p>This course is empty. Add modules to build your curriculum.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {courses.map(course => (
            <AppCard key={course.id} className="flex flex-col hover:border-accent transition-colors cursor-pointer" onClick={() => setEditingCourse(course)}>
              <div className="p-6 flex-1">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <GraduationCap className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-bold text-lg leading-tight mb-2">{course.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{course.description}</p>
              </div>
              <div className="p-4 border-t border-border bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400">{course.modules.length} Modules</span>
                <span className="text-xs font-bold text-accent">Edit Course &rarr;</span>
              </div>
            </AppCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
