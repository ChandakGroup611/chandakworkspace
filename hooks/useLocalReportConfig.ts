"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getUserReportLayout, saveUserReportLayout, resetUserReportLayout } from "@/lib/actions/user_report_layout";

export interface UIFieldDefinition {
  field_key: string;
  display_name: string;
  data_type: 'text' | 'date' | 'badge' | 'user' | 'number' | 'boolean' | 'link' | 'custom';
  is_default?: boolean;
  default_width?: number;
}

export interface UserReportLayout {
  field_id: string; // We'll just use field_key as the ID
  field_key: string;
  display_name: string;
  data_type: string;
  display_order: number;
  is_visible: boolean;
  column_width: number;
}

export function useLocalReportConfig(reportCode: string, initialUIFields: UIFieldDefinition[]) {
  const [layout, setLayout] = useState<UserReportLayout[]>([]);
  const [availableFields, setAvailableFields] = useState<UIFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchLayout = useCallback(async () => {
    setLoading(true);
    
    try {
      const saved = await getUserReportLayout(reportCode);
      fetchedRef.current = true;
      
      const existingKeys = saved ? new Set(saved.map(l => l.field_key)) : new Set();
      // Use the CURRENT initialUIFields via closure, but it only runs once per reportCode
      const newFields = initialUIFields.filter(f => !existingKeys.has(f.field_key));
      
      let mergedLayout: UserReportLayout[] = saved ? [...saved] : [];
      
      newFields.forEach((nf, idx) => {
        mergedLayout.push({
          field_id: nf.field_key,
          field_key: nf.field_key,
          display_name: nf.display_name,
          data_type: nf.data_type,
          display_order: (saved ? saved.length : 0) + idx + 1,
          is_visible: nf.is_default !== false,
          column_width: nf.default_width || 150
        });
      });

      setLayout(mergedLayout);
    } catch (e) {
      console.error("Failed to parse saved layout", e);
      generateDefaultLayout();
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportCode]);

  useEffect(() => {
    // Only run on mount or when reportCode changes
    fetchLayout();
  }, [fetchLayout]);

  useEffect(() => {
    setAvailableFields(initialUIFields);
    
    // Only update layout dynamically if we have already fetched the initial layout
    if (!fetchedRef.current) return;
    
    setLayout(prevLayout => {
      const existingKeys = new Set(prevLayout.map(l => l.field_key));
      const newFields = initialUIFields.filter(f => !existingKeys.has(f.field_key));
      
      if (newFields.length === 0) return prevLayout;
      
      const mergedLayout = [...prevLayout];
      newFields.forEach((nf, idx) => {
        mergedLayout.push({
          field_id: nf.field_key,
          field_key: nf.field_key,
          display_name: nf.display_name,
          data_type: nf.data_type,
          display_order: prevLayout.length + idx + 1,
          is_visible: nf.is_default !== false,
          column_width: nf.default_width || 150
        });
      });
      return mergedLayout;
    });
  }, [initialUIFields]);

  const generateDefaultLayout = useCallback(() => {
    const defaultLayout: UserReportLayout[] = initialUIFields.map((f, idx) => ({
      field_id: f.field_key,
      field_key: f.field_key,
      display_name: f.display_name,
      data_type: f.data_type,
      display_order: idx + 1,
      is_visible: f.is_default !== false, // default true unless explicitly false
      column_width: f.default_width || 150
    }));
    setLayout(defaultLayout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveLayout = async (newLayout: UserReportLayout[]) => {
    // Optimistic UI update
    setLayout(newLayout);
    // Background persist
    await saveUserReportLayout(reportCode, newLayout);
  };

  const resetToDefault = async () => {
    // Re-generate default layout based on current availableFields
    const defaultLayout: UserReportLayout[] = availableFields.map((f, idx) => ({
      field_id: f.field_key,
      field_key: f.field_key,
      display_name: f.display_name,
      data_type: f.data_type,
      display_order: idx + 1,
      is_visible: f.is_default !== false,
      column_width: f.default_width || 150
    }));
    setLayout(defaultLayout);
    await resetUserReportLayout(reportCode);
  };

  return {
    layout,
    availableFields,
    loading,
    error: null,
    saveLayout,
    resetToDefault,
    refreshLayout: fetchLayout
  };
}
