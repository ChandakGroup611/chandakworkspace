"use client";

import { useState, useEffect, useCallback } from "react";

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

  const fetchLayout = useCallback(() => {
    setLoading(true);
    setAvailableFields(initialUIFields);

    const storageKey = `report_layout_${reportCode}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsedLayout: UserReportLayout[] = JSON.parse(saved);
        
        // Ensure any new fields not in saved layout are added to the end
        const existingKeys = new Set(parsedLayout.map(l => l.field_key));
        const newFields = initialUIFields.filter(f => !existingKeys.has(f.field_key));
        
        const mergedLayout = [...parsedLayout];
        newFields.forEach((nf, idx) => {
          mergedLayout.push({
            field_id: nf.field_key,
            field_key: nf.field_key,
            display_name: nf.display_name,
            data_type: nf.data_type,
            display_order: parsedLayout.length + idx + 1,
            is_visible: false, // New fields are hidden by default
            column_width: nf.default_width || 150
          });
        });

        setLayout(mergedLayout);
      } catch (e) {
        console.error("Failed to parse saved layout, resetting to default", e);
        generateDefaultLayout();
      }
    } else {
      generateDefaultLayout();
    }
    
    setLoading(false);
  }, [reportCode, initialUIFields]);

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
  }, [initialUIFields]);

  useEffect(() => {
    // We only want to run this in the browser, so we wait for mount
    fetchLayout();
  }, [fetchLayout]);

  const saveLayout = async (newLayout: UserReportLayout[]) => {
    const storageKey = `report_layout_${reportCode}`;
    localStorage.setItem(storageKey, JSON.stringify(newLayout));
    setLayout(newLayout);
  };

  const resetToDefault = async () => {
    const storageKey = `report_layout_${reportCode}`;
    localStorage.removeItem(storageKey);
    generateDefaultLayout();
  };

  return {
    layout,
    availableFields, // Using UIFieldDefinition as the Available Field
    loading,
    error: null,
    saveLayout,
    resetToDefault,
    refreshLayout: fetchLayout
  };
}
