"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Dynamic import to avoid SSR issues with React-Quill
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image', 'video'],
      ['clean']
    ]
  }), []);

  return (
    <div className={`rich-text-editor-container ${className || ''}`}>
      <style dangerouslySetInnerHTML={{__html: `
        .rich-text-editor-container .ql-container {
          font-family: var(--font-inter), sans-serif;
          font-size: 14px;
          min-height: 300px;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          background: transparent;
        }
        .rich-text-editor-container .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background: #f9fafb;
          border-color: #e5e7eb;
        }
        .theme-dark .rich-text-editor-container .ql-toolbar {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
        }
        .theme-dark .rich-text-editor-container .ql-container {
          border-color: rgba(255, 255, 255, 0.1);
          color: #e5e7eb;
        }
        .theme-dark .rich-text-editor-container .ql-stroke {
          stroke: #9ca3af;
        }
        .theme-dark .rich-text-editor-container .ql-fill {
          fill: #9ca3af;
        }
        .theme-dark .rich-text-editor-container .ql-picker {
          color: #9ca3af;
        }
      `}} />
      <ReactQuill 
        theme="snow" 
        value={value} 
        onChange={onChange} 
        modules={modules}
        placeholder={placeholder || "Write your article content here..."}
      />
    </div>
  );
}
