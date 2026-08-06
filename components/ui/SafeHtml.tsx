"use client";

import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';

interface SafeHtmlProps {
  html?: string | null;
  className?: string;
  inline?: boolean;
}

export default function SafeHtml({ html, className, inline = false }: SafeHtmlProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!html) return null;

  // If it's pure plain text with no HTML tags, render directly
  const hasHtml = /<[a-z][\s\S]*>/i.test(html);
  if (!hasHtml) {
    return inline ? (
      <span className={className}>{html}</span>
    ) : (
      <div className={className}>{html}</div>
    );
  }

  // If on client, sanitize safely
  if (mounted || typeof window !== 'undefined') {
    const cleanHtml = DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true }
    });
    return inline ? (
      <span 
        className={className} 
        dangerouslySetInnerHTML={{ __html: cleanHtml }} 
      />
    ) : (
      <div 
        className={className} 
        dangerouslySetInnerHTML={{ __html: cleanHtml }} 
      />
    );
  }

  // Server-side fallback: strip HTML tags for initial paint
  const plainText = html.replace(/<[^>]*>?/gm, '');
  return inline ? (
    <span className={className}>{plainText}</span>
  ) : (
    <div className={className}>{plainText}</div>
  );
}
