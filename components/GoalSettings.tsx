'use client';

import { useState } from 'react';
import type { Goal } from '@/types';

interface GoalSettingsProps {
  goal: Goal;
  onSave: (settings: {
    startDate?: string;
    finishDate?: string;
  }) => Promise<void>;
  onClose: () => void;
}

export default function GoalSettings({ goal, onSave, onClose }: GoalSettingsProps) {
  const [startDate, setStartDate] = useState(goal.startDate || '');
  const [finishDate, setFinishDate] = useState(goal.finishDate || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave({
        startDate: startDate || undefined,
        finishDate: finishDate || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-300" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-300 border border-white/30">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-theme-muted hover:text-theme-card transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 className="text-xl sm:text-2xl font-bold text-theme-card mb-6">{goal.name} Settings</h2>

          {/* Start Date */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-theme-card mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-card input-theme"
            />
          </div>

          {/* Finish Date */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-theme-card mb-2">
              Finish Date
            </label>
            <input
              type="date"
              value={finishDate}
              onChange={(e) => setFinishDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-card input-theme"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-full transition-all"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-theme-card font-semibold py-3 px-6 rounded-full transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
