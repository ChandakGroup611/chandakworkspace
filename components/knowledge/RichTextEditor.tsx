"use client";

import React from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  return (
    <div className={`rich-text-editor-container ${className || ''}`}>
      <textarea
        className="w-full min-h-[300px] p-4 text-sm font-inter bg-transparent border border-border dark:border-white/10 rounded-lg text-foreground dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 focus:border-theme-btn-primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Write your article content here..."}
      />
    </div>
  );
}
