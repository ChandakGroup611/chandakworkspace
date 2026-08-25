/* eslint-disable */
"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface LazyQuillProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}

export function LazyQuill({ value, onChange, className, style, placeholder }: LazyQuillProps) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (content: string) => {
    setLocalValue(content);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChange(content);
    }, 500);
  };

  return (
    <ReactQuill
      theme="snow"
      value={localValue}
      onChange={handleChange}
      className={className}
      style={style}
      placeholder={placeholder}
    />
  );
}
