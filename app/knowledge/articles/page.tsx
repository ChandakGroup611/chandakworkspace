"use client";

import React, { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import RichTextEditor from "@/components/knowledge/RichTextEditor";
import { BookOpen, Save, Eye, LayoutTemplate, Tag, Globe, Lock } from "lucide-react";
import { toast } from "react-toastify";
import DOMPurify from "dompurify";

export default function KnowledgeBaseAuthoring() {
  const [articles, setArticles] = useState<any[]>([
    { id: "1", title: "How to reset your password", category: "Account", isPublished: true, content: "<p>Go to the settings page and click reset password.</p>" }
  ]);
  
  const [activeArticle, setActiveArticle] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState(false);
  
  const handleCreateNew = () => {
    setActiveArticle({
      id: "draft_" + Date.now(),
      title: "",
      category: "General",
      content: "",
      isPublished: false,
      tags: ""
    });
    setPreviewMode(false);
  };

  const handleSave = () => {
    if (!activeArticle.title) {
      toast.error("Article title is required.");
      return;
    }
    
    // Update or Insert
    const exists = articles.find(a => a.id === activeArticle.id);
    if (exists) {
      setArticles(articles.map(a => a.id === activeArticle.id ? activeArticle : a));
    } else {
      setArticles([activeArticle, ...articles]);
    }
    
    toast.success(activeArticle.isPublished ? "Article published successfully!" : "Draft saved.");
  };

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Knowledge Base Authoring"
        description="Write, format, and publish help articles for the Self-Service Portal."
        badge={<AppBadge variant="info">Support Hub</AppBadge>}
        actions={
          <AppButton variant="primary" onClick={handleCreateNew} leftIcon={<BookOpen className="w-4 h-4" />}>
            New Article
          </AppButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6 h-[calc(100vh-200px)]">
        {/* Left Sidebar: Article List */}
        <div className="lg:col-span-1 border border-border bg-surface dark:bg-[#0B0F19] rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-gray-50 dark:bg-surface/[0.02]">
            <h3 className="font-bold text-sm">Library</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {articles.map(article => (
              <div 
                key={article.id}
                onClick={() => { setActiveArticle(article); setPreviewMode(false); }}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                  activeArticle?.id === article.id
                    ? "border-accent bg-accent/5 dark:bg-accent/10 shadow-sm" 
                    : "border-transparent hover:bg-gray-50 dark:hover:bg-surface/5"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <AppBadge variant={article.isPublished ? "success" : "warning"} className="text-[9px] px-1.5 py-0">
                    {article.isPublished ? "PUBLISHED" : "DRAFT"}
                  </AppBadge>
                  <span className="text-[10px] text-gray-400">{article.category}</span>
                </div>
                <h4 className={`text-sm font-bold truncate ${activeArticle?.id === article.id ? "text-accent" : "text-foreground"}`}>
                  {article.title || "Untitled Article"}
                </h4>
              </div>
            ))}
            {articles.length === 0 && (
              <div className="text-center p-6 text-gray-500 text-sm">
                No articles yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Area: Editor */}
        <div className="lg:col-span-3 flex flex-col h-full bg-surface dark:bg-[#0B0F19] rounded-2xl border border-border shadow-sm overflow-hidden">
          {activeArticle ? (
            <>
              {/* Editor Header */}
              <div className="p-4 border-b border-border bg-gray-50 dark:bg-surface/[0.02] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <AppButton 
                    variant={previewMode ? "outline" : "primary"} 
                    size="sm" 
                    onClick={() => setPreviewMode(false)}
                  >
                    Edit Mode
                  </AppButton>
                  <AppButton 
                    variant={previewMode ? "primary" : "outline"} 
                    size="sm" 
                    onClick={() => setPreviewMode(true)}
                  >
                    <Eye className="w-4 h-4 mr-2" /> Live Preview
                  </AppButton>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <span className="text-gray-500 font-medium">Status:</span>
                    <select 
                      className="bg-transparent border border-border rounded px-2 py-1 text-sm focus:ring-accent"
                      value={activeArticle.isPublished ? "published" : "draft"}
                      onChange={e => setActiveArticle({...activeArticle, isPublished: e.target.value === "published"})}
                    >
                      <option value="draft">Draft (Hidden)</option>
                      <option value="published">Published (Live)</option>
                    </select>
                  </label>
                  <AppButton variant="primary" onClick={handleSave} size="sm" leftIcon={<Save className="w-4 h-4" />}>
                    Save Article
                  </AppButton>
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-y-auto">
                {previewMode ? (
                  <div className="p-10 max-w-4xl mx-auto animate-in fade-in">
                    <div className="flex items-center gap-2 mb-4">
                      <AppBadge variant="info">{activeArticle.category}</AppBadge>
                      <AppBadge variant={activeArticle.isPublished ? "success" : "warning"}>
                        {activeArticle.isPublished ? <Globe className="w-3 h-3 mr-1 inline" /> : <Lock className="w-3 h-3 mr-1 inline" />}
                        {activeArticle.isPublished ? "Public" : "Internal Draft"}
                      </AppBadge>
                    </div>
                    <h1 className="text-4xl font-black mb-8 text-foreground tracking-tight">{activeArticle.title || "Untitled Article"}</h1>
                    <div className="prose prose-blue dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeArticle.content || "<p><i>Empty content</i></p>") }} />
                  </div>
                ) : (
                  <div className="p-6 space-y-6 max-w-4xl mx-auto">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Article Title</label>
                      <AppInput 
                        value={activeArticle.title} 
                        onChange={e => setActiveArticle({...activeArticle, title: e.target.value})} 
                        placeholder="e.g. Setting up VPN access" 
                        className="text-lg font-bold py-3 mt-1" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                        <select 
                          className="w-full mt-1 p-2 bg-transparent border border-border rounded-md text-sm focus:ring-accent" 
                          value={activeArticle.category} 
                          onChange={e => setActiveArticle({...activeArticle, category: e.target.value})}
                        >
                          <option>General</option>
                          <option>Account</option>
                          <option>IT Support</option>
                          <option>HR & Policies</option>
                          <option>Facilities</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                          <Tag className="w-3 h-3" /> Search Tags (Comma separated)
                        </label>
                        <AppInput 
                          value={activeArticle.tags || ""} 
                          onChange={e => setActiveArticle({...activeArticle, tags: e.target.value})} 
                          placeholder="e.g. vpn, network, access" 
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Article Content</label>
                      <div className="border border-border rounded-lg overflow-hidden bg-surface dark:bg-transparent">
                        <RichTextEditor 
                          value={activeArticle.content} 
                          onChange={content => setActiveArticle({...activeArticle, content})} 
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <LayoutTemplate className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
              <h3 className="text-lg font-bold text-foreground">No Article Selected</h3>
              <p className="text-sm mt-1">Select an article from the library or create a new one.</p>
              <AppButton variant="primary" className="mt-6" onClick={handleCreateNew}>Create New Article</AppButton>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
