import React from 'react';
import { AppCard } from '@/components/ui/AppCard';

export default function TestPage() {
  return (
    <div className="p-10 space-y-6">
      <AppCard className="p-6">
        <h2 className="text-xl font-bold mb-4">Test Select</h2>
        <select className="w-full bg-[#0A0D14] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none">
          <option>Option 1</option>
          <option>Option 2</option>
        </select>
        
        <h2 className="text-xl font-bold mt-8 mb-4">Test Checkbox</h2>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="rounded border-gray-600 bg-gray-700 text-accent focus:ring-accent" />
          <span>Checkbox Label</span>
        </label>
      </AppCard>
    </div>
  );
}
