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
        className="w-full min-h-[300px] p-4 text-sm font-inter bg-transparent border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Write your article content here..."}
      />
    </div>
  );
}
