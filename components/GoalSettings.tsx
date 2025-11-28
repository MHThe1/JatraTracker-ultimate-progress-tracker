'use client';

import { useState } from 'react';
import type { Goal } from '@/types';

interface GoalSettingsProps {
  goal: Goal;
  onSave: (settings: {
    startDate?: string;
    finishDate?: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export default function GoalSettings({ goal, onSave, onDelete, onClose }: GoalSettingsProps) {
  const [startDate, setStartDate] = useState(goal.startDate || '');
  const [finishDate, setFinishDate] = useState(goal.finishDate || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleDelete = async () => {
    if (!onDelete) return;
    
    try {
      setDeleting(true);
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Failed to delete goal');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-300" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass relative rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-300 border border-white/30">
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
              className="w-full max-w-full min-w-0 px-4 py-2 rounded-xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-card input-theme box-border"
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
              className="w-full max-w-full min-w-0 px-4 py-2 rounded-xl border border-white/30 bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-theme-card input-theme box-border"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
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
            
            {onDelete && (
              <>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-full transition-all"
                  >
                    Delete Goal
                  </button>
                ) : (
                  <div className="flex flex-col gap-3 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                    <p className="text-theme-card text-sm font-semibold text-center">
                      Are you sure you want to delete this goal? This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-full transition-all"
                      >
                        {deleting ? 'Deleting...' : 'Yes, Delete'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deleting}
                        className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-theme-card font-semibold py-2 px-4 rounded-full transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
