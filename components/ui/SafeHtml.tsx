"use client";

import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';

export default function SafeHtml({ html, className }: { html: string; className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={className} />;
  }

  return (
    <div 
      className={className} 
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} 
    />
  );
}
