import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export interface SavedFilter<T> {
  id: string;
  name: string;
  payload: T;
}

export function useSavedFilters<T>(storageKeyPrefix: string, currentUserId: string | null) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter<T>[]>([]);
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId) return;
    try {
      const stored = localStorage.getItem(`${storageKeyPrefix}_${currentUserId}`);
      if (stored) {
        setSavedFilters(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load saved filters:", e);
    }
  }, [currentUserId, storageKeyPrefix]);

  const saveCurrentFilter = (payload: T, onSuccess?: (filter: SavedFilter<T>) => void) => {
    const name = window.prompt("Enter a name for this saved filter:");
    if (!name || !name.trim()) return;
    
    const newFilter: SavedFilter<T> = {
      id: Math.random().toString(36).substring(7),
      name: name.trim(),
      payload
    };
    
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    setActiveSavedFilterId(newFilter.id);
    
    if (currentUserId) {
      localStorage.setItem(`${storageKeyPrefix}_${currentUserId}`, JSON.stringify(updated));
    }
    
    toast.success("Filter saved successfully!");
    if (onSuccess) onSuccess(newFilter);
  };

  const applySavedFilter = (
    filter: SavedFilter<T>, 
    onApply: (payload: T) => void,
    onReset: () => void
  ) => {
    if (activeSavedFilterId === filter.id) {
       setActiveSavedFilterId(null);
       onReset();
       return;
    }
    setActiveSavedFilterId(filter.id);
    onApply(filter.payload);
  };
  
  const deleteSavedFilter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this saved filter?")) return;
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    if (activeSavedFilterId === id) setActiveSavedFilterId(null);
    if (currentUserId) {
      localStorage.setItem(`${storageKeyPrefix}_${currentUserId}`, JSON.stringify(updated));
    }
  };

  return {
    savedFilters,
    activeSavedFilterId,
    saveCurrentFilter,
    applySavedFilter,
    deleteSavedFilter,
    setActiveSavedFilterId
  };
}
